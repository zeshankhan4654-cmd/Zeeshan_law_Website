import { Router } from "express";
import { asyncHandler } from "../lib/async-handler.js";
import {
  chamberById,
  listChambers,
  pendingCount,
  platformTotals,
  recentPlatformActions,
  recordPlatformAction,
  submissionQueue,
} from "../lib/platform-stats.js";
import { assertChamberMayShare, isSharedKind, type SharedKind } from "../lib/shared-library.js";
import { prisma } from "../lib/prisma.js";
import {
  platformActor,
  requireNoPendingPasswordChange,
  requirePlatformAdmin,
  requireStaff,
} from "../middleware/auth.js";
import { ApiError } from "../middleware/errorHandler.js";
import { validate, validateQuery } from "../middleware/validate.js";
import {
  chamberListSchema,
  moderateSchema,
  suspendSchema,
  verifySchema,
  type ChamberListQuery,
} from "../validation/platform.schema.js";

/**
 * The platform console.
 *
 * What running a platform actually requires: knowing which chambers exist,
 * how big they are, which are dormant, and being able to verify or suspend
 * one. Nothing here reaches inside a chamber.
 *
 * That is not a matter of these routes choosing to return less than they
 * could. Every read goes through lib/platform-stats.ts, which returns
 * counts, dates and chamber metadata and has no path to a row of chamber
 * work. And there is no route on the platform — here or anywhere — that
 * takes a chamber id and returns its records: a platform admin signed into
 * the office reaches their own chamber and no other, exactly like everybody
 * else, because the scoped client comes from their own session.
 *
 * Deleting a chamber is deliberately absent. It would erase an advocate's
 * entire practice on a cascade, with no undo and nothing exported first.
 * Suspension stops the harm a deletion would be reached for, and leaves the
 * work intact. A real deletion needs an export beside it, and that is its
 * own piece of work.
 */
export const platformRouter = Router();

platformRouter.use(requireStaff, requireNoPendingPasswordChange, requirePlatformAdmin);

function parseId(raw: string | undefined): number {
  const id = Number(raw);
  if (!Number.isInteger(id) || id < 1) throw new ApiError(400, "Not a valid id.");
  return id;
}

/** Everything the console's first screen needs. */
platformRouter.get(
  "/overview",
  validateQuery(chamberListSchema),
  asyncHandler(async (_req, res) => {
    const query = res.locals.query as ChamberListQuery;
    const [totals, chambers, actions, waiting] = await Promise.all([
      platformTotals(),
      listChambers(query),
      recentPlatformActions(20),
      pendingCount(),
    ]);

    res.json({
      totals: { ...totals, pending: waiting },
      ...chambers,
      actions,
      limit: query.limit,
      offset: query.offset,
    });
  })
);

/** One chamber, with what has been done to it. */
platformRouter.get(
  "/chambers/:id",
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);

    const chamber = await chamberById(id);
    if (!chamber) throw new ApiError(404, "No such chamber.");

    res.json({ chamber, actions: await recentPlatformActions(50, id) });
  })
);

/**
 * Marking a chamber verified, or taking it back.
 *
 * Verification is a statement that somebody checked this is really an
 * advocate. It restricts nothing about the chamber's own private work —
 * that work is the product, and gating it on a manual check would mean
 * nobody could start on the day they registered.
 */
platformRouter.patch(
  "/chambers/:id/verified",
  validate(verifySchema),
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    const { verified, note } = req.body as { verified: boolean; note: string };

    const firm = await prisma.firm.findUnique({ where: { id }, select: { slug: true } });
    if (!firm) throw new ApiError(404, "No such chamber.");

    await prisma.firm.update({ where: { id }, data: { verified } });

    const actor = await platformActor(req);
    await recordPlatformAction({
      actorId: actor.id,
      actorEmail: actor.email,
      action: verified ? "verify" : "unverify",
      firmId: id,
      firmSlug: firm.slug,
      reason: note,
    });

    res.json(await chamberById(id));
  })
);

/**
 * Suspending a chamber, and restoring it.
 *
 * A suspension stops everybody in that chamber signing in — the advocate,
 * their colleagues and their clients — and the reason given here is what
 * they are shown. Their work is untouched and comes back whole on restore.
 *
 * A platform admin cannot suspend their own chamber. Not paternalism: the
 * console is reached through a session in that chamber, so suspending it
 * would lock the platform admin out of the console they would need to undo
 * it.
 */
platformRouter.post(
  "/chambers/:id/suspend",
  validate(suspendSchema),
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    const { reason } = req.body as { reason: string };

    const actor = await platformActor(req);
    const me = await prisma.user.findUnique({
      where: { id: actor.id },
      select: { firmId: true },
    });
    if (me?.firmId === id) {
      throw new ApiError(
        400,
        "You cannot suspend your own chamber — you would be locking yourself out of the console that undoes it."
      );
    }

    const firm = await prisma.firm.findUnique({ where: { id }, select: { slug: true } });
    if (!firm) throw new ApiError(404, "No such chamber.");

    await prisma.firm.update({
      where: { id },
      data: { status: "suspended", suspendedReason: reason },
    });

    await recordPlatformAction({
      actorId: actor.id,
      actorEmail: actor.email,
      action: "suspend",
      firmId: id,
      firmSlug: firm.slug,
      reason,
    });

    res.json(await chamberById(id));
  })
);

platformRouter.post(
  "/chambers/:id/restore",
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);

    const firm = await prisma.firm.findUnique({ where: { id }, select: { slug: true } });
    if (!firm) throw new ApiError(404, "No such chamber.");

    await prisma.firm.update({
      where: { id },
      data: { status: "active", suspendedReason: "" },
    });

    const actor = await platformActor(req);
    await recordPlatformAction({
      actorId: actor.id,
      actorEmail: actor.email,
      action: "restore",
      firmId: id,
      firmSlug: firm.slug,
      reason: "",
    });

    res.json(await chamberById(id));
  })
);

// ---------------------------------------------------------------------------
// The shared library
// ---------------------------------------------------------------------------

/**
 * What chambers have offered, and nobody has answered yet.
 *
 * The one place in the console that shows a chamber's content — and only
 * content a chamber has deliberately asked to put in front of every other
 * advocate. Reading it is the whole point of being asked to approve it.
 */
platformRouter.get(
  "/submissions",
  asyncHandler(async (req, res) => {
    const state = String(req.query.state ?? "pending");
    if (!["pending", "approved", "rejected"].includes(state)) {
      throw new ApiError(400, "Not a state a submission can be in.");
    }

    res.json({ items: await submissionQueue(state) });
  })
);

/**
 * Approving an entry into the shared library, or turning it down.
 *
 * This is the sharpest thing in the console. An approved entry is a legal
 * citation another advocate may carry into court on the strength of its
 * being here, so approval is a statement that somebody read it — which is
 * why it cannot be done in bulk and why the queue shows the citation, the
 * court and the principle rather than only a title.
 *
 * Approval also requires the chamber to be verified. A chamber's own
 * private work needs nothing from anybody; putting its work in front of
 * advocates who cannot check who wrote it needs somebody to have confirmed
 * the name is real.
 */
platformRouter.post(
  "/submissions/:kind/:id",
  validate(moderateSchema),
  asyncHandler(async (req, res) => {
    const kind = String(req.params.kind);
    if (!isSharedKind(kind)) throw new ApiError(400, "Not a kind of library entry.");

    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) throw new ApiError(400, "Not a valid id.");

    const { approve, note } = req.body as { approve: boolean; note: string };

    const entry = await findSubmission(kind, id);
    if (!entry) throw new ApiError(404, "No such entry.");
    if (entry.shareState !== "pending") {
      throw new ApiError(400, "That has already been answered.");
    }

    if (approve) await assertChamberMayShare(entry.firmId);

    await setShareState(kind, id, {
      shareState: approve ? "approved" : "rejected",
      sharedAt: approve ? new Date() : null,
      shareNote: note,
    });

    res.json({ kind, id, shareState: approve ? "approved" : "rejected", shareNote: note });
  })
);

/**
 * Taking an approved entry back out of the shared library.
 *
 * Returns it to the chamber as a rejection rather than deleting it: it is
 * their work, they keep it, and the note says what was wrong with it.
 */
platformRouter.post(
  "/submissions/:kind/:id/withdraw",
  validate(moderateSchema),
  asyncHandler(async (req, res) => {
    const kind = String(req.params.kind);
    if (!isSharedKind(kind)) throw new ApiError(400, "Not a kind of library entry.");

    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) throw new ApiError(400, "Not a valid id.");

    const { note } = req.body as { note: string };

    const entry = await findSubmission(kind, id);
    if (!entry) throw new ApiError(404, "No such entry.");
    if (entry.shareState !== "approved") {
      throw new ApiError(400, "That is not in the shared library.");
    }

    await setShareState(kind, id, {
      shareState: "rejected",
      sharedAt: null,
      shareNote: note,
    });

    res.json({ kind, id, shareState: "rejected", shareNote: note });
  })
);

/**
 * Unscoped by necessity and by design: moderating means reaching into
 * another chamber's row, which is the one thing the platform admin may do
 * and only for an entry that chamber offered. The `shareState` check above
 * is what keeps it to those.
 */
async function findSubmission(kind: SharedKind, id: number) {
  const select = { id: true, firmId: true, shareState: true } as const;
  switch (kind) {
    case "judgment":
      return prisma.judgment.findUnique({ where: { id }, select });
    case "research":
      return prisma.research.findUnique({ where: { id }, select });
    case "media":
      return prisma.media.findUnique({ where: { id }, select });
  }
}

async function setShareState(
  kind: SharedKind,
  id: number,
  data: { shareState: string; sharedAt: Date | null; shareNote: string }
) {
  switch (kind) {
    case "judgment":
      return prisma.judgment.update({ where: { id }, data });
    case "research":
      return prisma.research.update({ where: { id }, data });
    case "media":
      return prisma.media.update({ where: { id }, data });
  }
}

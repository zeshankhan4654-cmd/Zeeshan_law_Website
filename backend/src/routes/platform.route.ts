import { Router } from "express";
import { asyncHandler } from "../lib/async-handler.js";
import {
  chamberById,
  listChambers,
  platformTotals,
  recentPlatformActions,
  recordPlatformAction,
} from "../lib/platform-stats.js";
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
    const [totals, chambers, actions] = await Promise.all([
      platformTotals(),
      listChambers(query),
      recentPlatformActions(20),
    ]);

    res.json({ totals, ...chambers, actions, limit: query.limit, offset: query.offset });
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

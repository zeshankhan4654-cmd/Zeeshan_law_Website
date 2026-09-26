import { Router, type Request } from "express";
import { asyncHandler } from "../lib/async-handler.js";
import { ROOT_ROLE } from "../lib/capabilities.js";
import {
  assertFitToShare,
  isSharedKind,
  type SharedKind,
} from "../lib/shared-library.js";
import {
  requireCap,
  requireNoPendingPasswordChange,
  requireStaff,
  staffSession,
  tenant,
} from "../middleware/auth.js";
import type { FirmClient } from "../lib/tenant.js";
import { ApiError } from "../middleware/errorHandler.js";
import { validate, validateQuery } from "../middleware/validate.js";
import {
  judgmentSchema,
  libraryListSchema,
  mediaSchema,
  researchSchema,
  type JudgmentInput,
  type LibraryAdminQuery,
  type MediaInput,
  type ResearchInput,
} from "../validation/office-library.schema.js";

/**
 * The library, from the chamber's side: judgments, research and recordings,
 * each with a draft state and a published one.
 *
 * Publishing is its own capability (`library.publish`), separate from
 * writing. Someone may draft a note on a judgment all day without being
 * able to put it on the firm's public website under the firm's name.
 *
 * The API refuses to publish a judgment with no citation. That is the
 * chamber's own rule — nothing goes up that has not been checked against
 * the report — expressed where it cannot be forgotten rather than in a
 * note to whoever is typing.
 *
 * Offering an entry to the shared library is a third act again, at the end
 * of this file. Writing it is one decision, putting it on the chamber's own
 * website is another, and putting it in front of every advocate on the
 * platform is a third that the chamber can only *ask* for.
 */
export const officeLibraryRouter = Router();

officeLibraryRouter.use(requireStaff, requireNoPendingPasswordChange);

function parseId(raw: string | undefined): number {
  const id = Number(raw);
  if (!Number.isInteger(id) || id < 1) throw new ApiError(400, "Not a valid id.");
  return id;
}

function search(fields: string[], q: string) {
  if (!q) return {};
  return { OR: fields.map((f) => ({ [f]: { contains: q, mode: "insensitive" as const } })) };
}

/**
 * Putting something on the public website is a different act from writing
 * it, so it needs `library.publish` even for a user who may edit.
 */
async function assertMayPublish(
  req: Request,
  wantsPublished: boolean,
  wasPublished: boolean
): Promise<void> {
  // Only a change of state needs the capability; saving an already-published
  // entry unchanged does not.
  if (wantsPublished === wasPublished) return;

  const session = staffSession(req);
  if (session.role === ROOT_ROLE) return;

  const { db, firmId } = tenant(req);
  const grant = await db.roleCap.findUnique({
    where: { firmId_roleKey_cap: { firmId, roleKey: session.role, cap: "library.publish" } },
  });
  if (!grant) {
    throw new ApiError(403, "Your role may write library entries but not publish them.");
  }
}

// ---------------------------------------------------------------------------
// Judgments
// ---------------------------------------------------------------------------

officeLibraryRouter.get(
  "/library/judgments",
  requireCap("library.view"),
  validateQuery(libraryListSchema),
  asyncHandler(async (req, res) => {
    const { db } = tenant(req);
    const { q, limit } = res.locals.query as LibraryAdminQuery;
    const where = search(["title", "citation", "court", "principle", "tags"], q);

    const [items, published, shared] = await Promise.all([
      db.judgment.findMany({
        where,
        orderBy: [{ judgmentDate: "desc" }, { id: "desc" }],
        take: limit,
      }),
      db.judgment.count({ where: { published: true } }),
      db.judgment.count({ where: { shareState: "approved" } }),
    ]);

    res.json({ items, published, shared });
  })
);

officeLibraryRouter.post(
  "/library/judgments",
  requireCap("library.edit"),
  validate(judgmentSchema),
  asyncHandler(async (req, res) => {
    const { db, firmId } = tenant(req);
    const input = req.body as JudgmentInput;
    await assertMayPublish(req, input.published, false);

    const created = await db.judgment.create({
      data: { ...input, firmId, judgmentDate: input.judgmentDate || null },
      select: { id: true },
    });
    res.status(201).json(created);
  })
);

/**
 * One entry, for a screen that edits it.
 *
 * The list route beside this one returns whole rows, so the office on a computer can open an entry from what it already holds. The app arrives at the editor by a link and holds nothing, so it asks.
 *
 * Scoped like everything else here: `db` is the chamber's own client, so an
 * id belonging to another chamber is simply not found.
 */
officeLibraryRouter.get(
  "/library/judgments/:id",
  requireCap("library.view"),
  asyncHandler(async (req, res) => {
    const { db } = tenant(req);
    const entry = await db.judgment.findUnique({ where: { id: parseId(req.params.id) } });
    if (!entry) throw new ApiError(404, "No such entry.");
    res.json(entry);
  })
);

officeLibraryRouter.patch(
  "/library/judgments/:id",
  requireCap("library.edit"),
  validate(judgmentSchema),
  asyncHandler(async (req, res) => {
    const { db } = tenant(req);
    const id = parseId(req.params.id);
    const existing = await db.judgment.findUnique({ where: { id }, select: { published: true } });
    if (!existing) throw new ApiError(404, "No such judgment.");

    const input = req.body as JudgmentInput;
    await assertMayPublish(req, input.published, existing.published);

    await db.judgment.update({
      where: { id },
      data: { ...input, judgmentDate: input.judgmentDate || null },
    });
    res.status(204).end();
  })
);

officeLibraryRouter.delete(
  "/library/judgments/:id",
  requireCap("library.delete"),
  asyncHandler(async (req, res) => {
    const { db } = tenant(req);
    const id = parseId(req.params.id);
    const removed = await db.judgment.deleteMany({ where: { id } });
    if (removed.count === 0) throw new ApiError(404, "No such judgment.");
    res.status(204).end();
  })
);

// ---------------------------------------------------------------------------
// Research
// ---------------------------------------------------------------------------

officeLibraryRouter.get(
  "/library/research",
  requireCap("library.view"),
  validateQuery(libraryListSchema),
  asyncHandler(async (req, res) => {
    const { db } = tenant(req);
    const { q, limit } = res.locals.query as LibraryAdminQuery;
    const where = search(["title", "topic", "summary", "tags"], q);

    const [items, published, shared] = await Promise.all([
      db.research.findMany({ where, orderBy: { id: "desc" }, take: limit }),
      db.research.count({ where: { published: true } }),
      db.research.count({ where: { shareState: "approved" } }),
    ]);

    res.json({ items, published, shared });
  })
);

officeLibraryRouter.post(
  "/library/research",
  requireCap("library.edit"),
  validate(researchSchema),
  asyncHandler(async (req, res) => {
    const { db, firmId } = tenant(req);
    const input = req.body as ResearchInput;
    await assertMayPublish(req, input.published, false);

    const created = await db.research.create({ data: { ...input, firmId }, select: { id: true } });
    res.status(201).json(created);
  })
);

/**
 * One entry, for a screen that edits it.
 *
 * The list route beside this one returns whole rows, so the office on a computer can open an entry from what it already holds. The app arrives at the editor by a link and holds nothing, so it asks.
 *
 * Scoped like everything else here: `db` is the chamber's own client, so an
 * id belonging to another chamber is simply not found.
 */
officeLibraryRouter.get(
  "/library/research/:id",
  requireCap("library.view"),
  asyncHandler(async (req, res) => {
    const { db } = tenant(req);
    const entry = await db.research.findUnique({ where: { id: parseId(req.params.id) } });
    if (!entry) throw new ApiError(404, "No such entry.");
    res.json(entry);
  })
);

officeLibraryRouter.patch(
  "/library/research/:id",
  requireCap("library.edit"),
  validate(researchSchema),
  asyncHandler(async (req, res) => {
    const { db } = tenant(req);
    const id = parseId(req.params.id);
    const existing = await db.research.findUnique({ where: { id }, select: { published: true } });
    if (!existing) throw new ApiError(404, "No such article.");

    const input = req.body as ResearchInput;
    await assertMayPublish(req, input.published, existing.published);

    await db.research.update({ where: { id }, data: input });
    res.status(204).end();
  })
);

officeLibraryRouter.delete(
  "/library/research/:id",
  requireCap("library.delete"),
  asyncHandler(async (req, res) => {
    const { db } = tenant(req);
    const id = parseId(req.params.id);
    const removed = await db.research.deleteMany({ where: { id } });
    if (removed.count === 0) throw new ApiError(404, "No such article.");
    res.status(204).end();
  })
);

// ---------------------------------------------------------------------------
// Recordings
// ---------------------------------------------------------------------------

officeLibraryRouter.get(
  "/library/media",
  requireCap("library.view"),
  validateQuery(libraryListSchema),
  asyncHandler(async (req, res) => {
    const { db } = tenant(req);
    const { q, limit } = res.locals.query as LibraryAdminQuery;
    const where = search(["title", "topic", "description"], q);

    const [items, published, shared] = await Promise.all([
      db.media.findMany({ where, orderBy: { id: "desc" }, take: limit }),
      db.media.count({ where: { published: true } }),
      db.media.count({ where: { shareState: "approved" } }),
    ]);

    res.json({ items, published, shared });
  })
);

officeLibraryRouter.post(
  "/library/media",
  requireCap("library.edit"),
  validate(mediaSchema),
  asyncHandler(async (req, res) => {
    const { db, firmId } = tenant(req);
    const input = req.body as MediaInput;
    await assertMayPublish(req, input.published, false);

    const created = await db.media.create({
      data: { ...input, firmId, recordedOn: input.recordedOn || null },
      select: { id: true },
    });
    res.status(201).json(created);
  })
);

/**
 * One entry, for a screen that edits it.
 *
 * The list route beside this one returns whole rows, so the office on a computer can open an entry from what it already holds. The app arrives at the editor by a link and holds nothing, so it asks.
 *
 * Scoped like everything else here: `db` is the chamber's own client, so an
 * id belonging to another chamber is simply not found.
 */
officeLibraryRouter.get(
  "/library/media/:id",
  requireCap("library.view"),
  asyncHandler(async (req, res) => {
    const { db } = tenant(req);
    const entry = await db.media.findUnique({ where: { id: parseId(req.params.id) } });
    if (!entry) throw new ApiError(404, "No such entry.");
    res.json(entry);
  })
);

officeLibraryRouter.patch(
  "/library/media/:id",
  requireCap("library.edit"),
  validate(mediaSchema),
  asyncHandler(async (req, res) => {
    const { db } = tenant(req);
    const id = parseId(req.params.id);
    const existing = await db.media.findUnique({ where: { id }, select: { published: true } });
    if (!existing) throw new ApiError(404, "No such recording.");

    const input = req.body as MediaInput;
    await assertMayPublish(req, input.published, existing.published);

    await db.media.update({
      where: { id },
      data: { ...input, recordedOn: input.recordedOn || null },
    });
    res.status(204).end();
  })
);

officeLibraryRouter.delete(
  "/library/media/:id",
  requireCap("library.delete"),
  asyncHandler(async (req, res) => {
    const { db } = tenant(req);
    const id = parseId(req.params.id);
    const removed = await db.media.deleteMany({ where: { id } });
    if (removed.count === 0) throw new ApiError(404, "No such recording.");
    res.status(204).end();
  })
);

// ---------------------------------------------------------------------------
// Offering an entry to the shared library
// ---------------------------------------------------------------------------

/**
 * A chamber offering its work to every other chamber, and taking it back.
 *
 * Deliberately gated on `library.publish` rather than `library.edit`: this
 * puts the chamber's name in front of advocates who have never met them,
 * which is the same kind of decision as publishing on the chamber's own
 * website, not the same kind as writing a draft.
 *
 * The chamber can only ever move an entry to `pending` or back to
 * `private`. Approving is the platform's, and lives in platform.route.ts —
 * there is no argument this route accepts that reaches `approved`.
 */

/**
 * The three tables, reached by a switch rather than by indexing the client
 * with a string.
 *
 * Prisma gives each model its own delegate type, and the three do not
 * union into something callable — `db[table].update(...)` does not
 * typecheck, and the ways of making it do so all involve casting away the
 * types that stop a wrong field being written. A switch costs three lines
 * and keeps them.
 */
type ShareFields = {
  shareState: string;
  sharedAt?: Date | null;
  shareNote?: string;
  submittedBy?: string;
};

async function findEntry(db: FirmClient, kind: SharedKind, id: number) {
  switch (kind) {
    case "judgment":
      return db.judgment.findUnique({ where: { id } });
    case "research":
      return db.research.findUnique({ where: { id } });
    case "media":
      return db.media.findUnique({ where: { id } });
  }
}

async function setShareFields(db: FirmClient, kind: SharedKind, id: number, data: ShareFields) {
  const select = {
    id: true,
    shareState: true,
    shareNote: true,
    submittedBy: true,
    sharedAt: true,
  } as const;

  switch (kind) {
    case "judgment":
      return db.judgment.update({ where: { id }, data, select });
    case "research":
      return db.research.update({ where: { id }, data, select });
    case "media":
      return db.media.update({ where: { id }, data, select });
  }
}

function kindFrom(raw: string | undefined): SharedKind {
  const kind = String(raw ?? "");
  if (!isSharedKind(kind)) throw new ApiError(400, "Not a kind of library entry.");
  return kind;
}

officeLibraryRouter.post(
  "/library/:kind/:id/share",
  requireCap("library.publish"),
  asyncHandler(async (req, res) => {
    const kind = kindFrom(req.params.kind);
    const id = parseId(req.params.id);
    const { db } = tenant(req);

    const entry = await findEntry(db, kind, id);
    if (!entry) throw new ApiError(404, "No such entry.");

    if (entry.shareState === "approved") {
      throw new ApiError(400, "This is already in the shared library.");
    }
    if (entry.shareState === "pending") {
      throw new ApiError(400, "This has already been offered and is waiting to be read.");
    }

    // Stricter than the chamber's own publish rule: an entry here has to
    // stand on its own in front of somebody who cannot ask who wrote it.
    assertFitToShare(kind, entry);

    const updated = await setShareFields(db, kind, id, {
      shareState: "pending",
      submittedBy: staffSession(req).username,
      // A previous rejection's reason is cleared: it belonged to the
      // version that was turned down, not to this one.
      shareNote: "",
    });

    res.json(updated);
  })
);

officeLibraryRouter.post(
  "/library/:kind/:id/unshare",
  requireCap("library.publish"),
  asyncHandler(async (req, res) => {
    const kind = kindFrom(req.params.kind);
    const id = parseId(req.params.id);
    const { db } = tenant(req);

    const entry = await findEntry(db, kind, id);
    if (!entry) throw new ApiError(404, "No such entry.");

    // A chamber may always take its own work back, approved or not. It is
    // their work, and an advocate who has thought better of a note they
    // shared should not have to ask anybody's permission to withdraw it.
    const updated = await setShareFields(db, kind, id, {
      shareState: "private",
      sharedAt: null,
      shareNote: "",
      submittedBy: "",
    });

    res.json(updated);
  })
);

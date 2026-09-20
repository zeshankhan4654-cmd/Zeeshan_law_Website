import { Router, type Request } from "express";
import { asyncHandler } from "../lib/async-handler.js";
import { ROOT_ROLE } from "../lib/capabilities.js";
import { prisma } from "../lib/prisma.js";
import {
  requireCap,
  requireNoPendingPasswordChange,
  requireStaff,
  staffSession,
} from "../middleware/auth.js";
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

  const grant = await prisma.roleCap.findUnique({
    where: { roleKey_cap: { roleKey: session.role, cap: "library.publish" } },
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
  asyncHandler(async (_req, res) => {
    const { q, limit } = res.locals.query as LibraryAdminQuery;
    const where = search(["title", "citation", "court", "principle", "tags"], q);

    const [items, published] = await Promise.all([
      prisma.judgment.findMany({
        where,
        orderBy: [{ judgmentDate: "desc" }, { id: "desc" }],
        take: limit,
      }),
      prisma.judgment.count({ where: { published: true } }),
    ]);

    res.json({ items, published });
  })
);

officeLibraryRouter.post(
  "/library/judgments",
  requireCap("library.edit"),
  validate(judgmentSchema),
  asyncHandler(async (req, res) => {
    const input = req.body as JudgmentInput;
    await assertMayPublish(req, input.published, false);

    const created = await prisma.judgment.create({
      data: { ...input, judgmentDate: input.judgmentDate || null },
      select: { id: true },
    });
    res.status(201).json(created);
  })
);

officeLibraryRouter.patch(
  "/library/judgments/:id",
  requireCap("library.edit"),
  validate(judgmentSchema),
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    const existing = await prisma.judgment.findUnique({ where: { id }, select: { published: true } });
    if (!existing) throw new ApiError(404, "No such judgment.");

    const input = req.body as JudgmentInput;
    await assertMayPublish(req, input.published, existing.published);

    await prisma.judgment.update({
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
    const id = parseId(req.params.id);
    const removed = await prisma.judgment.deleteMany({ where: { id } });
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
  asyncHandler(async (_req, res) => {
    const { q, limit } = res.locals.query as LibraryAdminQuery;
    const where = search(["title", "topic", "summary", "tags"], q);

    const [items, published] = await Promise.all([
      prisma.research.findMany({ where, orderBy: { id: "desc" }, take: limit }),
      prisma.research.count({ where: { published: true } }),
    ]);

    res.json({ items, published });
  })
);

officeLibraryRouter.post(
  "/library/research",
  requireCap("library.edit"),
  validate(researchSchema),
  asyncHandler(async (req, res) => {
    const input = req.body as ResearchInput;
    await assertMayPublish(req, input.published, false);

    const created = await prisma.research.create({ data: input, select: { id: true } });
    res.status(201).json(created);
  })
);

officeLibraryRouter.patch(
  "/library/research/:id",
  requireCap("library.edit"),
  validate(researchSchema),
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    const existing = await prisma.research.findUnique({ where: { id }, select: { published: true } });
    if (!existing) throw new ApiError(404, "No such article.");

    const input = req.body as ResearchInput;
    await assertMayPublish(req, input.published, existing.published);

    await prisma.research.update({ where: { id }, data: input });
    res.status(204).end();
  })
);

officeLibraryRouter.delete(
  "/library/research/:id",
  requireCap("library.delete"),
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    const removed = await prisma.research.deleteMany({ where: { id } });
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
  asyncHandler(async (_req, res) => {
    const { q, limit } = res.locals.query as LibraryAdminQuery;
    const where = search(["title", "topic", "description"], q);

    const [items, published] = await Promise.all([
      prisma.media.findMany({ where, orderBy: { id: "desc" }, take: limit }),
      prisma.media.count({ where: { published: true } }),
    ]);

    res.json({ items, published });
  })
);

officeLibraryRouter.post(
  "/library/media",
  requireCap("library.edit"),
  validate(mediaSchema),
  asyncHandler(async (req, res) => {
    const input = req.body as MediaInput;
    await assertMayPublish(req, input.published, false);

    const created = await prisma.media.create({
      data: { ...input, recordedOn: input.recordedOn || null },
      select: { id: true },
    });
    res.status(201).json(created);
  })
);

officeLibraryRouter.patch(
  "/library/media/:id",
  requireCap("library.edit"),
  validate(mediaSchema),
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    const existing = await prisma.media.findUnique({ where: { id }, select: { published: true } });
    if (!existing) throw new ApiError(404, "No such recording.");

    const input = req.body as MediaInput;
    await assertMayPublish(req, input.published, existing.published);

    await prisma.media.update({
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
    const id = parseId(req.params.id);
    const removed = await prisma.media.deleteMany({ where: { id } });
    if (removed.count === 0) throw new ApiError(404, "No such recording.");
    res.status(204).end();
  })
);

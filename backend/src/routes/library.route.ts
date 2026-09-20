import { Router } from "express";
import { asyncHandler } from "../lib/async-handler.js";
import { prisma } from "../lib/prisma.js";
import { APPROVED_AND_STANDING, CONTRIBUTOR_SELECT } from "../lib/shared-library.js";
import { ApiError } from "../middleware/errorHandler.js";
import { validateQuery } from "../middleware/validate.js";
import { libraryListSchema, type LibraryListQuery } from "../validation/library.schema.js";

/**
 * The shared library: judgments, research and recorded material that
 * chambers across the platform have contributed. No authentication — this
 * is open to anyone, including other practitioners, which is the point of
 * it.
 *
 * Deliberately not scoped to a chamber; this is the one public surface
 * that is meant to cross them. What keeps it safe is not a firm filter but
 * `APPROVED_AND_STANDING`: an entry appears only if its chamber offered it
 * *and* the platform approved it *and* that chamber is still verified and
 * still active. Every query in this file applies it. An entry that is
 * merely a chamber's own published work must not be reachable here by
 * listing it, searching for it, or guessing its id.
 *
 * Each entry carries the chamber that contributed it. An advocate deciding
 * whether to rely on a note needs to know whose note it is.
 */
export const libraryRouter = Router();

/** Case-insensitive contains, across the columns worth searching for each kind. */
function search(fields: string[], q: string) {
  if (!q) return {};
  return {
    OR: fields.map((field) => ({
      [field]: { contains: q, mode: "insensitive" as const },
    })),
  };
}

libraryRouter.get(
  "/judgments",
  validateQuery(libraryListSchema),
  asyncHandler(async (_req, res) => {
    const { q, limit, offset } = res.locals.query as LibraryListQuery;
    const where = {
      ...APPROVED_AND_STANDING,
      ...search(["title", "citation", "court", "principle", "summary", "tags"], q),
    };

    const [items, total] = await Promise.all([
      prisma.judgment.findMany({
        where,
        orderBy: [{ judgmentDate: "desc" }, { id: "desc" }],
        take: limit,
        skip: offset,
        select: {
          id: true, title: true, citation: true, court: true,
          judgmentDate: true, principle: true, tags: true,
          firm: CONTRIBUTOR_SELECT,
        },
      }),
      prisma.judgment.count({ where }),
    ]);

    res.json({ items, total, limit, offset });
  })
);

libraryRouter.get(
  "/judgments/:id",
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) throw new ApiError(400, "Not a valid id.");

    const item = await prisma.judgment.findFirst({
      where: { id, ...APPROVED_AND_STANDING },
      // Named explicitly. A whole row would carry share_note — which can
      // hold a moderator's reason — and submitted_by, which is a member of
      // another chamber's staff. Neither is the public's.
      select: {
        id: true, title: true, citation: true, court: true, judges: true,
        judgmentDate: true, sections: true, principle: true, summary: true,
        tags: true, sourceUrl: true, sharedAt: true, firm: CONTRIBUTOR_SELECT,
      },
    });
    if (!item) throw new ApiError(404, "There is no such judgment in the library.");

    res.json(item);
  })
);

libraryRouter.get(
  "/research",
  validateQuery(libraryListSchema),
  asyncHandler(async (_req, res) => {
    const { q, limit, offset } = res.locals.query as LibraryListQuery;
    const where = {
      ...APPROVED_AND_STANDING,
      ...search(["title", "topic", "summary", "body", "tags"], q),
    };

    const [items, total] = await Promise.all([
      prisma.research.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
        select: {
          id: true, title: true, topic: true, summary: true, tags: true,
          createdAt: true, firm: CONTRIBUTOR_SELECT,
        },
      }),
      prisma.research.count({ where }),
    ]);

    res.json({ items, total, limit, offset });
  })
);

libraryRouter.get(
  "/research/:id",
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) throw new ApiError(400, "Not a valid id.");

    const item = await prisma.research.findFirst({
      where: { id, ...APPROVED_AND_STANDING },
      select: {
        id: true, title: true, topic: true, summary: true, body: true,
        tags: true, createdAt: true, sharedAt: true, firm: CONTRIBUTOR_SELECT,
      },
    });
    if (!item) throw new ApiError(404, "There is no such article in the library.");

    res.json(item);
  })
);

libraryRouter.get(
  "/media",
  validateQuery(libraryListSchema),
  asyncHandler(async (_req, res) => {
    const { q, limit, offset } = res.locals.query as LibraryListQuery;
    const where = {
      ...APPROVED_AND_STANDING,
      ...search(["title", "kind", "topic", "description"], q),
    };

    const [items, total] = await Promise.all([
      prisma.media.findMany({
        where,
        orderBy: [{ recordedOn: "desc" }, { id: "desc" }],
        take: limit,
        skip: offset,
        select: {
          id: true, title: true, kind: true, topic: true, description: true,
          recordedOn: true, url: true, firm: CONTRIBUTOR_SELECT,
        },
      }),
      prisma.media.count({ where }),
    ]);

    res.json({ items, total, limit, offset });
  })
);

/** How much is in each section — lets a client render the library's shape before fetching any of it. */
libraryRouter.get(
  "/counts",
  asyncHandler(async (_req, res) => {
    const [judgments, research, media] = await Promise.all([
      prisma.judgment.count({ where: APPROVED_AND_STANDING }),
      prisma.research.count({ where: APPROVED_AND_STANDING }),
      prisma.media.count({ where: APPROVED_AND_STANDING }),
    ]);
    res.json({ judgments, research, media });
  })
);

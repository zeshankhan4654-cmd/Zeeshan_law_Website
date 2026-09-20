import { Router } from "express";
import { asyncHandler } from "../lib/async-handler.js";
import { platformDb } from "../lib/platform.js";
import { ApiError } from "../middleware/errorHandler.js";
import { validateQuery } from "../middleware/validate.js";
import { libraryListSchema, type LibraryListQuery } from "../validation/library.schema.js";

/**
 * The public library: judgments, research and recorded material the chamber
 * has chosen to publish. No authentication — this is open to anyone,
 * including other practitioners, which is the point of it.
 *
 * Every query here filters on `published`. An unpublished entry must not be
 * reachable by listing it, searching for it, or guessing its id.
 *
 * For now this serves one chamber's library — the platform chamber's. The
 * shared library, where every chamber may contribute and the platform admin
 * moderates what appears, is a later milestone; until that moderation
 * exists, another chamber publishing an entry must not put it on this
 * website unreviewed.
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
    const db = await platformDb();
    const { q, limit, offset } = res.locals.query as LibraryListQuery;
    const where = {
      published: true,
      ...search(["title", "citation", "court", "principle", "summary", "tags"], q),
    };

    const [items, total] = await Promise.all([
      db.judgment.findMany({
        where,
        orderBy: [{ judgmentDate: "desc" }, { id: "desc" }],
        take: limit,
        skip: offset,
        select: {
          id: true, title: true, citation: true, court: true,
          judgmentDate: true, principle: true, tags: true,
        },
      }),
      db.judgment.count({ where }),
    ]);

    res.json({ items, total, limit, offset });
  })
);

libraryRouter.get(
  "/judgments/:id",
  asyncHandler(async (req, res) => {
    const db = await platformDb();
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) throw new ApiError(400, "Not a valid id.");

    const item = await db.judgment.findFirst({ where: { id, published: true } });
    if (!item) throw new ApiError(404, "There is no such judgment in the library.");

    res.json(item);
  })
);

libraryRouter.get(
  "/research",
  validateQuery(libraryListSchema),
  asyncHandler(async (_req, res) => {
    const db = await platformDb();
    const { q, limit, offset } = res.locals.query as LibraryListQuery;
    const where = {
      published: true,
      ...search(["title", "topic", "summary", "body", "tags"], q),
    };

    const [items, total] = await Promise.all([
      db.research.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
        select: { id: true, title: true, topic: true, summary: true, tags: true, createdAt: true },
      }),
      db.research.count({ where }),
    ]);

    res.json({ items, total, limit, offset });
  })
);

libraryRouter.get(
  "/research/:id",
  asyncHandler(async (req, res) => {
    const db = await platformDb();
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) throw new ApiError(400, "Not a valid id.");

    const item = await db.research.findFirst({ where: { id, published: true } });
    if (!item) throw new ApiError(404, "There is no such article in the library.");

    res.json(item);
  })
);

libraryRouter.get(
  "/media",
  validateQuery(libraryListSchema),
  asyncHandler(async (_req, res) => {
    const db = await platformDb();
    const { q, limit, offset } = res.locals.query as LibraryListQuery;
    const where = {
      published: true,
      ...search(["title", "kind", "topic", "description"], q),
    };

    const [items, total] = await Promise.all([
      db.media.findMany({
        where,
        orderBy: [{ recordedOn: "desc" }, { id: "desc" }],
        take: limit,
        skip: offset,
        select: { id: true, title: true, kind: true, topic: true, description: true, recordedOn: true, url: true },
      }),
      db.media.count({ where }),
    ]);

    res.json({ items, total, limit, offset });
  })
);

/** How much is in each section — lets a client render the library's shape before fetching any of it. */
libraryRouter.get(
  "/counts",
  asyncHandler(async (_req, res) => {
    const db = await platformDb();
    const [judgments, research, media] = await Promise.all([
      db.judgment.count({ where: { published: true } }),
      db.research.count({ where: { published: true } }),
      db.media.count({ where: { published: true } }),
    ]);
    res.json({ judgments, research, media });
  })
);

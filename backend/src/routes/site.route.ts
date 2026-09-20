import fs from "node:fs";
import { Router } from "express";
import { asyncHandler } from "../lib/async-handler.js";
import { contentTypeFor, resolveStoredPath } from "../lib/uploads.js";
import { prisma } from "../lib/prisma.js";
import { countAction, secondsUntilAllowed } from "../lib/rate-limit.js";
import { publicSettings } from "../lib/site-settings.js";
import { ApiError } from "../middleware/errorHandler.js";
import { validate, validateQuery } from "../middleware/validate.js";
import {
  enquirySchema,
  postListSchema,
  type EnquiryInput,
  type PostListQuery,
} from "../validation/site.schema.js";

/**
 * The public website's own API: settings, testimonials, writing, and the
 * one place a stranger may write to the database.
 *
 * No authentication anywhere here, by design. Everything read is something
 * the chamber has deliberately published — every query filters on
 * `published`, the same rule the library follows.
 */
export const siteRouter = Router();

/** Enquiries per address before a cool-off, and how long that lasts. */
const ENQUIRY_MAX = 5;
const ENQUIRY_COOLOFF_MINUTES = 60;

siteRouter.get(
  "/settings",
  asyncHandler(async (_req, res) => {
    res.json(await publicSettings());
  })
);

siteRouter.get(
  "/testimonials",
  asyncHandler(async (_req, res) => {
    const items = await prisma.testimonial.findMany({
      where: { published: true },
      orderBy: [{ sortOrder: "asc" }, { id: "desc" }],
      take: 24,
      select: {
        id: true, author: true, role: true, body: true,
        rating: true, source: true, sourceUrl: true,
      },
    });
    res.json({ items });
  })
);

siteRouter.get(
  "/posts",
  validateQuery(postListSchema),
  asyncHandler(async (_req, res) => {
    const { q, category, limit, offset } = res.locals.query as PostListQuery;

    const where = {
      published: true,
      ...(category ? { category } : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" as const } },
              { summary: { contains: q, mode: "insensitive" as const } },
              { tags: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const [items, total, categories] = await Promise.all([
      prisma.post.findMany({
        where,
        orderBy: [{ publishedOn: "desc" }, { id: "desc" }],
        take: limit,
        skip: offset,
        select: {
          id: true, slug: true, title: true, summary: true, category: true,
          coverName: true, author: true, publishedOn: true,
        },
      }),
      prisma.post.count({ where }),
      // For the filter row, from published posts only.
      prisma.post.findMany({
        where: { published: true, category: { not: "" } },
        distinct: ["category"],
        select: { category: true },
        orderBy: { category: "asc" },
      }),
    ]);

    res.json({ items, total, limit, offset, categories: categories.map((c) => c.category) });
  })
);

siteRouter.get(
  "/posts/:slug",
  asyncHandler(async (req, res) => {
    const slug = String(req.params.slug ?? "").slice(0, 200);

    const post = await prisma.post.findFirst({
      where: { slug, published: true },
      select: {
        id: true, slug: true, title: true, summary: true, body: true,
        category: true, tags: true, coverName: true, author: true,
        publishedOn: true, views: true,
      },
    });
    if (!post) throw new ApiError(404, "No such article.");

    // Best effort: a failed counter must never fail the page.
    await prisma.post
      .update({ where: { id: post.id }, data: { views: { increment: 1 } } })
      .catch(() => undefined);

    res.json(post);
  })
);

/**
 * An article's cover image.
 *
 * Served by the article's slug rather than by the stored filename, so the
 * URL says what it is and the upload directory's contents are not part of
 * the site's public surface. Only a published article's cover is served —
 * a draft's image is not a way to read the draft, but it is still the
 * chamber's unpublished work.
 */
siteRouter.get(
  "/posts/:slug/cover",
  asyncHandler(async (req, res) => {
    const slug = String(req.params.slug ?? "").slice(0, 200);

    const post = await prisma.post.findFirst({
      where: { slug, published: true },
      select: { coverName: true },
    });
    if (!post?.coverName) throw new ApiError(404, "No cover image.");

    const filePath = resolveStoredPath("post", post.coverName);
    if (!filePath || !fs.existsSync(filePath)) throw new ApiError(404, "No cover image.");

    // A cover changes only when the article is edited, and the URL changes
    // with the slug, so it is safe to let a browser keep it for a while.
    res.set("Cache-Control", "public, max-age=3600");
    res.type(contentTypeFor(post.coverName));
    res.sendFile(filePath);
  })
);

/**
 * The contact form — the only unauthenticated write on the site.
 *
 * Three things guard it: a honeypot field no person can see, a length and
 * shape check from Joi, and a per-address limit. None of them is
 * individually strong; together they are enough for a chamber's contact
 * form, and none of them makes a person in difficulty prove they are human.
 */
siteRouter.post(
  "/enquiries",
  validate(enquirySchema),
  asyncHandler(async (req, res) => {
    const { website, ...enquiry } = req.body as EnquiryInput;
    const ip = req.ip ?? "unknown";

    // Answered exactly as a real submission is, so a bot learns nothing
    // from the response and does not simply try again differently.
    if (website.trim() !== "") {
      res.status(201).json({ received: true });
      return;
    }

    const wait = await secondsUntilAllowed("enquiry", ip, ip);
    if (wait > 0) {
      throw new ApiError(
        429,
        "Several enquiries have already been sent from here. Please telephone the chamber, or try later."
      );
    }
    await countAction("enquiry", ip, ip, ENQUIRY_MAX, ENQUIRY_COOLOFF_MINUTES);

    await prisma.enquiry.create({
      data: {
        name: enquiry.name,
        phone: enquiry.phone,
        email: enquiry.email,
        subject: enquiry.subject,
        message: enquiry.message,
      },
    });

    res.status(201).json({ received: true });
  })
);

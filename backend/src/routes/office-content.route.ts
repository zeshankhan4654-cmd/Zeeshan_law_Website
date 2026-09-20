import fs from "node:fs";
import { Router } from "express";
import multer from "multer";
import { asyncHandler } from "../lib/async-handler.js";
import { allCaps, ROOT_ROLE } from "../lib/capabilities.js";
import { generatePassword, proposeUsername } from "../lib/credentials.js";
import { hashPassword } from "../lib/password.js";
import { prisma } from "../lib/prisma.js";
import { SITE_DEFAULTS, publicSettings } from "../lib/site-settings.js";
import type { FirmClient } from "../lib/tenant.js";
import { generateStoredName, imageExtension, uploadDirFor } from "../lib/uploads.js";
import {
  requireCap,
  requireNoPendingPasswordChange,
  requireStaff,
  staffSession,
  tenant,
} from "../middleware/auth.js";
import { ApiError } from "../middleware/errorHandler.js";
import { validate } from "../middleware/validate.js";
import {
  postSchema,
  type PostInput,
  type TestimonialInput,
  roleCapsSchema,
  roleSchema,
  settingsSchema,
  testimonialSchema,
  userEditSchema,
  userSchema,
} from "../validation/office-content.schema.js";

/**
 * The chamber's own content: what the website says, who the office is, and
 * who may do what.
 *
 * Two things here can lock people out if they go wrong — the accounts and
 * the roles — so both carry a rule that cannot be turned off: the chamber
 * must always keep at least one Principal.
 */
export const officeContentRouter = Router();

officeContentRouter.use(requireStaff, requireNoPendingPasswordChange);

function parseId(raw: string | undefined): number {
  const id = Number(raw);
  if (!Number.isInteger(id) || id < 1) throw new ApiError(400, "Not a valid id.");
  return id;
}

/** "A note on limitation" -> "a-note-on-limitation", made unique. */
async function proposeSlug(
  db: FirmClient,
  title: string,
  excludeId?: number
): Promise<string> {
  const base =
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "article";

  for (let n = 0; ; n += 1) {
    const candidate = n === 0 ? base : `${base}-${n + 1}`;
    // findFirst, not findUnique: a slug is unique within a chamber now, and
    // the scoped client supplies the chamber.
    const clash = await db.post.findFirst({ where: { slug: candidate }, select: { id: true } });
    if (!clash || clash.id === excludeId) return candidate;
  }
}

// ---------------------------------------------------------------------------
// Site settings
// ---------------------------------------------------------------------------

officeContentRouter.get(
  "/settings",
  requireCap("site.settings"),
  asyncHandler(async (req, res) => {
    res.json({ settings: await publicSettings(tenant(req).firmId), defaults: SITE_DEFAULTS });
  })
);

officeContentRouter.put(
  "/settings",
  requireCap("site.settings"),
  validate(settingsSchema),
  asyncHandler(async (req, res) => {
    const { db, firmId } = tenant(req);
    const incoming = req.body as Record<string, string>;

    // Only keys the site reads; the schema already rejects anything else,
    // but the write is filtered again rather than trusting one gate.
    const writes = Object.entries(incoming)
      .filter(([key]) => key in SITE_DEFAULTS)
      .map(([key, value]) =>
        db.setting.upsert({
          where: { firmId_key: { firmId, key } },
          create: { firmId, key, value },
          update: { value },
        })
      );

    // The chamber's own client runs the transaction, so every write in it
    // stays inside the wall.
    await db.$transaction(writes);
    res.json(await publicSettings(firmId));
  })
);

// ---------------------------------------------------------------------------
// Client reviews
// ---------------------------------------------------------------------------

officeContentRouter.get(
  "/testimonials",
  requireCap("testimonials.edit"),
  asyncHandler(async (req, res) => {
    const { db } = tenant(req);
    const items = await db.testimonial.findMany({
      orderBy: [{ sortOrder: "asc" }, { id: "desc" }],
    });
    res.json({ items });
  })
);

officeContentRouter.post(
  "/testimonials",
  requireCap("testimonials.edit"),
  validate(testimonialSchema),
  asyncHandler(async (req, res) => {
    const { db, firmId } = tenant(req);
    const created = await db.testimonial.create({
      data: { ...(req.body as TestimonialInput), firmId, createdBy: staffSession(req).username },
      select: { id: true },
    });
    res.status(201).json(created);
  })
);

officeContentRouter.patch(
  "/testimonials/:id",
  requireCap("testimonials.edit"),
  validate(testimonialSchema),
  asyncHandler(async (req, res) => {
    const { db } = tenant(req);
    const id = parseId(req.params.id);
    const updated = await db.testimonial.updateMany({
      where: { id },
      data: req.body as TestimonialInput,
    });
    if (updated.count === 0) throw new ApiError(404, "No such review.");
    res.status(204).end();
  })
);

officeContentRouter.delete(
  "/testimonials/:id",
  requireCap("testimonials.edit"),
  asyncHandler(async (req, res) => {
    const { db } = tenant(req);
    const id = parseId(req.params.id);
    const removed = await db.testimonial.deleteMany({ where: { id } });
    if (removed.count === 0) throw new ApiError(404, "No such review.");
    res.status(204).end();
  })
);

// ---------------------------------------------------------------------------
// Writing
// ---------------------------------------------------------------------------

officeContentRouter.get(
  "/posts",
  requireCap("blog.edit"),
  asyncHandler(async (req, res) => {
    const { db } = tenant(req);
    const items = await db.post.findMany({
      orderBy: [{ publishedOn: "desc" }, { id: "desc" }],
      select: {
        id: true, slug: true, title: true, category: true,
        published: true, publishedOn: true, views: true, coverName: true,
      },
    });
    res.json({ items });
  })
);

officeContentRouter.get(
  "/posts/:id",
  requireCap("blog.edit"),
  asyncHandler(async (req, res) => {
    const { db } = tenant(req);
    const id = parseId(req.params.id);
    const post = await db.post.findUnique({ where: { id } });
    if (!post) throw new ApiError(404, "No such article.");
    res.json(post);
  })
);

officeContentRouter.post(
  "/posts",
  requireCap("blog.edit"),
  validate(postSchema),
  asyncHandler(async (req, res) => {
    const { db, firmId } = tenant(req);
    const input = req.body as PostInput;
    const slug = input.slug || (await proposeSlug(db, input.title));

    const clash = await db.post.findFirst({ where: { slug }, select: { id: true } });
    if (clash) throw new ApiError(400, "That web address is already used by another article.");

    const created = await db.post.create({
      data: {
        ...input,
        firmId,
        slug,
        publishedOn: input.publishedOn || (input.published ? new Date() : null),
        author: staffSession(req).username,
        createdBy: staffSession(req).username,
      },
      select: { id: true, slug: true },
    });
    res.status(201).json(created);
  })
);

officeContentRouter.patch(
  "/posts/:id",
  requireCap("blog.edit"),
  validate(postSchema),
  asyncHandler(async (req, res) => {
    const { db } = tenant(req);
    const id = parseId(req.params.id);
    const existing = await db.post.findUnique({ where: { id } });
    if (!existing) throw new ApiError(404, "No such article.");

    const input = req.body as PostInput;
    const slug = input.slug || (await proposeSlug(db, input.title, id));

    const clash = await db.post.findFirst({ where: { slug }, select: { id: true } });
    if (clash && clash.id !== id) {
      throw new ApiError(400, "That web address is already used by another article.");
    }

    await db.post.update({
      where: { id },
      data: {
        ...input,
        slug,
        // Publishing for the first time dates the article today.
        publishedOn:
          input.publishedOn || (input.published ? (existing.publishedOn ?? new Date()) : null),
      },
    });
    res.status(204).end();
  })
);

officeContentRouter.delete(
  "/posts/:id",
  requireCap("blog.edit"),
  asyncHandler(async (req, res) => {
    const { db } = tenant(req);
    const id = parseId(req.params.id);
    const removed = await db.post.deleteMany({ where: { id } });
    if (removed.count === 0) throw new ApiError(404, "No such article.");
    res.status(204).end();
  })
);

/** The cover image. Unlike case documents, this one is served publicly. */
const coverUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDirFor("post")),
    filename: (_req, file, cb) => cb(null, generateStoredName(imageExtension(file.mimetype) ?? ".bin")),
  }),
  limits: { fileSize: 8 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!imageExtension(file.mimetype)) {
      cb(new ApiError(400, "That is not an image."));
      return;
    }
    cb(null, true);
  },
});

officeContentRouter.post(
  "/posts/:id/cover",
  requireCap("blog.edit"),
  coverUpload.single("cover"),
  asyncHandler(async (req, res) => {
    const { db } = tenant(req);
    const id = parseId(req.params.id);
    const file = req.file;
    if (!file) throw new ApiError(400, "No image was sent.");

    const post = await db.post.findUnique({ where: { id }, select: { coverName: true } });
    if (!post) {
      await fs.promises.unlink(file.path).catch(() => undefined);
      throw new ApiError(404, "No such article.");
    }

    await db.post.update({
      where: { id },
      data: { coverName: file.filename, coverOrig: file.originalname.slice(0, 300) },
    });

    res.status(201).json({ coverName: file.filename });
  })
);

// ---------------------------------------------------------------------------
// Accounts
// ---------------------------------------------------------------------------

/** How many Principals remain if this user's role were changed or removed. */
async function otherAdminsExist(db: FirmClient, excludeUserId: number): Promise<boolean> {
  const count = await db.user.count({
    where: { role: ROOT_ROLE, id: { not: excludeUserId } },
  });
  return count > 0;
}

officeContentRouter.get(
  "/users",
  requireCap("users.manage"),
  asyncHandler(async (req, res) => {
    const { db } = tenant(req);
    const [items, roles] = await Promise.all([
      db.user.findMany({
        orderBy: { fullName: "asc" },
        select: {
          id: true, username: true, email: true, fullName: true, role: true,
          mustChangePassword: true, createdAt: true,
        },
      }),
      db.role.findMany({ orderBy: { sortOrder: "asc" }, select: { roleKey: true, label: true } }),
    ]);
    res.json({ items, roles });
  })
);

officeContentRouter.post(
  "/users",
  requireCap("users.manage"),
  validate(userSchema),
  asyncHandler(async (req, res) => {
    const { db, firmId } = tenant(req);
    const { fullName, username, email, role } = req.body as {
      fullName: string;
      username: string;
      email: string;
      role: string;
    };

    const roleExists = await db.role.findFirst({ where: { roleKey: role } });
    if (!roleExists) throw new ApiError(400, "That role does not exist.");

    // The handle is unique within the chamber only. Another chamber's
    // naveed.ahmad is none of this chamber's business, and saying a free
    // name was taken would tell the asker that somebody they cannot see
    // exists.
    const handleTaken = await db.user.findFirst({ where: { username }, select: { id: true } });
    if (handleTaken) throw new ApiError(400, "Somebody here already uses that username.");

    // The address, by contrast, is how sign-in finds the account at all, so
    // it is checked across the platform. The message names no chamber.
    const addressTaken = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (addressTaken) {
      throw new ApiError(400, "An account already signs in with that email address.");
    }

    const password = generatePassword();
    const created = await db.user.create({
      data: {
        firmId,
        username,
        email,
        fullName,
        role,
        passwordHash: await hashPassword(password),
        mustChangePassword: true,
      },
      select: { id: true, username: true, email: true },
    });

    // Shown once, as with a client's.
    res.status(201).json({ ...created, password });
  })
);

officeContentRouter.patch(
  "/users/:id",
  requireCap("users.manage"),
  validate(userEditSchema),
  asyncHandler(async (req, res) => {
    const { db } = tenant(req);
    const id = parseId(req.params.id);
    const { fullName, role } = req.body as { fullName: string; role: string };

    const user = await db.user.findUnique({ where: { id } });
    if (!user) throw new ApiError(404, "No such account.");

    const roleExists = await db.role.findFirst({ where: { roleKey: role } });
    if (!roleExists) throw new ApiError(400, "That role does not exist.");

    // The chamber must keep somebody who can grant access.
    if (user.role === ROOT_ROLE && role !== ROOT_ROLE && !(await otherAdminsExist(db, id))) {
      throw new ApiError(400, "This is the only Principal. Make somebody else one first.");
    }

    await db.user.update({ where: { id }, data: { fullName, role } });
    res.status(204).end();
  })
);

/** A forgotten password. The old one cannot be recovered, only replaced. */
officeContentRouter.post(
  "/users/:id/password",
  requireCap("users.manage"),
  asyncHandler(async (req, res) => {
    const { db } = tenant(req);
    const id = parseId(req.params.id);
    const user = await db.user.findUnique({ where: { id }, select: { id: true } });
    if (!user) throw new ApiError(404, "No such account.");

    const password = generatePassword();
    await db.user.update({
      where: { id },
      data: { passwordHash: await hashPassword(password), mustChangePassword: true },
    });

    res.json({ password });
  })
);

officeContentRouter.delete(
  "/users/:id",
  requireCap("users.manage"),
  asyncHandler(async (req, res) => {
    const { db } = tenant(req);
    const id = parseId(req.params.id);
    const session = staffSession(req);

    if (id === session.sub) throw new ApiError(400, "You cannot remove your own account.");

    const user = await db.user.findUnique({ where: { id } });
    if (!user) throw new ApiError(404, "No such account.");

    if (user.role === ROOT_ROLE && !(await otherAdminsExist(db, id))) {
      throw new ApiError(400, "This is the only Principal. Make somebody else one first.");
    }

    await db.user.delete({ where: { id } });
    res.status(204).end();
  })
);

/** A suggested username, so the screen can fill it in as the name is typed. */
officeContentRouter.get(
  "/users/suggest-username",
  requireCap("users.manage"),
  asyncHandler(async (req, res) => {
    const { db } = tenant(req);
    const name = String(req.query.name ?? "").slice(0, 160);
    if (!name.trim()) {
      res.json({ username: "" });
      return;
    }
    const username = await proposeUsername(
      name,
      async (candidate) =>
        (await db.user.findFirst({ where: { username: candidate }, select: { id: true } })) !== null,
      "staff"
    );
    res.json({ username });
  })
);

// ---------------------------------------------------------------------------
// Roles and access
// ---------------------------------------------------------------------------

officeContentRouter.get(
  "/roles",
  requireCap("users.manage"),
  asyncHandler(async (req, res) => {
    const { db } = tenant(req);
    const [roles, grants, counts] = await Promise.all([
      db.role.findMany({ orderBy: { sortOrder: "asc" } }),
      db.roleCap.findMany(),
      db.user.groupBy({ by: ["role"], _count: { _all: true } }),
    ]);

    const byRole = new Map<string, string[]>();
    for (const g of grants) {
      byRole.set(g.roleKey, [...(byRole.get(g.roleKey) ?? []), g.cap]);
    }
    const users = new Map(counts.map((c) => [c.role, c._count._all]));

    res.json({
      roles: roles.map((r) => ({
        ...r,
        caps: byRole.get(r.roleKey) ?? [],
        userCount: users.get(r.roleKey) ?? 0,
        /** The Principal always holds everything; its grants are not editable. */
        isRoot: r.roleKey === ROOT_ROLE,
      })),
      allCaps: allCaps(),
    });
  })
);

officeContentRouter.post(
  "/roles",
  requireCap("users.manage"),
  validate(roleSchema),
  asyncHandler(async (req, res) => {
    const { db, firmId } = tenant(req);
    const data = req.body as { roleKey: string; label: string; description: string; sortOrder: number };

    const exists = await db.role.findFirst({ where: { roleKey: data.roleKey } });
    if (exists) throw new ApiError(400, "A role with that key already exists.");

    await db.role.create({ data: { ...data, firmId, isSystem: false } });
    res.status(201).json({ roleKey: data.roleKey });
  })
);

officeContentRouter.put(
  "/roles/:roleKey/caps",
  requireCap("users.manage"),
  validate(roleCapsSchema),
  asyncHandler(async (req, res) => {
    const { db, firmId } = tenant(req);
    const roleKey = String(req.params.roleKey ?? "").slice(0, 40);
    const { caps } = req.body as { caps: string[] };

    if (roleKey === ROOT_ROLE) {
      throw new ApiError(
        400,
        "The Principal always holds every capability; there is nothing to change."
      );
    }

    const role = await db.role.findFirst({ where: { roleKey } });
    if (!role) throw new ApiError(404, "No such role.");

    // Only capabilities the application actually defines — a typo would
    // otherwise sit in the table granting nothing and looking as if it did.
    const known = new Set(Object.keys(allCaps()));
    const wanted = [...new Set(caps)].filter((c) => known.has(c));

    await db.$transaction([
      db.roleCap.deleteMany({ where: { roleKey } }),
      db.roleCap.createMany({ data: wanted.map((cap) => ({ firmId, roleKey, cap })) }),
    ]);

    res.json({ roleKey, caps: wanted });
  })
);

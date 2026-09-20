import fs from "node:fs";
import path from "node:path";
import { Router } from "express";
import multer from "multer";
import { asyncHandler } from "../lib/async-handler.js";
import { generatePassword, portalUsernameTaken, proposeUsername } from "../lib/credentials.js";
import { hashPassword } from "../lib/password.js";
import { prisma } from "../lib/prisma.js";
import { generateStoredName, resolveStoredPath, uploadDirFor } from "../lib/uploads.js";
import {
  requireCap,
  requireNoPendingPasswordChange,
  requireStaff,
  staffSession,
} from "../middleware/auth.js";
import { ApiError } from "../middleware/errorHandler.js";
import { validate, validateQuery } from "../middleware/validate.js";
import {
  caseEditSchema,
  caseSchema,
  clientListSchema,
  clientSchema,
  documentMetaSchema,
  documentShareSchema,
  enquiryListSchema,
  enquiryReadSchema,
  feeSchema,
  hearingSchema,
  portalAccessSchema,
  type CaseInput,
  type ClientInput,
  type ClientListQuery,
  type EnquiryListQuery,
  type FeeInput,
  type HearingInput,
  type PortalAccessInput,
} from "../validation/office-records.schema.js";

/**
 * The records the office keeps: clients, cases, hearings, money, documents
 * and the enquiries that arrive from the website.
 *
 * Every route names the capability it needs. Reading and writing are
 * separate capabilities throughout — a colleague who may open a case file
 * is not thereby allowed to delete a fee from it.
 */
export const officeRecordsRouter = Router();

officeRecordsRouter.use(requireStaff, requireNoPendingPasswordChange);

function parseId(raw: string | undefined): number {
  const id = Number(raw);
  if (!Number.isInteger(id) || id < 1) throw new ApiError(400, "Not a valid id.");
  return id;
}

// ---------------------------------------------------------------------------
// Clients
// ---------------------------------------------------------------------------

officeRecordsRouter.get(
  "/clients",
  requireCap("clients.view"),
  validateQuery(clientListSchema),
  asyncHandler(async (_req, res) => {
    const { q, limit, offset } = res.locals.query as ClientListQuery;

    const where = q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { phone: { contains: q, mode: "insensitive" as const } },
            { email: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {};

    const [items, total] = await Promise.all([
      prisma.client.findMany({
        where,
        orderBy: { name: "asc" },
        take: limit,
        skip: offset,
        select: {
          id: true, name: true, phone: true, email: true,
          portalEnabled: true, portalUsername: true,
          _count: { select: { cases: true } },
        },
      }),
      prisma.client.count({ where }),
    ]);

    res.json({
      items: items.map((c) => ({
        id: c.id,
        name: c.name,
        phone: c.phone,
        email: c.email,
        portalEnabled: c.portalEnabled,
        portalUsername: c.portalUsername,
        caseCount: c._count.cases,
      })),
      total,
    });
  })
);

officeRecordsRouter.get(
  "/clients/:id",
  requireCap("clients.view"),
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);

    const client = await prisma.client.findUnique({
      where: { id },
      select: {
        id: true, name: true, phone: true, email: true, address: true, notes: true,
        portalEnabled: true, portalUsername: true, portalShowFees: true,
        portalMustChangePassword: true, createdAt: true,
        cases: {
          orderBy: [{ nextHearing: "asc" }, { id: "desc" }],
          select: { id: true, title: true, court: true, status: true, nextHearing: true },
        },
      },
    });
    if (!client) throw new ApiError(404, "No such client.");

    res.json(client);
  })
);

officeRecordsRouter.post(
  "/clients",
  requireCap("clients.edit"),
  validate(clientSchema),
  asyncHandler(async (req, res) => {
    const data = req.body as ClientInput;
    const client = await prisma.client.create({
      data,
      select: { id: true, name: true },
    });
    res.status(201).json(client);
  })
);

officeRecordsRouter.patch(
  "/clients/:id",
  requireCap("clients.edit"),
  validate(clientSchema),
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    const exists = await prisma.client.findUnique({ where: { id }, select: { id: true } });
    if (!exists) throw new ApiError(404, "No such client.");

    await prisma.client.update({ where: { id }, data: req.body as ClientInput });
    res.status(204).end();
  })
);

/**
 * Portal access for a client.
 *
 * The password is generated here, returned exactly once, and stored only as
 * a hash — the office cannot read it back, which is the point. Switching
 * the portal on for the first time always issues one; there is no state in
 * which a portal is enabled with no password set.
 */
officeRecordsRouter.post(
  "/clients/:id/portal",
  requireCap("clients.portal"),
  validate(portalAccessSchema),
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    const { enabled, showFees, resetPassword } = req.body as PortalAccessInput;

    const client = await prisma.client.findUnique({ where: { id } });
    if (!client) throw new ApiError(404, "No such client.");

    if (!enabled) {
      await prisma.client.update({
        where: { id },
        data: { portalEnabled: false, portalShowFees: showFees },
      });
      res.json({ enabled: false });
      return;
    }

    const needsPassword = resetPassword || !client.portalHash;
    const username =
      client.portalUsername ?? (await proposeUsername(client.name, portalUsernameTaken));
    const password = needsPassword ? generatePassword() : null;

    await prisma.client.update({
      where: { id },
      data: {
        portalEnabled: true,
        portalShowFees: showFees,
        portalUsername: username,
        ...(password
          ? { portalHash: await hashPassword(password), portalMustChangePassword: true }
          : {}),
      },
    });

    // `password` is null when access was merely re-enabled with the client's
    // own password left in place.
    res.json({ enabled: true, username, password });
  })
);

// ---------------------------------------------------------------------------
// Cases
// ---------------------------------------------------------------------------

officeRecordsRouter.post(
  "/cases",
  requireCap("cases.edit"),
  validate(caseSchema),
  asyncHandler(async (req, res) => {
    const data = req.body as CaseInput;

    const client = await prisma.client.findUnique({
      where: { id: data.clientId },
      select: { id: true },
    });
    if (!client) throw new ApiError(400, "That client does not exist.");

    const created = await prisma.case.create({
      data: { ...data, nextHearing: data.nextHearing || null },
      select: { id: true, title: true },
    });
    res.status(201).json(created);
  })
);

officeRecordsRouter.patch(
  "/cases/:id",
  requireCap("cases.edit"),
  validate(caseEditSchema),
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    const exists = await prisma.case.findUnique({ where: { id }, select: { id: true } });
    if (!exists) throw new ApiError(404, "No such case.");

    const data = req.body as Omit<CaseInput, "clientId">;
    await prisma.case.update({
      where: { id },
      data: { ...data, nextHearing: data.nextHearing || null },
    });
    res.status(204).end();
  })
);

// ---------------------------------------------------------------------------
// Hearings
// ---------------------------------------------------------------------------

officeRecordsRouter.post(
  "/cases/:id/hearings",
  requireCap("hearings.edit"),
  validate(hearingSchema),
  asyncHandler(async (req, res) => {
    const caseId = parseId(req.params.id);
    const { hearingDate, purpose, setAsNext } = req.body as HearingInput;

    const matter = await prisma.case.findUnique({
      where: { id: caseId },
      select: { id: true, nextHearing: true },
    });
    if (!matter) throw new ApiError(404, "No such case.");

    const created = await prisma.hearing.create({
      data: { caseId, hearingDate, purpose },
      select: { id: true, hearingDate: true, purpose: true, outcome: true },
    });

    // A hearing recorded for a past date is history; only a future one
    // should move the date the client and the cause list are told about.
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    if (setAsNext && hearingDate >= today) {
      await prisma.case.update({ where: { id: caseId }, data: { nextHearing: hearingDate } });
    }

    res.status(201).json(created);
  })
);

// ---------------------------------------------------------------------------
// Money
// ---------------------------------------------------------------------------

officeRecordsRouter.post(
  "/cases/:id/fees",
  requireCap("money.edit"),
  validate(feeSchema),
  asyncHandler(async (req, res) => {
    const caseId = parseId(req.params.id);
    const { kind, amount, entryDate, note } = req.body as FeeInput;

    const exists = await prisma.case.findUnique({ where: { id: caseId }, select: { id: true } });
    if (!exists) throw new ApiError(404, "No such case.");

    const fee = await prisma.fee.create({
      data: { caseId, kind, amount, entryDate, note },
      select: { id: true, kind: true, amount: true, entryDate: true, note: true },
    });

    res.status(201).json({ ...fee, amount: Number(fee.amount) });
  })
);

officeRecordsRouter.delete(
  "/fees/:id",
  requireCap("money.edit"),
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    const removed = await prisma.fee.deleteMany({ where: { id } });
    if (removed.count === 0) throw new ApiError(404, "No such entry.");
    res.status(204).end();
  })
);

// ---------------------------------------------------------------------------
// Documents
// ---------------------------------------------------------------------------

/**
 * Case documents. As with voice notes, the stored name is generated and the
 * name the file arrived with is kept only as a label — a name from outside
 * is data, never a path.
 */
const documentUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDirFor("document")),
    filename: (_req, file, cb) => {
      // The extension is taken from the original name but sanitised to a
      // short alphanumeric run, so nothing from outside reaches the path.
      const raw = path.extname(file.originalname).toLowerCase();
      const ext = /^\.[a-z0-9]{1,8}$/.test(raw) ? raw : "";
      cb(null, generateStoredName(ext));
    },
  }),
  limits: { fileSize: 25 * 1024 * 1024, files: 1 },
});

officeRecordsRouter.post(
  "/cases/:id/documents",
  requireCap("documents.edit"),
  documentUpload.single("file"),
  validate(documentMetaSchema),
  asyncHandler(async (req, res) => {
    const caseId = parseId(req.params.id);
    const file = req.file;
    if (!file) throw new ApiError(400, "No file was sent.");

    const { title, clientVisible } = req.body as { title: string; clientVisible: boolean };

    const exists = await prisma.case.findUnique({ where: { id: caseId }, select: { id: true } });
    if (!exists) {
      await fs.promises.unlink(file.path).catch(() => undefined);
      throw new ApiError(404, "No such case.");
    }

    const document = await prisma.document.create({
      data: {
        caseId,
        title,
        storedName: file.filename,
        origName: file.originalname.slice(0, 300),
        sizeBytes: file.size,
        clientVisible,
      },
      select: { id: true, title: true, origName: true, sizeBytes: true, clientVisible: true },
    });

    res.status(201).json(document);
  })
);

/** Sharing a document with the client, or taking it back. */
officeRecordsRouter.patch(
  "/documents/:id",
  requireCap("documents.edit"),
  validate(documentShareSchema),
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    const exists = await prisma.document.findUnique({ where: { id }, select: { id: true } });
    if (!exists) throw new ApiError(404, "No such document.");

    await prisma.document.update({
      where: { id },
      data: { clientVisible: (req.body as { clientVisible: boolean }).clientVisible },
    });
    res.status(204).end();
  })
);

/** Staff may open any document on a case they can see, shared or not. */
officeRecordsRouter.get(
  "/documents/:id",
  requireCap("cases.view"),
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);

    const document = await prisma.document.findUnique({
      where: { id },
      select: { storedName: true, origName: true, title: true },
    });
    if (!document?.storedName) throw new ApiError(404, "No such document.");

    const filePath = resolveStoredPath("document", document.storedName);
    if (!filePath || !fs.existsSync(filePath)) throw new ApiError(404, "No such document.");

    res.download(filePath, document.origName || document.title);
  })
);

// ---------------------------------------------------------------------------
// Enquiries from the website
// ---------------------------------------------------------------------------

officeRecordsRouter.get(
  "/enquiries",
  requireCap("enquiries.view"),
  validateQuery(enquiryListSchema),
  asyncHandler(async (_req, res) => {
    const { unreadOnly, limit } = res.locals.query as EnquiryListQuery;

    const [items, unread] = await Promise.all([
      prisma.enquiry.findMany({
        where: unreadOnly ? { read: false } : {},
        orderBy: { createdAt: "desc" },
        take: limit,
        select: {
          id: true, name: true, phone: true, email: true,
          subject: true, message: true, read: true, createdAt: true,
        },
      }),
      prisma.enquiry.count({ where: { read: false } }),
    ]);

    res.json({ items, unread });
  })
);

officeRecordsRouter.patch(
  "/enquiries/:id",
  requireCap("enquiries.view"),
  validate(enquiryReadSchema),
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    const updated = await prisma.enquiry.updateMany({
      where: { id },
      data: { read: (req.body as { read: boolean }).read },
    });
    if (updated.count === 0) throw new ApiError(404, "No such enquiry.");
    res.status(204).end();
  })
);

/** Who is signed in — used by screens that show "recorded by". */
officeRecordsRouter.get(
  "/whoami",
  asyncHandler(async (req, res) => {
    res.json({ username: staffSession(req).username });
  })
);

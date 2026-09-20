import fs from "node:fs";
import { Router } from "express";
import multer from "multer";
import { asyncHandler } from "../lib/async-handler.js";
import {
  audioExtension,
  contentTypeFor,
  generateStoredName,
  resolveStoredPath,
  uploadDirFor,
} from "../lib/uploads.js";
import { env } from "../config/env.js";
import { forgetDevice, notify, registerDevice, staffWithCapability } from "../lib/push.js";
import {
  clientSession,
  requireClient,
  requireNoPendingPortalPasswordChange,
  tenant,
} from "../middleware/auth.js";
import { ApiError } from "../middleware/errorHandler.js";
import { validate } from "../middleware/validate.js";
import {
  forgetDeviceSchema,
  registerDeviceSchema,
  type ForgetDeviceInput,
  type RegisterDeviceInput,
} from "../validation/device.schema.js";
import { caseMessageSchema, type CaseMessageInput } from "../validation/portal.schema.js";
import type { Request } from "express";

/**
 * What a client can see of their own matters.
 *
 * Three rules run through every route here:
 *
 *  1. **Ownership is part of the query, never a check afterwards.** Every
 *     lookup carries `clientId` from the token in its WHERE clause, so there
 *     is no path that fetches a row first and remembers to compare second.
 *  2. **A case that is not yours is 404, not 403.** A client should not be
 *     able to learn that case 812 exists by the shape of the refusal.
 *  3. **Columns are listed, never spread.** `Case.notes` and
 *     `Hearing.outcome` are the office's working notes and must not reach a
 *     client; a `select` that names its columns cannot leak a column added
 *     later either.
 */
export const portalCasesRouter = Router();

// Signed in, and past the password the office issued.
portalCasesRouter.use(requireClient, requireNoPendingPortalPasswordChange);

function parseId(raw: string | undefined): number {
  const id = Number(raw);
  if (!Number.isInteger(id) || id < 1) throw new ApiError(400, "Not a valid id.");
  return id;
}

/**
 * Tells the staff who answer clients that one is waiting.
 *
 * Deliberately says nothing about the case or the client: this is rendered
 * on a lock screen, and whose matter it is, is not for a passer-by.
 */
async function notifyOfficeOfClientMessage(firmId: number, caseId: number): Promise<void> {
  const recipients = await staffWithCapability(firmId, "messages.reply");
  await notify(firmId, "staff", recipients, {
    title: "A client is waiting",
    body: "A question has come in through the portal.",
    path: `/files/${caseId}`,
  });
}

/** The case, only if it belongs to the signed-in client. */
async function ownedCase(req: Request, caseId: number) {
  const { db } = tenant(req);
  const found = await db.case.findFirst({
    where: { id: caseId, clientId: clientSession(req).sub },
    select: { id: true, title: true, court: true, caseType: true, status: true, nextHearing: true, createdAt: true },
  });
  if (!found) throw new ApiError(404, "No such case.");
  return found;
}

portalCasesRouter.get(
  "/cases",
  asyncHandler(async (req, res) => {
    const { db } = tenant(req);
    const cases = await db.case.findMany({
      where: { clientId: clientSession(req).sub },
      orderBy: [{ nextHearing: "asc" }, { id: "desc" }],
      select: {
        id: true, title: true, court: true, caseType: true, status: true, nextHearing: true,
        _count: { select: { messages: true, documents: { where: { clientVisible: true } } } },
      },
    });

    res.json({
      items: cases.map((c) => ({
        id: c.id,
        title: c.title,
        court: c.court,
        caseType: c.caseType,
        status: c.status,
        nextHearing: c.nextHearing,
        messageCount: c._count.messages,
        documentCount: c._count.documents,
      })),
    });
  })
);

portalCasesRouter.get(
  "/cases/:id",
  asyncHandler(async (req, res) => {
    const { db } = tenant(req);
    const caseId = parseId(req.params.id);
    const found = await ownedCase(req, caseId);

    const [hearings, updates, documents, client] = await Promise.all([
      db.hearing.findMany({
        where: { caseId },
        orderBy: { hearingDate: "desc" },
        // `outcome` is the office's own note on what happened and is not shared.
        select: { id: true, hearingDate: true, purpose: true },
      }),
      db.caseUpdate.findMany({
        where: { caseId },
        orderBy: [{ updateDate: "desc" }, { id: "desc" }],
        select: { id: true, updateDate: true, message: true, author: true },
      }),
      db.document.findMany({
        // Private unless the office deliberately shared it.
        where: { caseId, clientVisible: true },
        orderBy: { createdAt: "desc" },
        select: { id: true, title: true, origName: true, sizeBytes: true, createdAt: true },
      }),
      db.client.findUnique({
        where: { id: clientSession(req).sub },
        select: { portalShowFees: true },
      }),
    ]);

    // Money is shown only where the office has switched it on for this client.
    const showFees = client?.portalShowFees ?? false;
    const fees = showFees
      ? await db.fee.findMany({
          where: { caseId },
          orderBy: { entryDate: "desc" },
          select: { id: true, kind: true, amount: true, entryDate: true, note: true },
        })
      : [];

    const total = (kind: string) =>
      fees.filter((f) => f.kind === kind).reduce((sum, f) => sum + Number(f.amount), 0);

    res.json({
      ...found,
      hearings,
      updates,
      documents,
      fees: showFees
        ? {
            shown: true,
            agreed: total("agreed"),
            received: total("received"),
            entries: fees.map((f) => ({ ...f, amount: Number(f.amount) })),
          }
        : { shown: false },
    });
  })
);

portalCasesRouter.get(
  "/cases/:id/messages",
  asyncHandler(async (req, res) => {
    const { db } = tenant(req);
    const caseId = parseId(req.params.id);
    await ownedCase(req, caseId);

    const messages = await db.caseMessage.findMany({
      where: { caseId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true, authorType: true, authorName: true, body: true,
        storedName: true, answered: true, createdAt: true,
      },
    });

    res.json({
      items: messages.map((m) => ({
        id: m.id,
        authorType: m.authorType,
        authorName: m.authorName,
        body: m.body,
        // The stored name is an internal filename; the client gets a flag and
        // fetches the audio by message id.
        hasVoiceNote: m.storedName !== "",
        answered: m.answered,
        createdAt: m.createdAt,
      })),
    });
  })
);

portalCasesRouter.post(
  "/cases/:id/messages",
  validate(caseMessageSchema),
  asyncHandler(async (req, res) => {
    const { db, firmId } = tenant(req);
    const caseId = parseId(req.params.id);
    await ownedCase(req, caseId);
    const { body } = req.body as CaseMessageInput;

    const client = await db.client.findUnique({
      where: { id: clientSession(req).sub },
      select: { name: true },
    });

    const message = await db.caseMessage.create({
      data: { firmId, caseId, authorType: "client", authorName: client?.name ?? "", body },
      select: { id: true, authorType: true, authorName: true, body: true, answered: true, createdAt: true },
    });

    await notifyOfficeOfClientMessage(firmId, caseId);

    res.status(201).json({ ...message, hasVoiceNote: false });
  })
);

/**
 * Voice notes. A client walking out of court can say in twenty seconds what
 * they would not sit down and type, which is the reason the app is native at
 * all. Held in memory only as far as the size limit allows, then written
 * under a generated name.
 */
const voiceUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDirFor("voice")),
    filename: (_req, file, cb) => {
      const ext = audioExtension(file.mimetype);
      // Rejected properly by fileFilter; this is only the type-level branch.
      cb(null, generateStoredName(ext ?? ".bin"));
    },
  }),
  limits: { fileSize: env.voiceNoteMaxBytes, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!audioExtension(file.mimetype)) {
      cb(new ApiError(400, "That is not an audio recording."));
      return;
    }
    cb(null, true);
  },
});

portalCasesRouter.post(
  "/cases/:id/messages/voice",
  voiceUpload.single("audio"),
  asyncHandler(async (req, res) => {
    const { db, firmId } = tenant(req);
    const caseId = parseId(req.params.id);
    const file = req.file;
    if (!file) throw new ApiError(400, "No recording was sent.");

    // Ownership is checked after multer has taken the upload, so a file
    // written for a case that is not the client's is deleted again rather
    // than left on disk.
    try {
      await ownedCase(req, caseId);
    } catch (err) {
      await fs.promises.unlink(file.path).catch(() => undefined);
      throw err;
    }

    const client = await db.client.findUnique({
      where: { id: clientSession(req).sub },
      select: { name: true },
    });

    const message = await db.caseMessage.create({
      data: {
        firmId,
        caseId,
        authorType: "client",
        authorName: client?.name ?? "",
        body: typeof req.body?.body === "string" ? req.body.body.slice(0, 4000) : "",
        storedName: file.filename,
        origName: "voice-note",
      },
      select: { id: true, authorType: true, authorName: true, body: true, answered: true, createdAt: true },
    });

    await notifyOfficeOfClientMessage(firmId, caseId);

    res.status(201).json({ ...message, hasVoiceNote: true });
  })
);

portalCasesRouter.get(
  "/messages/:id/audio",
  asyncHandler(async (req, res) => {
    const { db } = tenant(req);
    const messageId = parseId(req.params.id);

    const message = await db.caseMessage.findFirst({
      where: { id: messageId, case: { clientId: clientSession(req).sub } },
      select: { storedName: true },
    });
    if (!message?.storedName) throw new ApiError(404, "No such recording.");

    const filePath = resolveStoredPath("voice", message.storedName);
    if (!filePath || !fs.existsSync(filePath)) throw new ApiError(404, "No such recording.");

    res.type(contentTypeFor(message.storedName));
    res.sendFile(filePath);
  })
);

portalCasesRouter.get(
  "/documents/:id",
  asyncHandler(async (req, res) => {
    const { db } = tenant(req);
    const documentId = parseId(req.params.id);

    const document = await db.document.findFirst({
      where: {
        id: documentId,
        clientVisible: true,
        case: { clientId: clientSession(req).sub },
      },
      select: { storedName: true, origName: true, title: true },
    });
    if (!document?.storedName) throw new ApiError(404, "No such document.");

    const filePath = resolveStoredPath("document", document.storedName);
    if (!filePath || !fs.existsSync(filePath)) throw new ApiError(404, "No such document.");

    res.download(filePath, document.origName || document.title);
  })
);

/**
 * This handset would like to be told when the office answers.
 *
 * Registering binds the token to whoever is signed in now, so a phone that
 * changes hands stops receiving the previous client's notifications the
 * moment somebody else signs in on it.
 */
portalCasesRouter.post(
  "/devices",
  validate(registerDeviceSchema),
  asyncHandler(async (req, res) => {
    const { token, platform } = req.body as RegisterDeviceInput;
    await registerDevice(tenant(req).firmId, "client", clientSession(req).sub, token, platform);
    res.status(204).end();
  })
);

/** Signing out takes the device off the list. */
portalCasesRouter.delete(
  "/devices",
  validate(forgetDeviceSchema),
  asyncHandler(async (req, res) => {
    await forgetDevice((req.body as ForgetDeviceInput).token);
    res.status(204).end();
  })
);

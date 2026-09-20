import { Router } from "express";
import { asyncHandler } from "../lib/async-handler.js";
import { ROOT_ROLE } from "../lib/capabilities.js";
import { forgetDevice, notify, registerDevice } from "../lib/push.js";
import {
  requireCap,
  requireNoPendingPasswordChange,
  requireStaff,
  staffSession,
  tenant,
} from "../middleware/auth.js";
import { ApiError } from "../middleware/errorHandler.js";
import { validate, validateQuery } from "../middleware/validate.js";
import {
  forgetDeviceSchema,
  registerDeviceSchema,
  type ForgetDeviceInput,
  type RegisterDeviceInput,
} from "../validation/device.schema.js";
import {
  caseListSchema,
  caseUpdateSchema,
  diarySchema,
  hearingOutcomeSchema,
  officeReplySchema,
  type CaseListQuery,
  type CaseUpdateInput,
  type DiaryQuery,
  type HearingOutcomeInput,
  type OfficeReplyInput,
} from "../validation/office.schema.js";
import type { Request } from "express";

/**
 * The chamber's own view: every case, not just one client's, and the
 * office's working notes along with it.
 *
 * The boundary here is the opposite of the portal's. A client is limited by
 * *whose* case it is; staff are limited by *what they may do* — the
 * capabilities their role holds. Money is the clearest example: a colleague
 * can work a case in full and still never see a rupee of it.
 *
 * These routes serve the phone today and will serve the web office in
 * Phase 5. They are not mobile-specific.
 */
export const officeRouter = Router();

officeRouter.use(requireStaff, requireNoPendingPasswordChange);

function parseId(raw: string | undefined): number {
  const id = Number(raw);
  if (!Number.isInteger(id) || id < 1) throw new ApiError(400, "Not a valid id.");
  return id;
}

/** Whether this staff member holds a capability — for deciding what to
 *  *include* in a response, where requireCap would be too blunt. */
async function holdsCap(req: Request, cap: string): Promise<boolean> {
  const session = staffSession(req);
  if (session.role === ROOT_ROLE) return true;
  const { db, firmId } = tenant(req);
  const grant = await db.roleCap.findUnique({
    where: { firmId_roleKey_cap: { firmId, roleKey: session.role, cap } },
  });
  return grant !== null;
}

/**
 * Tells a case's client that something has happened.
 *
 * The body never names the matter. A client's phone on a desk should not
 * announce what they are litigating to the room.
 */
async function notifyClientOfCase(
  req: Request,
  caseId: number,
  message: { title: string; body: string }
): Promise<void> {
  const { db, firmId } = tenant(req);
  const found = await db.case.findUnique({
    where: { id: caseId },
    select: { clientId: true },
  });
  if (!found) return;

  await notify(firmId, "client", [found.clientId], { ...message, path: `/cases/${caseId}` });
}

function startOfToday(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/**
 * The cause list. What the phone is actually for: standing in a corridor at
 * half past eight, wanting to know what is listed and where.
 */
officeRouter.get(
  "/diary",
  requireCap("cases.view"),
  validateQuery(diarySchema),
  asyncHandler(async (req, res) => {
    const { db } = tenant(req);
    const { days } = res.locals.query as DiaryQuery;

    const from = startOfToday();
    const to = new Date(from);
    to.setUTCDate(to.getUTCDate() + days);

    const hearings = await db.hearing.findMany({
      where: { hearingDate: { gte: from, lt: to } },
      orderBy: [{ hearingDate: "asc" }, { id: "asc" }],
      select: {
        id: true,
        hearingDate: true,
        purpose: true,
        outcome: true,
        case: {
          select: {
            id: true,
            title: true,
            court: true,
            status: true,
            client: { select: { id: true, name: true, phone: true } },
          },
        },
      },
    });

    // Grouped by day, because that is how a cause list is read.
    const byDate = new Map<string, typeof hearings>();
    for (const h of hearings) {
      const key = h.hearingDate.toISOString().slice(0, 10);
      const bucket = byDate.get(key);
      if (bucket) bucket.push(h);
      else byDate.set(key, [h]);
    }

    res.json({
      days: [...byDate.entries()].map(([date, items]) => ({
        date,
        hearings: items.map((h) => ({
          id: h.id,
          purpose: h.purpose,
          // An outcome already recorded is how staff see what is still to do.
          recorded: h.outcome !== "",
          caseId: h.case.id,
          caseTitle: h.case.title,
          court: h.case.court,
          status: h.case.status,
          clientName: h.case.client.name,
          clientPhone: h.case.client.phone,
        })),
      })),
    });
  })
);

officeRouter.get(
  "/cases",
  requireCap("cases.view"),
  validateQuery(caseListSchema),
  asyncHandler(async (req, res) => {
    const { db } = tenant(req);
    const { q, status, limit, offset } = res.locals.query as CaseListQuery;

    const where = {
      ...(status ? { status } : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" as const } },
              { court: { contains: q, mode: "insensitive" as const } },
              { caseType: { contains: q, mode: "insensitive" as const } },
              { client: { name: { contains: q, mode: "insensitive" as const } } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      db.case.findMany({
        where,
        orderBy: [{ nextHearing: "asc" }, { id: "desc" }],
        take: limit,
        skip: offset,
        select: {
          id: true, title: true, court: true, caseType: true, status: true, nextHearing: true,
          client: { select: { id: true, name: true } },
        },
      }),
      db.case.count({ where }),
    ]);

    res.json({ items, total, limit, offset });
  })
);

/** The whole file, working notes included — this is the chamber's own view. */
officeRouter.get(
  "/cases/:id",
  requireCap("cases.view"),
  asyncHandler(async (req, res) => {
    const { db } = tenant(req);
    const caseId = parseId(req.params.id);

    const found = await db.case.findUnique({
      where: { id: caseId },
      select: {
        id: true, title: true, court: true, caseType: true, status: true,
        nextHearing: true, notes: true, createdAt: true,
        client: { select: { id: true, name: true, phone: true, email: true, portalEnabled: true } },
        hearings: {
          orderBy: { hearingDate: "desc" },
          select: { id: true, hearingDate: true, purpose: true, outcome: true },
        },
        updates: {
          orderBy: [{ updateDate: "desc" }, { id: "desc" }],
          select: { id: true, updateDate: true, message: true, author: true },
        },
        documents: {
          orderBy: { createdAt: "desc" },
          select: { id: true, title: true, origName: true, sizeBytes: true, clientVisible: true, createdAt: true },
        },
        messages: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true, authorType: true, authorName: true, body: true,
            storedName: true, answered: true, createdAt: true,
          },
        },
      },
    });
    if (!found) throw new ApiError(404, "No such case.");

    // Money is its own capability: a colleague works the case, the clerk
    // and the Principal see what it is worth.
    const showMoney = await holdsCap(req, "money.view");
    const fees = showMoney
      ? await db.fee.findMany({
          where: { caseId },
          orderBy: { entryDate: "desc" },
          select: { id: true, kind: true, amount: true, entryDate: true, note: true },
        })
      : [];

    const total = (kind: string) =>
      fees.filter((f) => f.kind === kind).reduce((sum, f) => sum + Number(f.amount), 0);

    const { messages, ...rest } = found;

    res.json({
      ...rest,
      messages: messages.map((m) => ({
        id: m.id,
        authorType: m.authorType,
        authorName: m.authorName,
        body: m.body,
        hasVoiceNote: m.storedName !== "",
        answered: m.answered,
        createdAt: m.createdAt,
      })),
      fees: showMoney
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

/** Client questions nobody has answered yet — the list that should be empty. */
officeRouter.get(
  "/messages/unanswered",
  requireCap("cases.view"),
  asyncHandler(async (req, res) => {
    const { db } = tenant(req);
    const messages = await db.caseMessage.findMany({
      where: { authorType: "client", answered: false },
      orderBy: { createdAt: "asc" },
      take: 50,
      select: {
        id: true, body: true, storedName: true, createdAt: true, authorName: true,
        case: { select: { id: true, title: true } },
      },
    });

    res.json({
      items: messages.map((m) => ({
        id: m.id,
        body: m.body,
        hasVoiceNote: m.storedName !== "",
        createdAt: m.createdAt,
        clientName: m.authorName,
        caseId: m.case.id,
        caseTitle: m.case.title,
      })),
    });
  })
);

/** A progress note. The client sees this, so it is written for them. */
officeRouter.post(
  "/cases/:id/updates",
  requireCap("updates.edit"),
  validate(caseUpdateSchema),
  asyncHandler(async (req, res) => {
    const { db, firmId } = tenant(req);
    const caseId = parseId(req.params.id);
    const { message, updateDate } = req.body as CaseUpdateInput;

    const exists = await db.case.findUnique({ where: { id: caseId }, select: { id: true } });
    if (!exists) throw new ApiError(404, "No such case.");

    const created = await db.caseUpdate.create({
      data: { firmId, caseId, message, updateDate, author: staffSession(req).username },
      select: { id: true, updateDate: true, message: true, author: true },
    });

    await notifyClientOfCase(req, caseId, {
      title: "Your case has been updated",
      body: "The chamber has posted something new on your matter.",
    });

    res.status(201).json(created);
  })
);

/** What happened at a hearing. Internal: the client never sees this. */
officeRouter.post(
  "/hearings/:id/outcome",
  requireCap("hearings.edit"),
  validate(hearingOutcomeSchema),
  asyncHandler(async (req, res) => {
    const { db } = tenant(req);
    const hearingId = parseId(req.params.id);
    const { outcome } = req.body as HearingOutcomeInput;

    const exists = await db.hearing.findUnique({
      where: { id: hearingId },
      select: { id: true },
    });
    if (!exists) throw new ApiError(404, "No such hearing.");

    const updated = await db.hearing.update({
      where: { id: hearingId },
      data: { outcome },
      select: { id: true, hearingDate: true, purpose: true, outcome: true },
    });

    res.json(updated);
  })
);

/** Answering a client. Marks their outstanding questions on this case answered. */
officeRouter.post(
  "/cases/:id/messages",
  requireCap("messages.reply"),
  validate(officeReplySchema),
  asyncHandler(async (req, res) => {
    const { db, firmId } = tenant(req);
    const caseId = parseId(req.params.id);
    const { body } = req.body as OfficeReplyInput;

    const exists = await db.case.findUnique({ where: { id: caseId }, select: { id: true } });
    if (!exists) throw new ApiError(404, "No such case.");

    const session = staffSession(req);
    const user = await db.user.findUnique({
      where: { id: session.sub },
      select: { fullName: true },
    });

    const [created] = await db.$transaction([
      db.caseMessage.create({
        data: {
          firmId,
          caseId,
          authorType: "office",
          authorName: user?.fullName || session.username,
          body,
          answered: true,
        },
        select: { id: true, authorType: true, authorName: true, body: true, answered: true, createdAt: true },
      }),
      db.caseMessage.updateMany({
        where: { caseId, authorType: "client", answered: false },
        data: { answered: true },
      }),
    ]);

    await notifyClientOfCase(req, caseId, {
      title: "The chamber has replied",
      body: "There is an answer waiting for you.",
    });

    res.status(201).json({ ...created, hasVoiceNote: false });
  })
);

/** A chamber handset asking to be told when a client writes in. */
officeRouter.post(
  "/devices",
  validate(registerDeviceSchema),
  asyncHandler(async (req, res) => {
    const { token, platform } = req.body as RegisterDeviceInput;
    await registerDevice(tenant(req).firmId, "staff", staffSession(req).sub, token, platform);
    res.status(204).end();
  })
);

officeRouter.delete(
  "/devices",
  validate(forgetDeviceSchema),
  asyncHandler(async (req, res) => {
    await forgetDevice((req.body as ForgetDeviceInput).token);
    res.status(204).end();
  })
);

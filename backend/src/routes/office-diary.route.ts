import { Router } from "express";
import { asyncHandler } from "../lib/async-handler.js";
import { signStatementGrant } from "../lib/jwt.js";
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
  communicationListSchema,
  communicationSchema,
  expenseSchema,
  feeReminderSchema,
  ledgerQuerySchema,
  officialFeeSchema,
  recoveredSchema,
  type CommunicationInput,
  type CommunicationListQuery,
  type ExpenseInput,
  type FeeReminderInput,
  type LedgerQuery,
  type OfficialFeeInput,
  type RecoveredInput,
} from "../validation/office-diary.schema.js";

/**
 * The communications diary and the two money ledgers that are not tied to a
 * single case file: official fees paid out, and what the office spends.
 *
 * Professional fees live on the case they belong to; this router only reads
 * them back across every case, for the question "what is outstanding".
 */
export const officeDiaryRouter = Router();

officeDiaryRouter.use(requireStaff, requireNoPendingPasswordChange);

function parseId(raw: string | undefined): number {
  const id = Number(raw);
  if (!Number.isInteger(id) || id < 1) throw new ApiError(400, "Not a valid id.");
  return id;
}

/** A date range as Prisma wants it, or nothing when neither end is given. */
function between(from: Date | null, to: Date | null) {
  if (!from && !to) return {};
  return { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) };
}

// ---------------------------------------------------------------------------
// Communications
// ---------------------------------------------------------------------------

officeDiaryRouter.get(
  "/communications",
  requireCap("comms.view"),
  validateQuery(communicationListSchema),
  asyncHandler(async (req, res) => {
    const { db } = tenant(req);
    const { q, dueOnly, limit } = res.locals.query as CommunicationListQuery;

    const today = new Date();
    today.setUTCHours(23, 59, 59, 999);

    const where = {
      ...(q
        ? {
            OR: [
              { summary: { contains: q, mode: "insensitive" as const } },
              { subject: { contains: q, mode: "insensitive" as const } },
              { personName: { contains: q, mode: "insensitive" as const } },
              { personNumber: { contains: q, mode: "insensitive" as const } },
              { client: { name: { contains: q, mode: "insensitive" as const } } },
              { case: { title: { contains: q, mode: "insensitive" as const } } },
            ],
          }
        : {}),
      // "Due" means a follow-up date that has arrived or passed.
      ...(dueOnly ? { followUpDue: { not: null, lte: today } } : {}),
    };

    const [items, due] = await Promise.all([
      db.communication.findMany({
        where,
        orderBy: [{ commDate: "desc" }, { id: "desc" }],
        take: limit,
        select: {
          id: true, method: true, direction: true, summary: true, subject: true,
          personName: true, personNumber: true, personRole: true,
          commDate: true, commTime: true, followUpDue: true, createdAt: true,
          client: { select: { id: true, name: true } },
          case: { select: { id: true, title: true, caseNo: true } },
        },
      }),
      db.communication.count({ where: { followUpDue: { not: null, lte: today } } }),
    ]);

    res.json({ items, due });
  })
);

officeDiaryRouter.post(
  "/communications",
  requireCap("comms.edit"),
  validate(communicationSchema),
  asyncHandler(async (req, res) => {
    const { db, firmId } = tenant(req);
    const data = req.body as CommunicationInput;

    if (data.clientId !== null) {
      const client = await db.client.findUnique({
        where: { id: data.clientId },
        select: { id: true },
      });
      if (!client) throw new ApiError(400, "That client does not exist.");
    }
    if (data.caseId !== null) {
      const matter = await db.case.findUnique({
        where: { id: data.caseId },
        select: { id: true },
      });
      if (!matter) throw new ApiError(400, "That matter is not in this chamber's records.");
    }

    const created = await db.communication.create({
      data: { ...data, firmId, followUpDue: data.followUpDue || null },
      select: { id: true },
    });
    res.status(201).json(created);
  })
);

officeDiaryRouter.patch(
  "/communications/:id",
  requireCap("comms.edit"),
  validate(communicationSchema),
  asyncHandler(async (req, res) => {
    const { db } = tenant(req);
    const id = parseId(req.params.id);
    const data = req.body as CommunicationInput;

    const updated = await db.communication.updateMany({
      where: { id },
      data: { ...data, followUpDue: data.followUpDue || null },
    });
    if (updated.count === 0) throw new ApiError(404, "No such entry.");
    res.status(204).end();
  })
);

officeDiaryRouter.delete(
  "/communications/:id",
  requireCap("comms.edit"),
  asyncHandler(async (req, res) => {
    const { db } = tenant(req);
    const id = parseId(req.params.id);
    const removed = await db.communication.deleteMany({ where: { id } });
    if (removed.count === 0) throw new ApiError(404, "No such entry.");
    res.status(204).end();
  })
);

// ---------------------------------------------------------------------------
// Professional fees, read across every case
// ---------------------------------------------------------------------------

officeDiaryRouter.get(
  "/fees",
  requireCap("money.view"),
  validateQuery(ledgerQuerySchema),
  asyncHandler(async (req, res) => {
    const { db } = tenant(req);
    const { from, to, limit } = res.locals.query as LedgerQuery;
    const range = between(from, to);

    const items = await db.fee.findMany({
      where: Object.keys(range).length ? { entryDate: range } : {},
      orderBy: [{ entryDate: "desc" }, { id: "desc" }],
      take: limit,
      select: {
        id: true, kind: true, amount: true, entryDate: true, note: true,
        case: { select: { id: true, title: true, client: { select: { name: true } } } },
      },
    });

    // Totals are over every matching entry, not only the page shown.
    const totals = await db.fee.groupBy({
      by: ["kind"],
      where: Object.keys(range).length ? { entryDate: range } : {},
      _sum: { amount: true },
    });

    const total = (kind: string) =>
      Number(totals.find((t) => t.kind === kind)?._sum.amount ?? 0);

    res.json({
      items: items.map((f) => ({
        id: f.id,
        kind: f.kind,
        amount: Number(f.amount),
        entryDate: f.entryDate,
        note: f.note,
        caseId: f.case.id,
        caseTitle: f.case.title,
        clientName: f.case.client.name,
      })),
      agreed: total("agreed"),
      received: total("received"),
    });
  })
);

// ---------------------------------------------------------------------------
// Official fees
// ---------------------------------------------------------------------------

officeDiaryRouter.get(
  "/official-fees",
  requireCap("money.view"),
  validateQuery(ledgerQuerySchema),
  asyncHandler(async (req, res) => {
    const { db } = tenant(req);
    const { from, to, limit } = res.locals.query as LedgerQuery;
    const range = between(from, to);
    const where = Object.keys(range).length ? { entryDate: range } : {};

    const [rows, sum, outstanding] = await Promise.all([
      db.officialFee.findMany({
        where,
        orderBy: [{ entryDate: "desc" }, { id: "desc" }],
        take: limit,
      }),
      db.officialFee.aggregate({ where, _sum: { amount: true } }),
      db.officialFee.aggregate({
        where: { ...where, paidBy: "office", recoveredAt: null },
        _sum: { amount: true },
      }),
    ]);

    // OfficialFee has no relation to Case in the schema, so the titles are
    // fetched separately rather than joined.
    const caseIds = [...new Set(rows.map((r) => r.caseId).filter((id): id is number => id !== null))];
    const cases = caseIds.length
      ? await db.case.findMany({ where: { id: { in: caseIds } }, select: { id: true, title: true } })
      : [];
    const titles = new Map(cases.map((c) => [c.id, c.title]));

    res.json({
      items: rows.map((r) => ({
        id: r.id,
        caseId: r.caseId,
        caseTitle: r.caseId ? (titles.get(r.caseId) ?? null) : null,
        kind: r.kind,
        description: r.description,
        amount: Number(r.amount),
        entryDate: r.entryDate,
        receiptNo: r.receiptNo,
        paidBy: r.paidBy,
        recoveredAt: r.recoveredAt,
        note: r.note,
      })),
      total: Number(sum._sum.amount ?? 0),
      /**
       * What the chamber has laid out and not had back. The question this
       * ledger exists to answer: a court fee is not the chamber's expense,
       * it is the chamber's money sitting in a client's matter, and a total
       * that does not separate the two tells an advocate nothing.
       */
      outstanding: Number(outstanding._sum.amount ?? 0),
    });
  })
);

officeDiaryRouter.post(
  "/official-fees",
  requireCap("money.edit"),
  validate(officialFeeSchema),
  asyncHandler(async (req, res) => {
    const { db, firmId } = tenant(req);
    const data = req.body as OfficialFeeInput;

    if (data.caseId !== null) {
      const matter = await db.case.findUnique({
        where: { id: data.caseId },
        select: { id: true },
      });
      if (!matter) throw new ApiError(400, "That case does not exist.");
    }

    const created = await db.officialFee.create({
      data: { ...data, firmId, createdBy: staffSession(req).username },
      select: { id: true },
    });
    res.status(201).json(created);
  })
);

/**
 * Marking what the chamber advanced as having come back — or as not, after
 * all, when it was ticked in error.
 */
officeDiaryRouter.post(
  "/official-fees/:id/recovered",
  requireCap("money.edit"),
  validate(recoveredSchema),
  asyncHandler(async (req, res) => {
    const { db } = tenant(req);
    const id = parseId(req.params.id);
    const { recovered } = req.body as RecoveredInput;

    const existing = await db.officialFee.findUnique({ where: { id } });
    if (!existing) throw new ApiError(404, "No such entry.");

    await db.officialFee.update({
      where: { id },
      data: { recoveredAt: recovered ? new Date() : null },
    });
    res.status(204).end();
  })
);

officeDiaryRouter.delete(
  "/official-fees/:id",
  requireCap("money.edit"),
  asyncHandler(async (req, res) => {
    const { db } = tenant(req);
    const id = parseId(req.params.id);
    const removed = await db.officialFee.deleteMany({ where: { id } });
    if (removed.count === 0) throw new ApiError(404, "No such entry.");
    res.status(204).end();
  })
);

// ---------------------------------------------------------------------------
// Office expenses
// ---------------------------------------------------------------------------

officeDiaryRouter.get(
  "/expenses",
  requireCap("money.view"),
  validateQuery(ledgerQuerySchema),
  asyncHandler(async (req, res) => {
    const { db } = tenant(req);
    const { from, to, limit } = res.locals.query as LedgerQuery;
    const range = between(from, to);
    const where = Object.keys(range).length ? { expenseDate: range } : {};

    const [rows, sum, byCategory] = await Promise.all([
      db.expense.findMany({
        where,
        orderBy: [{ expenseDate: "desc" }, { id: "desc" }],
        take: limit,
      }),
      db.expense.aggregate({ where, _sum: { amount: true } }),
      db.expense.groupBy({ by: ["category"], where, _sum: { amount: true } }),
    ]);

    res.json({
      items: rows.map((r) => ({ ...r, amount: Number(r.amount) })),
      total: Number(sum._sum.amount ?? 0),
      byCategory: byCategory
        .map((c) => ({ category: c.category, total: Number(c._sum.amount ?? 0) }))
        .sort((a, b) => b.total - a.total),
    });
  })
);

officeDiaryRouter.post(
  "/expenses",
  requireCap("money.edit"),
  validate(expenseSchema),
  asyncHandler(async (req, res) => {
    const { db, firmId } = tenant(req);
    const data = req.body as ExpenseInput;

    // An expense put against a matter is recoverable from that client, so
    // the matter has to be one of this chamber's before it is written down.
    if (data.caseId !== null) {
      const matter = await db.case.findUnique({
        where: { id: data.caseId },
        select: { id: true },
      });
      if (!matter) throw new ApiError(400, "That matter is not in this chamber's records.");
    }

    const created = await db.expense.create({
      data: { ...data, firmId, createdBy: staffSession(req).username },
      select: { id: true },
    });
    res.status(201).json(created);
  })
);

officeDiaryRouter.delete(
  "/expenses/:id",
  requireCap("money.edit"),
  asyncHandler(async (req, res) => {
    const { db } = tenant(req);
    const id = parseId(req.params.id);
    const removed = await db.expense.deleteMany({ where: { id } });
    if (removed.count === 0) throw new ApiError(404, "No such entry.");
    res.status(204).end();
  })
);

// ---------------------------------------------------------------------------
// Statements of account
// ---------------------------------------------------------------------------

/**
 * A link to one statement, good for ten minutes.
 *
 * The statement itself is a page a browser prints, and a browser following a
 * link sends no Authorization header — so the authority has to travel in the
 * address. What travels is a grant naming one matter or one client, not the
 * session: a link left in a browser history or pasted into a message opens
 * a statement and can do nothing else.
 *
 * Issued by POST rather than GET because it mints a credential, and a
 * credential should not be produced by anything a browser might prefetch.
 */
officeDiaryRouter.post(
  "/statements/:scope/:id",
  requireCap("money.view"),
  asyncHandler(async (req, res) => {
    const { db, firmId } = tenant(req);
    const scope = req.params.scope;
    const id = parseId(req.params.id);

    if (scope !== "case" && scope !== "client") {
      throw new ApiError(400, "A statement is drawn for a matter or for a client.");
    }

    // Asked of this chamber's own client, so an id from elsewhere cannot
    // mint a grant for it.
    const exists =
      scope === "case"
        ? await db.case.findUnique({ where: { id }, select: { id: true } })
        : await db.client.findUnique({ where: { id }, select: { id: true } });
    if (!exists) {
      throw new ApiError(404, "That is not in this chamber's records.");
    }

    const token = signStatementGrant({ firm: firmId, scope, id });
    res.json({ path: `/statement/${scope}/${id}?t=${encodeURIComponent(token)}` });
  })
);

// ---------------------------------------------------------------------------
// Reminders about money
// ---------------------------------------------------------------------------

/**
 * Recording that a reminder was put in front of a client.
 *
 * Deliberately narrow about what it claims. The app prepares a message and
 * hands it to WhatsApp; whether the advocate then pressed send, whether it
 * arrived, whether it was read — none of that comes back. So this records
 * that a reminder was opened, by whom, on what day, for what figure, and
 * nothing more. A record claiming a message was sent would be one the
 * chamber could not rely on in the conversation where it matters.
 */
officeDiaryRouter.post(
  "/fee-reminders",
  requireCap("money.edit"),
  validate(feeReminderSchema),
  asyncHandler(async (req, res) => {
    const { db, firmId } = tenant(req);
    const { clientId, caseId, amount, channel } = req.body as FeeReminderInput;

    const client = await db.client.findUnique({ where: { id: clientId }, select: { id: true } });
    if (!client) throw new ApiError(404, "That client is not in this chamber's records.");
    if (caseId !== null) {
      const matter = await db.case.findUnique({ where: { id: caseId }, select: { id: true } });
      if (!matter) throw new ApiError(404, "That matter is not in this chamber's records.");
    }

    const created = await db.feeReminder.create({
      data: {
        firmId,
        clientId,
        caseId,
        amount,
        channel,
        openedBy: staffSession(req).username,
      },
      select: { id: true, openedAt: true },
    });
    res.status(201).json(created);
  })
);

/**
 * When this client was last reminded, and about how much.
 *
 * One row is all a screen needs. The question being answered is "have we
 * asked recently", and a chamber asking twice in a day reads as harassment
 * while one that has not asked in six months is letting a fee go quietly
 * uncollectable.
 */
officeDiaryRouter.get(
  "/fee-reminders/:clientId",
  requireCap("money.view"),
  asyncHandler(async (req, res) => {
    const { db } = tenant(req);
    const clientId = parseId(req.params.clientId);

    const last = await db.feeReminder.findFirst({
      where: { clientId },
      orderBy: { openedAt: "desc" },
      select: { id: true, amount: true, openedAt: true, openedBy: true, caseId: true },
    });

    res.json({ last: last ? { ...last, amount: Number(last.amount) } : null });
  })
);

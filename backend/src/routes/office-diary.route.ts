import { Router } from "express";
import { asyncHandler } from "../lib/async-handler.js";
import { prisma } from "../lib/prisma.js";
import {
  requireCap,
  requireNoPendingPasswordChange,
  requireStaff,
} from "../middleware/auth.js";
import { ApiError } from "../middleware/errorHandler.js";
import { validate, validateQuery } from "../middleware/validate.js";
import {
  communicationListSchema,
  communicationSchema,
  expenseSchema,
  ledgerQuerySchema,
  officialFeeSchema,
  type CommunicationInput,
  type CommunicationListQuery,
  type ExpenseInput,
  type LedgerQuery,
  type OfficialFeeInput,
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
  asyncHandler(async (_req, res) => {
    const { q, dueOnly, limit } = res.locals.query as CommunicationListQuery;

    const today = new Date();
    today.setUTCHours(23, 59, 59, 999);

    const where = {
      ...(q ? { summary: { contains: q, mode: "insensitive" as const } } : {}),
      // "Due" means a follow-up date that has arrived or passed.
      ...(dueOnly ? { followUpDue: { not: null, lte: today } } : {}),
    };

    const [items, due] = await Promise.all([
      prisma.communication.findMany({
        where,
        orderBy: [{ commDate: "desc" }, { id: "desc" }],
        take: limit,
        select: {
          id: true, method: true, summary: true, commDate: true,
          followUpDue: true, createdAt: true,
          client: { select: { id: true, name: true } },
        },
      }),
      prisma.communication.count({ where: { followUpDue: { not: null, lte: today } } }),
    ]);

    res.json({ items, due });
  })
);

officeDiaryRouter.post(
  "/communications",
  requireCap("comms.edit"),
  validate(communicationSchema),
  asyncHandler(async (req, res) => {
    const data = req.body as CommunicationInput;

    if (data.clientId !== null) {
      const client = await prisma.client.findUnique({
        where: { id: data.clientId },
        select: { id: true },
      });
      if (!client) throw new ApiError(400, "That client does not exist.");
    }

    const created = await prisma.communication.create({
      data: { ...data, followUpDue: data.followUpDue || null },
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
    const id = parseId(req.params.id);
    const data = req.body as CommunicationInput;

    const updated = await prisma.communication.updateMany({
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
    const id = parseId(req.params.id);
    const removed = await prisma.communication.deleteMany({ where: { id } });
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
  asyncHandler(async (_req, res) => {
    const { from, to, limit } = res.locals.query as LedgerQuery;
    const range = between(from, to);

    const items = await prisma.fee.findMany({
      where: Object.keys(range).length ? { entryDate: range } : {},
      orderBy: [{ entryDate: "desc" }, { id: "desc" }],
      take: limit,
      select: {
        id: true, kind: true, amount: true, entryDate: true, note: true,
        case: { select: { id: true, title: true, client: { select: { name: true } } } },
      },
    });

    // Totals are over every matching entry, not only the page shown.
    const totals = await prisma.fee.groupBy({
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
  asyncHandler(async (_req, res) => {
    const { from, to, limit } = res.locals.query as LedgerQuery;
    const range = between(from, to);
    const where = Object.keys(range).length ? { entryDate: range } : {};

    const [rows, sum] = await Promise.all([
      prisma.officialFee.findMany({
        where,
        orderBy: [{ entryDate: "desc" }, { id: "desc" }],
        take: limit,
      }),
      prisma.officialFee.aggregate({ where, _sum: { amount: true } }),
    ]);

    // OfficialFee has no relation to Case in the schema, so the titles are
    // fetched separately rather than joined.
    const caseIds = [...new Set(rows.map((r) => r.caseId).filter((id): id is number => id !== null))];
    const cases = caseIds.length
      ? await prisma.case.findMany({ where: { id: { in: caseIds } }, select: { id: true, title: true } })
      : [];
    const titles = new Map(cases.map((c) => [c.id, c.title]));

    res.json({
      items: rows.map((r) => ({
        id: r.id,
        caseId: r.caseId,
        caseTitle: r.caseId ? (titles.get(r.caseId) ?? null) : null,
        kind: r.kind,
        amount: Number(r.amount),
        entryDate: r.entryDate,
        note: r.note,
      })),
      total: Number(sum._sum.amount ?? 0),
    });
  })
);

officeDiaryRouter.post(
  "/official-fees",
  requireCap("money.edit"),
  validate(officialFeeSchema),
  asyncHandler(async (req, res) => {
    const data = req.body as OfficialFeeInput;

    if (data.caseId !== null) {
      const matter = await prisma.case.findUnique({
        where: { id: data.caseId },
        select: { id: true },
      });
      if (!matter) throw new ApiError(400, "That case does not exist.");
    }

    const created = await prisma.officialFee.create({ data, select: { id: true } });
    res.status(201).json(created);
  })
);

officeDiaryRouter.delete(
  "/official-fees/:id",
  requireCap("money.edit"),
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    const removed = await prisma.officialFee.deleteMany({ where: { id } });
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
  asyncHandler(async (_req, res) => {
    const { from, to, limit } = res.locals.query as LedgerQuery;
    const range = between(from, to);
    const where = Object.keys(range).length ? { expenseDate: range } : {};

    const [rows, sum, byCategory] = await Promise.all([
      prisma.expense.findMany({
        where,
        orderBy: [{ expenseDate: "desc" }, { id: "desc" }],
        take: limit,
      }),
      prisma.expense.aggregate({ where, _sum: { amount: true } }),
      prisma.expense.groupBy({ by: ["category"], where, _sum: { amount: true } }),
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
    const created = await prisma.expense.create({
      data: req.body as ExpenseInput,
      select: { id: true },
    });
    res.status(201).json(created);
  })
);

officeDiaryRouter.delete(
  "/expenses/:id",
  requireCap("money.edit"),
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    const removed = await prisma.expense.deleteMany({ where: { id } });
    if (removed.count === 0) throw new ApiError(404, "No such entry.");
    res.status(204).end();
  })
);

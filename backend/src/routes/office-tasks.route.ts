import { Router } from "express";
import { asyncHandler } from "../lib/async-handler.js";
import {
  hasCap,
  requireCap,
  requireNoPendingPasswordChange,
  requireStaff,
  staffSession,
  tenant,
} from "../middleware/auth.js";
import { ApiError } from "../middleware/errorHandler.js";
import { validate, validateQuery } from "../middleware/validate.js";
import {
  dashboardSchema,
  taskDoneSchema,
  taskEditSchema,
  taskListSchema,
  taskSchema,
  type DashboardQuery,
  type TaskDoneInput,
  type TaskEditInput,
  type TaskInput,
  type TaskListQuery,
} from "../validation/office-tasks.schema.js";

/**
 * The chamber's own diary, and the day it opens on.
 *
 * The cause list answers what the courts have fixed. This answers everything
 * else: file the rejoinder, collect the certified copy, telephone the client
 * before the date, pay the process fee. A practice is lost through this half
 * of the day rather than through the listed one, which is why it is kept
 * with the same care as a hearing.
 */
export const officeTasksRouter = Router();

officeTasksRouter.use(requireStaff, requireNoPendingPasswordChange);

function parseId(raw: string | undefined): number {
  const id = Number(raw);
  if (!Number.isInteger(id) || id < 1) throw new ApiError(400, "Not a valid id.");
  return id;
}

/** Midnight, so a date column compares against a date and not a moment. */
function day(d: Date): Date {
  const copy = new Date(d);
  copy.setUTCHours(0, 0, 0, 0);
  return copy;
}

function today(): Date {
  return day(new Date());
}

/**
 * A task carries a case or a client only if that record belongs to this
 * chamber. The tenant client already refuses to read across chambers, so
 * asking it is the check: a missing row means the id was not ours.
 */
async function assertBelongs(
  db: ReturnType<typeof tenant>["db"],
  caseId: number | null,
  clientId: number | null
): Promise<void> {
  if (caseId !== null && !(await db.case.findUnique({ where: { id: caseId } }))) {
    throw new ApiError(404, "That matter is not in this chamber's records.");
  }
  if (clientId !== null && !(await db.client.findUnique({ where: { id: clientId } }))) {
    throw new ApiError(404, "That client is not in this chamber's records.");
  }
}

const taskShape = {
  id: true,
  taskDate: true,
  title: true,
  notes: true,
  priority: true,
  done: true,
  doneAt: true,
  createdBy: true,
  case: { select: { id: true, title: true, caseNo: true } },
  client: { select: { id: true, name: true } },
} as const;

// ---------------------------------------------------------------------------
// The diary
// ---------------------------------------------------------------------------

officeTasksRouter.get(
  "/tasks",
  requireCap("tasks.view"),
  validateQuery(taskListSchema),
  asyncHandler(async (req, res) => {
    const { db } = tenant(req);
    const { from, to, state, limit } = res.locals.query as TaskListQuery;

    const where = {
      ...(state === "all" ? {} : { done: state === "done" }),
      ...(from || to
        ? {
            taskDate: {
              ...(from ? { gte: day(from) } : {}),
              ...(to ? { lte: day(to) } : {}),
            },
          }
        : {}),
    };

    const [items, overdue] = await Promise.all([
      db.diaryTask.findMany({
        where,
        orderBy: [{ done: "asc" }, { taskDate: "asc" }, { id: "asc" }],
        take: limit,
        select: taskShape,
      }),
      // Counted whatever period is being looked at: something a fortnight
      // late does not stop being late because the diary is open on Friday.
      db.diaryTask.count({ where: { done: false, taskDate: { lt: today() } } }),
    ]);

    res.json({ items, overdue });
  })
);

officeTasksRouter.post(
  "/tasks",
  requireCap("tasks.edit"),
  validate(taskSchema),
  asyncHandler(async (req, res) => {
    const { db, firmId } = tenant(req);
    const body = req.body as TaskInput;
    await assertBelongs(db, body.caseId, body.clientId);

    const created = await db.diaryTask.create({
      data: {
        firmId,
        taskDate: day(body.taskDate),
        title: body.title,
        notes: body.notes,
        priority: body.priority,
        caseId: body.caseId,
        clientId: body.clientId,
        createdBy: staffSession(req).username,
      },
      select: taskShape,
    });
    res.status(201).json(created);
  })
);

officeTasksRouter.patch(
  "/tasks/:id",
  requireCap("tasks.edit"),
  validate(taskEditSchema),
  asyncHandler(async (req, res) => {
    const { db } = tenant(req);
    const id = parseId(req.params.id);
    const body = req.body as TaskEditInput;
    await assertBelongs(db, body.caseId ?? null, body.clientId ?? null);

    const existing = await db.diaryTask.findUnique({ where: { id } });
    if (!existing) throw new ApiError(404, "That task is not in the diary.");

    await db.diaryTask.update({
      where: { id },
      data: {
        ...(body.title !== undefined ? { title: body.title } : {}),
        ...(body.taskDate !== undefined ? { taskDate: day(body.taskDate) } : {}),
        ...(body.priority !== undefined ? { priority: body.priority } : {}),
        ...(body.notes !== undefined ? { notes: body.notes } : {}),
        ...(body.caseId !== undefined ? { caseId: body.caseId } : {}),
        ...(body.clientId !== undefined ? { clientId: body.clientId } : {}),
      },
    });
    res.status(204).end();
  })
);

/**
 * Done, and undone.
 *
 * Both directions matter: a task ticked by mistake at the end of a long day
 * has to come back, and a task that turns out not to have been finished has
 * to be reopened rather than written again.
 */
officeTasksRouter.post(
  "/tasks/:id/done",
  requireCap("tasks.edit"),
  validate(taskDoneSchema),
  asyncHandler(async (req, res) => {
    const { db } = tenant(req);
    const id = parseId(req.params.id);
    const { done } = req.body as TaskDoneInput;

    const existing = await db.diaryTask.findUnique({ where: { id } });
    if (!existing) throw new ApiError(404, "That task is not in the diary.");

    await db.diaryTask.update({
      where: { id },
      data: { done, doneAt: done ? new Date() : null },
    });
    res.status(204).end();
  })
);

officeTasksRouter.delete(
  "/tasks/:id",
  requireCap("tasks.edit"),
  asyncHandler(async (req, res) => {
    const { db } = tenant(req);
    const id = parseId(req.params.id);
    const existing = await db.diaryTask.findUnique({ where: { id } });
    if (!existing) throw new ApiError(404, "That task is not in the diary.");
    await db.diaryTask.delete({ where: { id } });
    res.status(204).end();
  })
);

// ---------------------------------------------------------------------------
// The day the office opens on
// ---------------------------------------------------------------------------

/**
 * Everything the first screen needs, in one request.
 *
 * Four counts and two lists, for a period the caller chooses. Today,
 * tomorrow, this week, this month and a range of one's own are all the same
 * question with different dates, so there is one endpoint rather than five.
 *
 * `to` left out means the same day. That is how an office diary is read —
 * "show me Thursday" — and a blank second date asking for everything from
 * Thursday onwards would answer a question nobody posed.
 */
officeTasksRouter.get(
  "/dashboard",
  requireCap("cases.view"),
  validateQuery(dashboardSchema),
  asyncHandler(async (req, res) => {
    const { db } = tenant(req);
    const { from, to } = res.locals.query as DashboardQuery;

    const start = day(from);
    const end = day(to ?? from);
    const range = { gte: start, lte: end };

    const maySeeTasks = await hasCap(req, "tasks.view");

    const [hearings, tasks, followUps, overdue, activeCases] = await Promise.all([
      db.hearing.findMany({
        where: { hearingDate: range },
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
              caseNo: true,
              court: true,
              stage: true,
              status: true,
              client: { select: { id: true, name: true, phone: true } },
            },
          },
        },
      }),
      maySeeTasks
        ? db.diaryTask.findMany({
            where: { taskDate: range, done: false },
            orderBy: [{ taskDate: "asc" }, { id: "asc" }],
            select: taskShape,
          })
        : Promise.resolve([]),
      // A communication with a follow-up date due in the period is a thing to
      // be done just as much as a task is, and the office diary counts them
      // together — so they are fetched together rather than left to the app
      // to remember.
      db.communication.findMany({
        where: { followUpDue: range },
        orderBy: [{ followUpDue: "asc" }, { id: "asc" }],
        select: {
          id: true,
          followUpDue: true,
          subject: true,
          summary: true,
          personName: true,
          client: { select: { id: true, name: true } },
        },
      }),
      maySeeTasks
        ? db.diaryTask.count({ where: { done: false, taskDate: { lt: today() } } })
        : Promise.resolve(0),
      db.case.count({ where: { status: "Active" } }),
    ]);

    res.json({
      from: start.toISOString().slice(0, 10),
      to: end.toISOString().slice(0, 10),
      counts: {
        hearings: hearings.length,
        tasks: tasks.length + followUps.length,
        overdue,
        activeCases,
      },
      hearings: hearings.map((h) => ({
        id: h.id,
        date: h.hearingDate.toISOString().slice(0, 10),
        purpose: h.purpose,
        // Whether it still has to be written up, which is what a staff
        // member is looking for when they open yesterday.
        recorded: h.outcome !== "",
        caseId: h.case.id,
        caseTitle: h.case.title,
        caseNo: h.case.caseNo,
        court: h.case.court,
        stage: h.case.stage,
        status: h.case.status,
        clientName: h.case.client.name,
        clientPhone: h.case.client.phone,
      })),
      tasks,
      followUps,
    });
  })
);

import Joi from "joi";

const text = (max: number) => Joi.string().trim().allow("").max(max).default("");

/**
 * A thing to be done.
 *
 * Priority is free text rather than a fixed list. A chamber's own words for
 * urgency — "before the date", "urgent", "when there is time" — outlive any
 * vocabulary settled on here, and a field that refuses the word an advocate
 * actually uses is a field they stop filling in.
 */
export const taskSchema = Joi.object({
  title: Joi.string().trim().min(2).max(255).required(),
  taskDate: Joi.date().iso().default(() => new Date()),
  priority: Joi.string().trim().max(32).default("Normal"),
  notes: text(2000),
  // Either, both, or neither: a task may hang off a matter, off a person, or
  // off nothing at all — "collect the stamps" belongs to no one.
  caseId: Joi.number().integer().min(1).allow(null).default(null),
  clientId: Joi.number().integer().min(1).allow(null).default(null),
});

export type TaskInput = {
  title: string;
  taskDate: Date;
  priority: string;
  notes: string;
  caseId: number | null;
  clientId: number | null;
};

/** Every field optional, because a task is usually corrected one field at a time. */
export const taskEditSchema = Joi.object({
  title: Joi.string().trim().min(2).max(255),
  taskDate: Joi.date().iso(),
  priority: Joi.string().trim().max(32),
  notes: Joi.string().trim().allow("").max(2000),
  caseId: Joi.number().integer().min(1).allow(null),
  clientId: Joi.number().integer().min(1).allow(null),
}).min(1);

export type TaskEditInput = Partial<TaskInput>;

export const taskDoneSchema = Joi.object({
  done: Joi.boolean().required(),
});
export type TaskDoneInput = { done: boolean };

export const taskListSchema = Joi.object({
  from: Joi.date().iso().allow(null, "").default(null),
  to: Joi.date().iso().allow(null, "").default(null),
  /** "open" is the working default: a diary is a list of what is left. */
  state: Joi.string().valid("open", "done", "all").default("open"),
  limit: Joi.number().integer().min(1).max(500).default(200),
});
export type TaskListQuery = {
  from: Date | null;
  to: Date | null;
  state: "open" | "done" | "all";
  limit: number;
};

/**
 * The dashboard's period.
 *
 * `to` is optional and means "the same day", which is how the office diary
 * on the website behaves: leaving it blank asks for a single day rather than
 * for everything from that date onwards.
 */
export const dashboardSchema = Joi.object({
  from: Joi.date().iso().default(() => new Date()),
  to: Joi.date().iso().allow(null, "").default(null),
});
export type DashboardQuery = { from: Date; to: Date | null };

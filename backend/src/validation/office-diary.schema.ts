import Joi from "joi";

const text = (max: number) => Joi.string().trim().allow("").max(max).default("");

/** A call, an email or a meeting, logged against a client where there is one. */
export const communicationSchema = Joi.object({
  clientId: Joi.number().integer().min(1).allow(null).default(null),
  method: Joi.string().valid("call", "email", "in_person", "letter", "whatsapp").required(),
  summary: Joi.string().trim().min(2).max(2000).required(),
  commDate: Joi.date().iso().default(() => new Date()),
  followUpDue: Joi.date().iso().allow(null, "").default(null),
});

export type CommunicationInput = {
  clientId: number | null;
  method: string;
  summary: string;
  commDate: Date;
  followUpDue: Date | null;
};

export const communicationListSchema = Joi.object({
  q: Joi.string().trim().allow("").max(200).default(""),
  dueOnly: Joi.boolean().default(false),
  limit: Joi.number().integer().min(1).max(200).default(100),
});
export type CommunicationListQuery = { q: string; dueOnly: boolean; limit: number };

/** Court fees, stamp duty and the like — paid out on a matter, or not tied to one. */
export const officialFeeSchema = Joi.object({
  caseId: Joi.number().integer().min(1).allow(null).default(null),
  kind: Joi.string().trim().min(2).max(80).required(),
  amount: Joi.number().min(0).max(999_999_999).required(),
  entryDate: Joi.date().iso().default(() => new Date()),
  note: text(300),
});
export type OfficialFeeInput = {
  caseId: number | null;
  kind: string;
  amount: number;
  entryDate: Date;
  note: string;
};

export const expenseSchema = Joi.object({
  category: Joi.string().trim().min(2).max(80).required(),
  amount: Joi.number().min(0).max(999_999_999).required(),
  expenseDate: Joi.date().iso().default(() => new Date()),
  description: text(300),
});
export type ExpenseInput = {
  category: string;
  amount: number;
  expenseDate: Date;
  description: string;
};

/** The window a money screen reports on. */
export const ledgerQuerySchema = Joi.object({
  from: Joi.date().iso().allow(null, "").default(null),
  to: Joi.date().iso().allow(null, "").default(null),
  limit: Joi.number().integer().min(1).max(500).default(200),
});
export type LedgerQuery = { from: Date | null; to: Date | null; limit: number };

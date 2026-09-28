import Joi from "joi";

const text = (max: number) => Joi.string().trim().allow("").max(max).default("");

/**
 * A call, an email or a meeting.
 *
 * Logged against a client where there is one, and against a matter where
 * the call was about a matter — which is most of them, and is the thing a
 * chamber wants back a year later when it is asked what it advised.
 *
 * The person at the other end is recorded separately from the client
 * because it is so often not the client: opposing counsel, a reader, a
 * relative carrying a message. Writing "the client rang" when it was the
 * client's brother is how a file stops being evidence of anything.
 */
export const communicationSchema = Joi.object({
  clientId: Joi.number().integer().min(1).allow(null).default(null),
  caseId: Joi.number().integer().min(1).allow(null).default(null),
  method: Joi.string().valid("call", "email", "in_person", "letter", "whatsapp").required(),
  /** Who rang whom. A chamber defending its advice needs to be able to say. */
  direction: Joi.string().valid("Received", "Sent").default("Received"),
  personName: text(160),
  personNumber: text(48),
  /** Client, opposing counsel, court staff, witness — free text. */
  personRole: text(48),
  subject: text(255),
  summary: Joi.string().trim().min(2).max(2000).required(),
  commDate: Joi.date().iso().default(() => new Date()),
  /**
   * The hour, kept as written rather than as a timestamp. A note made in
   * the evening about a call at eleven should say eleven.
   */
  commTime: text(16),
  followUpDue: Joi.date().iso().allow(null, "").default(null),
});

export type CommunicationInput = {
  clientId: number | null;
  caseId: number | null;
  method: string;
  direction: string;
  personName: string;
  personNumber: string;
  personRole: string;
  subject: string;
  summary: string;
  commDate: Date;
  commTime: string;
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
  description: text(255),
  amount: Joi.number().min(0).max(999_999_999).required(),
  entryDate: Joi.date().iso().default(() => new Date()),
  receiptNo: text(96),
  /**
   * Whether the chamber laid this out or the client paid it at the counter.
   * Money the chamber advanced is money owed back, and that is the whole
   * reason court fees are kept apart from professional ones.
   */
  paidBy: Joi.string().valid("office", "client").default("office"),
  note: text(300),
});
export type OfficialFeeInput = {
  caseId: number | null;
  kind: string;
  description: string;
  amount: number;
  entryDate: Date;
  receiptNo: string;
  paidBy: string;
  note: string;
};

/** Marking what the chamber advanced as having come back, or not after all. */
export const recoveredSchema = Joi.object({
  recovered: Joi.boolean().required(),
});
export type RecoveredInput = { recovered: boolean };

export const expenseSchema = Joi.object({
  category: Joi.string().trim().min(2).max(80).required(),
  amount: Joi.number().min(0).max(999_999_999).required(),
  expenseDate: Joi.date().iso().default(() => new Date()),
  description: text(300),
  /** Who received it — the stationer, the clerk, the courier. */
  paidTo: text(160),
  mode: text(48),
  /**
   * An expense on a matter is recoverable from the client; one on the
   * office is the cost of keeping the doors open. Only the first can be
   * put on a statement, so which it is has to be recorded when it is spent.
   */
  caseId: Joi.number().integer().min(1).allow(null).default(null),
});
export type ExpenseInput = {
  category: string;
  amount: number;
  expenseDate: Date;
  description: string;
  paidTo: string;
  mode: string;
  caseId: number | null;
};

/** The window a money screen reports on. */
export const ledgerQuerySchema = Joi.object({
  from: Joi.date().iso().allow(null, "").default(null),
  to: Joi.date().iso().allow(null, "").default(null),
  limit: Joi.number().integer().min(1).max(500).default(200),
});
export type LedgerQuery = { from: Date | null; to: Date | null; limit: number };

/**
 * A reminder put in front of a client.
 *
 * `amount` is what was outstanding at that moment, kept because the figure
 * moves and "we reminded them" means nothing without it.
 */
export const feeReminderSchema = Joi.object({
  clientId: Joi.number().integer().min(1).required(),
  caseId: Joi.number().integer().min(1).allow(null).default(null),
  amount: Joi.number().min(0).max(999_999_999).required(),
  channel: Joi.string().valid("whatsapp").default("whatsapp"),
});
export type FeeReminderInput = {
  clientId: number;
  caseId: number | null;
  amount: number;
  channel: string;
};

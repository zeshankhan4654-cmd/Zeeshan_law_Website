import Joi from "joi";

/** The cause list window: how many days ahead, and whether to include the past. */
export const diarySchema = Joi.object({
  days: Joi.number().integer().min(1).max(60).default(14),
});

export type DiaryQuery = { days: number };

export const caseListSchema = Joi.object({
  q: Joi.string().trim().allow("").max(200).default(""),
  status: Joi.string().trim().allow("").max(40).default(""),
  limit: Joi.number().integer().min(1).max(100).default(50),
  offset: Joi.number().integer().min(0).default(0),
});

export type CaseListQuery = { q: string; status: string; limit: number; offset: number };

/** A progress note posted to a case. The client sees this, so it is written
 *  for them, not for the file. */
export const caseUpdateSchema = Joi.object({
  message: Joi.string().trim().min(1).max(4000).required(),
  updateDate: Joi.date().iso().default(() => new Date()),
});

export type CaseUpdateInput = { message: string; updateDate: Date };

/** What actually happened at a hearing. Internal — never shown to a client. */
/**
 * Correcting a hearing after the fact.
 *
 * Every field optional and at least one required, because this is used one
 * field at a time: the order sheet copied out properly that evening, a
 * purpose mistyped in a corridor, a date the court gave that was misheard.
 * A hearing written up in two minutes outside a courtroom is worth having
 * and is not always right, and a record that cannot be corrected stops
 * being written.
 */
export const hearingEditSchema = Joi.object({
  hearingDate: Joi.date().iso(),
  purpose: Joi.string().trim().allow("").max(300),
  outcome: Joi.string().trim().allow("").max(4000),
  orderSheet: Joi.string().trim().allow("").max(8000),
  attendedBy: Joi.string().trim().allow("").max(120),
  nextDate: Joi.date().iso().allow(null, ""),
}).min(1);

export type HearingEditInput = {
  hearingDate?: Date;
  purpose?: string;
  outcome?: string;
  orderSheet?: string;
  attendedBy?: string;
  nextDate?: Date | null | "";
};

export const hearingOutcomeSchema = Joi.object({
  outcome: Joi.string().trim().allow("").max(4000).required(),
});

export type HearingOutcomeInput = { outcome: string };

export const officeReplySchema = Joi.object({
  body: Joi.string().trim().min(1).max(4000).required(),
});

export type OfficeReplyInput = { body: string };

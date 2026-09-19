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
export const hearingOutcomeSchema = Joi.object({
  outcome: Joi.string().trim().allow("").max(4000).required(),
});

export type HearingOutcomeInput = { outcome: string };

export const officeReplySchema = Joi.object({
  body: Joi.string().trim().min(1).max(4000).required(),
});

export type OfficeReplyInput = { body: string };

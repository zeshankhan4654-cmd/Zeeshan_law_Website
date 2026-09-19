import Joi from "joi";

/** A question or note a client sends the office about one of their cases. */
export const caseMessageSchema = Joi.object({
  body: Joi.string().trim().min(1).max(4000).required(),
});

export type CaseMessageInput = { body: string };

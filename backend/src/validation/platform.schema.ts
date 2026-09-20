import Joi from "joi";

export const chamberListSchema = Joi.object({
  q: Joi.string().trim().allow("").max(120).default(""),
  status: Joi.string().valid("", "active", "suspended").default(""),
  verified: Joi.string().valid("", "yes", "no").default(""),
  limit: Joi.number().integer().min(1).max(100).default(50),
  offset: Joi.number().integer().min(0).default(0),
});

export type ChamberListQuery = {
  q: string;
  status: "" | "active" | "suspended";
  verified: "" | "yes" | "no";
  limit: number;
  offset: number;
};

const SUSPEND_REASON_REQUIRED =
  "Give a reason. The advocate is shown it when they try to sign in.";

/**
 * Suspending a chamber stops an advocate working, so a reason is required
 * and it is shown to them at sign-in. "Because I said so" is a worse
 * platform than one that has to finish the sentence.
 */
export const suspendSchema = Joi.object({
  reason: Joi.string()
    .trim()
    .min(5)
    .max(300)
    .required()
    .messages({
      "string.min": SUSPEND_REASON_REQUIRED,
      "string.empty": SUSPEND_REASON_REQUIRED,
      "any.required": SUSPEND_REASON_REQUIRED,
    }),
});

export const verifySchema = Joi.object({
  verified: Joi.boolean().required(),
  note: Joi.string().trim().allow("").max(300).default(""),
});

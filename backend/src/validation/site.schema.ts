import Joi from "joi";

/**
 * The public enquiry form.
 *
 * `website` is a honeypot: a field no person sees and every naive bot fills
 * in. It costs nothing, needs no third-party captcha, and stops the bulk of
 * automated submissions on a site this size.
 */
export const enquirySchema = Joi.object({
  name: Joi.string().trim().min(2).max(120).required(),
  phone: Joi.string().trim().allow("").max(40).default(""),
  email: Joi.string().trim().lowercase().email({ tlds: false }).allow("").max(160).default(""),
  subject: Joi.string().trim().allow("").max(200).default(""),
  message: Joi.string().trim().min(10).max(4000).required(),
  website: Joi.string().allow("").max(200).default(""),
})
  /**
   * One way to be reached, or the enquiry cannot be answered.
   *
   * Not `.or("phone", "email")`: Joi applies the defaults above *before*
   * evaluating `.or`, so both keys are always present — as empty strings —
   * and the rule never fires. The check has to be on the values.
   */
  .custom((value, helpers) => {
    const reachable = String(value.phone ?? "").trim() || String(value.email ?? "").trim();
    return reachable ? value : helpers.error("any.custom");
  })
  .messages({
    "any.custom": "Please leave a telephone number or an email address, so the chamber can reply.",
  });

export type EnquiryInput = {
  name: string;
  phone: string;
  email: string;
  subject: string;
  message: string;
  website: string;
};

export const postListSchema = Joi.object({
  q: Joi.string().trim().allow("").max(200).default(""),
  category: Joi.string().trim().allow("").max(80).default(""),
  limit: Joi.number().integer().min(1).max(24).default(9),
  offset: Joi.number().integer().min(0).default(0),
});

export type PostListQuery = { q: string; category: string; limit: number; offset: number };

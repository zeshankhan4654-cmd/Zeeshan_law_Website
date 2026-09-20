import Joi from "joi";

/**
 * An email address, normalised.
 *
 * `tlds: false` is deliberate: Joi's built-in TLD list is a moving target
 * and refusing a real advocate's real address because a list is out of date
 * is worse than accepting an odd one. It also lets the `.invalid` addresses
 * the M2 migration wrote for pre-existing accounts still sign in.
 */
const email = Joi.string()
  .trim()
  .lowercase()
  .email({ minDomainSegments: 2, tlds: false })
  .max(160);

/** At least 10 characters — three unrelated words beat one word with digits on the end. */
const password = Joi.string().min(10).max(200);

export const loginSchema = Joi.object({
  email: email.required(),
  password: Joi.string().min(1).max(200).required(),
});

/**
 * The client portal's sign-in.
 *
 * The chamber comes from the link the advocate sent, not from anything the
 * client has to know, and it is required: without it a username would have
 * to be unique across the platform again.
 */
export const portalLoginSchema = Joi.object({
  firm: Joi.string().trim().lowercase().max(64).required(),
  username: Joi.string().trim().lowercase().min(1).max(96).required(),
  password: Joi.string().min(1).max(200).required(),
});

export const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().min(1).max(200).required(),
  newPassword: password.required(),
});

/** Replacing the address you sign in with. The password proves it is you. */
export const changeEmailSchema = Joi.object({
  password: Joi.string().min(1).max(200).required(),
  email: email.required(),
});

/**
 * An advocate registering a chamber.
 *
 * The enrolment number is asked for but not required, and is never treated
 * as proof by itself — it is a thing for the platform admin to check, not a
 * gate this form can pass on its own.
 */
export const signupSchema = Joi.object({
  fullName: Joi.string().trim().min(2).max(120).required(),
  chamberName: Joi.string().trim().min(2).max(160).required(),
  email: email.required(),
  password: password.required(),
  enrolmentNo: Joi.string().trim().allow("").max(60).default(""),
});

export type SignupInput = {
  fullName: string;
  chamberName: string;
  email: string;
  password: string;
  enrolmentNo: string;
};

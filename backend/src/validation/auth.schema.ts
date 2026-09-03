import Joi from "joi";

export const loginSchema = Joi.object({
  username: Joi.string().trim().lowercase().min(1).max(96).required(),
  password: Joi.string().min(1).max(200).required(),
});

/** At least 10 characters — three unrelated words beat one word with digits on the end. */
export const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().min(1).max(200).required(),
  newPassword: Joi.string().min(10).max(200).required(),
});

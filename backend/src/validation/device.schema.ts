import Joi from "joi";

/**
 * An Expo push token. The shape is checked so that obvious rubbish never
 * reaches the notification table — it is not a security control, since a
 * caller can always send a well-formed token belonging to nobody.
 */
const expoToken = Joi.string()
  .trim()
  .pattern(/^Expo(nent)?PushToken\[[^\]\s]{1,200}\]$/)
  .required()
  .messages({ "string.pattern.base": "That is not a push token." });

export const registerDeviceSchema = Joi.object({
  token: expoToken,
  platform: Joi.string().trim().valid("ios", "android", "web", "").default(""),
});

export const forgetDeviceSchema = Joi.object({ token: expoToken });

export type RegisterDeviceInput = { token: string; platform: string };
export type ForgetDeviceInput = { token: string };

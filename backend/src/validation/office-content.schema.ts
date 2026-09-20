import Joi from "joi";
import { SITE_DEFAULTS } from "../lib/site-settings.js";

/**
 * Site settings.
 *
 * Only the keys the site actually reads may be written. An open key/value
 * endpoint would let anyone with the capability fill the table with
 * anything, and nothing would ever notice a typo in a key name.
 */
export const settingsSchema = Joi.object(
  Object.fromEntries(
    Object.keys(SITE_DEFAULTS).map((key) => [
      key,
      key.startsWith("social.") || key === "contact.mapUrl" || key === "contact.mapEmbed"
        ? // A link field is either empty or a real http(s) URL: a half-typed
          // one renders as a broken icon on every page of the site.
          Joi.string().trim().allow("").max(500).uri({ scheme: ["http", "https"] })
        : Joi.string().trim().allow("").max(500),
    ])
  )
).min(1);

export const testimonialSchema = Joi.object({
  author: Joi.string().trim().min(2).max(160).required(),
  role: Joi.string().trim().allow("").max(160).default(""),
  body: Joi.string().trim().min(5).max(2000).required(),
  rating: Joi.number().integer().min(1).max(5).default(5),
  source: Joi.string().trim().allow("").max(60).default("Google"),
  sourceUrl: Joi.string().trim().allow("").max(500).uri({ scheme: ["http", "https"] }).default(""),
  published: Joi.boolean().default(true),
  sortOrder: Joi.number().integer().min(0).max(999).default(50),
});

export const postSchema = Joi.object({
  title: Joi.string().trim().min(3).max(300).required(),
  slug: Joi.string()
    .trim()
    .lowercase()
    .allow("")
    .max(200)
    .pattern(/^[a-z0-9-]*$/)
    .default("")
    .messages({ "string.pattern.base": "A web address may hold only letters, numbers and hyphens." }),
  summary: Joi.string().trim().allow("").max(600).default(""),
  body: Joi.string().trim().allow("").max(60_000).default(""),
  category: Joi.string().trim().allow("").max(80).default(""),
  tags: Joi.string().trim().allow("").max(300).default(""),
  published: Joi.boolean().default(false),
  publishedOn: Joi.date().iso().allow(null, "").default(null),
});

export const userSchema = Joi.object({
  fullName: Joi.string().trim().min(2).max(160).required(),
  username: Joi.string()
    .trim()
    .lowercase()
    .min(3)
    .max(60)
    .pattern(/^[a-z0-9._-]+$/)
    .required()
    .messages({ "string.pattern.base": "A username may hold only letters, numbers, dots, hyphens and underscores." }),
  // What they sign in with. Unique across the platform, unlike the handle
  // above, which only has to be free inside this chamber.
  email: Joi.string()
    .trim()
    .lowercase()
    .email({ minDomainSegments: 2, tlds: false })
    .max(160)
    .required(),
  role: Joi.string().trim().min(2).max(40).required(),
});

export const userEditSchema = Joi.object({
  fullName: Joi.string().trim().min(2).max(160).required(),
  role: Joi.string().trim().min(2).max(40).required(),
});

export const roleSchema = Joi.object({
  roleKey: Joi.string()
    .trim()
    .lowercase()
    .min(2)
    .max(40)
    .pattern(/^[a-z0-9_-]+$/)
    .required(),
  label: Joi.string().trim().min(2).max(80).required(),
  description: Joi.string().trim().allow("").max(300).default(""),
  sortOrder: Joi.number().integer().min(0).max(999).default(50),
});

export const roleCapsSchema = Joi.object({
  caps: Joi.array().items(Joi.string().trim().max(60)).max(200).required(),
});

export type PostInput = {
  title: string;
  slug: string;
  summary: string;
  body: string;
  category: string;
  tags: string;
  published: boolean;
  publishedOn: Date | null;
};

export type TestimonialInput = {
  author: string;
  role: string;
  body: string;
  rating: number;
  source: string;
  sourceUrl: string;
  published: boolean;
  sortOrder: number;
};

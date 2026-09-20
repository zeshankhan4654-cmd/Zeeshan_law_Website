import Joi from "joi";

const text = (max: number) => Joi.string().trim().allow("").max(max).default("");

/**
 * A reported judgment.
 *
 * `citation` is required to publish, not merely to save: the chamber's own
 * rule is that nothing goes on the public site without a citation that has
 * been checked against the report. A draft may be incomplete; a published
 * entry may not.
 */
export const judgmentSchema = Joi.object({
  title: Joi.string().trim().min(3).max(400).required(),
  citation: text(200),
  court: text(160),
  judges: text(300),
  judgmentDate: Joi.date().iso().allow(null, "").default(null),
  sections: text(300),
  principle: text(2000),
  summary: text(8000),
  tags: text(300),
  sourceUrl: Joi.string().trim().allow("").max(500).uri({ scheme: ["http", "https"] }).default(""),
  published: Joi.boolean().default(false),
}).custom((value, helpers) => {
  if (value.published && !String(value.citation ?? "").trim()) {
    return helpers.error("any.custom");
  }
  return value;
}).messages({
  "any.custom":
    "A judgment cannot be published without its citation. Check it against the report first.",
});

export const researchSchema = Joi.object({
  title: Joi.string().trim().min(3).max(400).required(),
  topic: text(120),
  summary: text(2000),
  body: text(80_000),
  tags: text(300),
  caseId: Joi.number().integer().min(1).allow(null).default(null),
  published: Joi.boolean().default(false),
});

export const mediaSchema = Joi.object({
  title: Joi.string().trim().min(3).max(300).required(),
  kind: Joi.string().trim().max(60).default("Video"),
  description: text(2000),
  topic: text(120),
  url: Joi.string().trim().allow("").max(500).uri({ scheme: ["http", "https"] }).default(""),
  recordedOn: Joi.date().iso().allow(null, "").default(null),
  published: Joi.boolean().default(false),
}).custom((value, helpers) => {
  if (value.published && !String(value.url ?? "").trim()) {
    return helpers.error("any.custom");
  }
  return value;
}).messages({
  "any.custom": "A recording needs a link before it can be published.",
});

export const libraryListSchema = Joi.object({
  q: Joi.string().trim().allow("").max(200).default(""),
  limit: Joi.number().integer().min(1).max(200).default(100),
});
export type LibraryAdminQuery = { q: string; limit: number };

export type JudgmentInput = {
  title: string;
  citation: string;
  court: string;
  judges: string;
  judgmentDate: Date | null;
  sections: string;
  principle: string;
  summary: string;
  tags: string;
  sourceUrl: string;
  published: boolean;
};

export type ResearchInput = {
  title: string;
  topic: string;
  summary: string;
  body: string;
  tags: string;
  caseId: number | null;
  published: boolean;
};

export type MediaInput = {
  title: string;
  kind: string;
  description: string;
  topic: string;
  url: string;
  recordedOn: Date | null;
  published: boolean;
};

import Joi from "joi";

/** Query parameters accepted by every public library listing. */
export const libraryListSchema = Joi.object({
  q: Joi.string().trim().allow("").max(200).default(""),
  limit: Joi.number().integer().min(1).max(50).default(20),
  offset: Joi.number().integer().min(0).default(0),
});

export type LibraryListQuery = {
  q: string;
  limit: number;
  offset: number;
};

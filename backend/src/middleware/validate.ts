import type { NextFunction, Request, Response } from "express";
import type { ObjectSchema } from "joi";
import { ApiError } from "./errorHandler.js";

/**
 * Validates `req.body` against a Joi schema, replacing it with the validated
 * (trimmed, defaulted, unknown-stripped) value on success. Every route that
 * accepts a body uses this — Joi is the one and only place input shape is
 * decided, never a scattered `if (!req.body.x)` check.
 */
export function validate(schema: ObjectSchema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });
    if (error) {
      next(new ApiError(400, error.details.map((d) => d.message).join("; ")));
      return;
    }
    req.body = value;
    next();
  };
}

/**
 * The same, for `req.query`. Express 5 makes `req.query` a getter, so the
 * validated value is stashed on `res.locals.query` rather than assigned back
 * over it — handlers read it from there.
 */
export function validateQuery(schema: ObjectSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
    });
    if (error) {
      next(new ApiError(400, error.details.map((d) => d.message).join("; ")));
      return;
    }
    res.locals.query = value;
    next();
  };
}

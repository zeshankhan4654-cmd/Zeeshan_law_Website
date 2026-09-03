import type { NextFunction, Request, RequestHandler, Response } from "express";

/**
 * Express 4 does not catch a rejected promise from an async handler — a
 * thrown error inside one becomes an unhandled rejection and crashes the
 * process, rather than reaching errorHandler. Wrapping every async route in
 * this forwards that rejection to `next()` instead, which is what
 * errorHandler expects.
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

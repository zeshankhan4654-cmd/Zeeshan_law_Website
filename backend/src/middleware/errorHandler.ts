import type { NextFunction, Request, Response } from "express";
import { MulterError } from "multer";

/** A known, expected failure — thrown deliberately with a status and a safe message. */
export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({ error: `No route: ${req.method} ${req.originalUrl}` });
}

/**
 * The single place an error becomes an HTTP response.
 *
 * An `ApiError` is safe to show the client as-is. Anything else — a database
 * fault, a bug — is logged in full on the server but never described to the
 * client beyond "something went wrong", so internals never leak into a
 * response body.
 */
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ApiError) {
    res.status(err.status).json({ error: err.message });
    return;
  }

  // An upload that breaks a limit is the sender's business, not a server
  // fault — say which limit, without describing the server.
  if (err instanceof MulterError) {
    const message =
      err.code === "LIMIT_FILE_SIZE"
        ? "That recording is too long. Keep a voice note short."
        : "That upload was not accepted.";
    res.status(400).json({ error: message });
    return;
  }

  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Something went wrong. Please try again." });
}

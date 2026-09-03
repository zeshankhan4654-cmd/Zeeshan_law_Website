import type { NextFunction, Request, Response } from "express";
import { asyncHandler } from "../lib/async-handler.js";
import { ROOT_ROLE } from "../lib/capabilities.js";
import { verifySession, SESSION_COOKIE, type SessionPayload } from "../lib/jwt.js";
import { prisma } from "../lib/prisma.js";
import { ApiError } from "./errorHandler.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: SessionPayload;
    }
  }
}

/** Every request beyond this point must carry a valid session cookie. */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = req.cookies?.[SESSION_COOKIE];
  if (!token) {
    throw new ApiError(401, "Sign in to continue.");
  }
  try {
    req.user = verifySession(token);
    next();
  } catch {
    throw new ApiError(401, "Your session has expired. Sign in again.");
  }
}

/**
 * A password change is still owed — apply this after requireAuth on any
 * router that isn't the auth router itself, so a freshly created account
 * can do nothing else until its holder has set their own password. Checked
 * against the database rather than the JWT so it reflects the change the
 * instant it happens, not whatever was true when the token was issued.
 */
export const requireNoPendingPasswordChange = asyncHandler(async (req, _res, next) => {
  if (!req.user) {
    throw new ApiError(401, "Sign in to continue.");
  }
  const user = await prisma.user.findUnique({
    where: { id: req.user.sub },
    select: { mustChangePassword: true },
  });
  if (!user) {
    throw new ApiError(401, "Your session has expired. Sign in again.");
  }
  if (user.mustChangePassword) {
    throw new ApiError(403, "Change your password before continuing.");
  }
  next();
});

/**
 * Requires a specific capability. The Principal (ROOT_ROLE) always passes,
 * whatever role_caps contains, so there is no way to lock the one account
 * that grants access out of granting it.
 */
export function requireCap(cap: string) {
  return asyncHandler(async (req, _res, next) => {
    if (!req.user) {
      throw new ApiError(401, "Sign in to continue.");
    }
    if (req.user.role === ROOT_ROLE) {
      next();
      return;
    }
    const grant = await prisma.roleCap.findUnique({
      where: { roleKey_cap: { roleKey: req.user.role, cap } },
    });
    if (!grant) {
      throw new ApiError(403, "You do not have access to that.");
    }
    next();
  });
}

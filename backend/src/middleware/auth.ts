import type { NextFunction, Request, Response } from "express";
import { asyncHandler } from "../lib/async-handler.js";
import { ROOT_ROLE } from "../lib/capabilities.js";
import {
  verifySession,
  PORTAL_COOKIE,
  SESSION_COOKIE,
  type ClientSession,
  type SessionPayload,
  type StaffSession,
} from "../lib/jwt.js";
import { forFirm, type FirmClient } from "../lib/tenant.js";
import { ApiError } from "./errorHandler.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: SessionPayload;
      /**
       * A Prisma client that can only reach the signed-in chamber. Every
       * route past a guard uses this instead of the bare client.
       */
      db?: FirmClient;
      firmId?: number;
    }
  }
}

/**
 * The session token, from either transport.
 *
 * The web app holds it in an httpOnly cookie, which the browser sends on its
 * own. React Native has no cookie jar, so the mobile app keeps the token in
 * the device keychain and presents it as a bearer token. Same token, same
 * signature, same expiry — only the envelope differs.
 *
 * The cookie name differs by audience so that, in one browser, signing into
 * the client portal does not sign you out of the office.
 */
function readSessionToken(req: Request, cookieName: string): string | null {
  const header = req.get("authorization");
  if (header?.startsWith("Bearer ")) {
    const token = header.slice("Bearer ".length).trim();
    if (token) return token;
  }
  return req.cookies?.[cookieName] ?? null;
}

function authenticate(req: Request, cookieName: string, kind: SessionPayload["kind"]): void {
  const token = readSessionToken(req, cookieName);
  if (!token) {
    throw new ApiError(401, "Sign in to continue.");
  }

  let session: SessionPayload;
  try {
    session = verifySession(token);
  } catch {
    throw new ApiError(401, "Your session has expired. Sign in again.");
  }

  // A validly signed token for the other audience is still not a session
  // here. This is the check that keeps client 7 out of staff account 7.
  if (session.kind !== kind) {
    throw new ApiError(403, "That sign-in does not have access here.");
  }

  req.user = session;
  req.firmId = session.firm;
  req.db = forFirm(session.firm);
}

/**
 * Staff only. There is deliberately no "any signed-in party" guard: every
 * protected route has to say which audience it serves, so none can be left
 * open to both by omission.
 */
export function requireStaff(req: Request, _res: Response, next: NextFunction): void {
  authenticate(req, SESSION_COOKIE, "staff");
  next();
}

/** Clients of the firm, signed into their own portal. */
export function requireClient(req: Request, _res: Response, next: NextFunction): void {
  authenticate(req, PORTAL_COOKIE, "client");
  next();
}

/**
 * The chamber-scoped client and firm for a request past a guard.
 *
 * Throws rather than falling back to the unscoped client: a route that
 * reaches this without a session is a routing mistake, and the safe
 * response to one is to stop.
 */
export function tenant(req: Request): { db: FirmClient; firmId: number } {
  if (!req.db || !req.firmId) {
    throw new ApiError(401, "Sign in to continue.");
  }
  return { db: req.db, firmId: req.firmId };
}

/** The staff session on a request past `requireStaff`, correctly narrowed. */
export function staffSession(req: Request): StaffSession {
  if (req.user?.kind !== "staff") {
    throw new ApiError(401, "Sign in to continue.");
  }
  return req.user;
}

/** The client session on a request past `requireClient`. */
export function clientSession(req: Request): ClientSession {
  if (req.user?.kind !== "client") {
    throw new ApiError(401, "Sign in to continue.");
  }
  return req.user;
}

/**
 * A password change is still owed — apply this after requireStaff on any
 * router that isn't the auth router itself, so a freshly created account
 * can do nothing else until its holder has set their own password. Checked
 * against the database rather than the JWT so it reflects the change the
 * instant it happens, not whatever was true when the token was issued.
 */
export const requireNoPendingPasswordChange = asyncHandler(async (req, _res, next) => {
  const session = staffSession(req);
  const user = await tenant(req).db.user.findUnique({
    where: { id: session.sub },
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

/** The client-portal counterpart, for the same reason. */
export const requireNoPendingPortalPasswordChange = asyncHandler(async (req, _res, next) => {
  const session = clientSession(req);
  const client = await tenant(req).db.client.findUnique({
    where: { id: session.sub },
    select: { portalEnabled: true, portalMustChangePassword: true },
  });
  if (!client?.portalEnabled) {
    // Covers a portal switched off after the token was issued.
    throw new ApiError(401, "Your session has expired. Sign in again.");
  }
  if (client.portalMustChangePassword) {
    throw new ApiError(403, "Change your password before continuing.");
  }
  next();
});

/**
 * Runs the platform itself, not merely a chamber.
 *
 * Checked against the database on every request rather than carried in the
 * token: this is the authority to stop other advocates working, and it must
 * stop the moment it is revoked, not whenever a twelve-hour token happens
 * to expire.
 *
 * It does not widen the office. A platform admin's `req.db` is still scoped
 * to their own chamber, because it comes from their own session — being a
 * platform admin adds the console and nothing else.
 */
export const requirePlatformAdmin = asyncHandler(async (req, _res, next) => {
  const session = staffSession(req);

  const user = await tenant(req).db.user.findUnique({
    where: { id: session.sub },
    select: { platformAdmin: true, email: true, mustChangePassword: true },
  });

  if (!user?.platformAdmin) {
    // The same answer somebody who is simply not a platform admin gets, so
    // the console's existence is not confirmed to anyone poking at it.
    throw new ApiError(404, "Not found.");
  }
  if (user.mustChangePassword) {
    throw new ApiError(403, "Change your password before continuing.");
  }

  next();
});

/** The signed-in platform admin's id and address, for the audit record. */
export async function platformActor(req: Request): Promise<{ id: number; email: string }> {
  const session = staffSession(req);
  const user = await tenant(req).db.user.findUnique({
    where: { id: session.sub },
    select: { id: true, email: true, platformAdmin: true },
  });
  if (!user?.platformAdmin) {
    throw new ApiError(404, "Not found.");
  }
  return { id: user.id, email: user.email };
}

/**
 * Requires a specific capability. The Principal (ROOT_ROLE) always passes,
 * whatever role_caps contains, so there is no way to lock the one account
 * that grants access out of granting it.
 */
export function requireCap(cap: string) {
  return asyncHandler(async (req, _res, next) => {
    const session = staffSession(req);
    if (session.role === ROOT_ROLE) {
      next();
      return;
    }
    const { db, firmId } = tenant(req);
    const grant = await db.roleCap.findUnique({
      where: { firmId_roleKey_cap: { firmId, roleKey: session.role, cap } },
    });
    if (!grant) {
      throw new ApiError(403, "You do not have access to that.");
    }
    next();
  });
}

import { Router } from "express";
import { asyncHandler } from "../lib/async-handler.js";
import { signSession, PORTAL_COOKIE, sessionCookieOptions } from "../lib/jwt.js";
import { clearFailures, lockMinutesRemaining, recordFailure } from "../lib/login-throttle.js";
import { hashPassword, verifyPassword } from "../lib/password.js";
import { prisma } from "../lib/prisma.js";
import { clientSession, requireClient, tenant } from "../middleware/auth.js";
import { ApiError } from "../middleware/errorHandler.js";
import { validate } from "../middleware/validate.js";
import { changePasswordSchema, loginSchema } from "../validation/auth.schema.js";

/**
 * The client portal's own sign-in, separate from the office's.
 *
 * A client is a row in `clients`, not a staff account, and holds no
 * capabilities at all — what they may see is decided by which case is theirs,
 * never by a role. Keeping the two sign-ins on separate routers, separate
 * cookies and separate token kinds means the office's capability machinery is
 * never asked a question about a client.
 */
export const portalRouter = Router();

const LOGIN_SCOPE = "client";

portalRouter.post(
  "/login",
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const { username, password } = req.body as { username: string; password: string };
    const ip = req.ip ?? "unknown";

    const wait = await lockMinutesRemaining(LOGIN_SCOPE, username, ip);
    if (wait > 0) {
      throw new ApiError(429, `Too many attempts. Try again in ${wait} minute${wait === 1 ? "" : "s"}.`);
    }

    // Unscoped by necessity, as with the office sign-in: this is how we
    // learn which chamber the client belongs to.
    const client = await prisma.client.findUnique({
      where: { portalUsername: username },
      include: { firm: { select: { status: true, suspendedReason: true } } },
    });
    const valid =
      client?.portalHash ? await verifyPassword(password, client.portalHash) : false;

    if (!client || !valid) {
      await recordFailure(LOGIN_SCOPE, username, ip);
      throw new ApiError(401, "Wrong username or password.");
    }

    // Only reachable by someone who already proved they hold the password, so
    // saying plainly that access is switched off reveals nothing and saves a
    // phone call.
    if (client.firm.status !== "active") {
      throw new ApiError(
        403,
        "Your advocate's chamber is not currently active. Please contact them directly."
      );
    }

    if (!client.portalEnabled) {
      throw new ApiError(403, "Your portal access is switched off. Please contact the office.");
    }

    await clearFailures(LOGIN_SCOPE, username, ip);

    const token = signSession({ kind: "client", sub: client.id, username, firm: client.firmId });

    res.cookie(PORTAL_COOKIE, token, sessionCookieOptions);
    res.json({
      id: client.id,
      name: client.name,
      username,
      showFees: client.portalShowFees,
      mustChangePassword: client.portalMustChangePassword,
      token,
    });
  })
);

portalRouter.post("/logout", (_req, res) => {
  res.clearCookie(PORTAL_COOKIE, { ...sessionCookieOptions, maxAge: undefined });
  res.status(204).end();
});

portalRouter.get(
  "/me",
  requireClient,
  asyncHandler(async (req, res) => {
    const client = await tenant(req).db.client.findUnique({
      where: { id: clientSession(req).sub },
    });
    if (!client?.portalEnabled) {
      throw new ApiError(401, "Your session has expired. Sign in again.");
    }

    res.json({
      id: client.id,
      name: client.name,
      username: client.portalUsername,
      showFees: client.portalShowFees,
      mustChangePassword: client.portalMustChangePassword,
    });
  })
);

portalRouter.post(
  "/change-password",
  requireClient,
  validate(changePasswordSchema),
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body as {
      currentPassword: string;
      newPassword: string;
    };

    const { db } = tenant(req);
    const client = await db.client.findUnique({ where: { id: clientSession(req).sub } });
    if (!client?.portalEnabled || !client.portalHash) {
      throw new ApiError(401, "Your session has expired. Sign in again.");
    }

    const valid = await verifyPassword(currentPassword, client.portalHash);
    if (!valid) {
      throw new ApiError(400, "That is not your current password.");
    }

    await db.client.update({
      where: { id: client.id },
      data: {
        portalHash: await hashPassword(newPassword),
        portalMustChangePassword: false,
      },
    });

    res.status(204).end();
  })
);

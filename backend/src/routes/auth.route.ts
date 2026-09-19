import { Router } from "express";
import { asyncHandler } from "../lib/async-handler.js";
import { ROOT_ROLE } from "../lib/capabilities.js";
import { signSession, SESSION_COOKIE, sessionCookieOptions } from "../lib/jwt.js";
import { clearFailures, lockMinutesRemaining, recordFailure } from "../lib/login-throttle.js";
import { hashPassword, verifyPassword } from "../lib/password.js";
import { prisma } from "../lib/prisma.js";
import { requireStaff, staffSession } from "../middleware/auth.js";
import { ApiError } from "../middleware/errorHandler.js";
import { validate } from "../middleware/validate.js";
import { changePasswordSchema, loginSchema } from "../validation/auth.schema.js";

export const authRouter = Router();

/**
 * The capability keys a role holds, or null for the Principal — who holds
 * everything, so the client treats null as "all" rather than being sent a
 * list that could fall out of step with requireCap.
 */
async function capabilitiesOf(role: string): Promise<string[] | null> {
  if (role === ROOT_ROLE) return null;
  const grants = await prisma.roleCap.findMany({ where: { roleKey: role } });
  return grants.map((g) => g.cap);
}

const LOGIN_SCOPE = "office";

authRouter.post(
  "/login",
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const { username, password } = req.body as { username: string; password: string };
    const ip = req.ip ?? "unknown";

    const wait = await lockMinutesRemaining(LOGIN_SCOPE, username, ip);
    if (wait > 0) {
      throw new ApiError(429, `Too many attempts. Try again in ${wait} minute${wait === 1 ? "" : "s"}.`);
    }

    const user = await prisma.user.findUnique({ where: { username } });
    const valid = user ? await verifyPassword(password, user.passwordHash) : false;

    if (!user || !valid) {
      await recordFailure(LOGIN_SCOPE, username, ip);
      throw new ApiError(401, "Wrong username or password.");
    }

    await clearFailures(LOGIN_SCOPE, username, ip);

    const token = signSession({ kind: "staff", sub: user.id, username: user.username, role: user.role });
    const capabilities = await capabilitiesOf(user.role);

    // The cookie serves the web app. The token in the body serves the mobile
    // app, which has no cookie jar and stores it in the device keychain.
    // A browser client should ignore it and rely on the httpOnly cookie —
    // putting a token where JavaScript can read it is only worth doing where
    // there is no alternative.
    res.cookie(SESSION_COOKIE, token, sessionCookieOptions);
    res.json({
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
      capabilities,
      token,
    });
  })
);

authRouter.post("/logout", (_req, res) => {
  res.clearCookie(SESSION_COOKIE, { ...sessionCookieOptions, maxAge: undefined });
  res.status(204).end();
});

authRouter.get(
  "/me",
  requireStaff,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: staffSession(req).sub } });
    if (!user) {
      throw new ApiError(401, "Your session has expired. Sign in again.");
    }

    res.json({
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
      capabilities: await capabilitiesOf(user.role),
    });
  })
);

authRouter.post(
  "/change-password",
  requireStaff,
  validate(changePasswordSchema),
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body as { currentPassword: string; newPassword: string };

    const user = await prisma.user.findUnique({ where: { id: staffSession(req).sub } });
    if (!user) {
      throw new ApiError(401, "Your session has expired. Sign in again.");
    }

    const valid = await verifyPassword(currentPassword, user.passwordHash);
    if (!valid) {
      throw new ApiError(400, "That is not your current password.");
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: await hashPassword(newPassword),
        mustChangePassword: false,
      },
    });

    res.status(204).end();
  })
);

import { Router } from "express";
import { asyncHandler } from "../lib/async-handler.js";
import { ROOT_ROLE } from "../lib/capabilities.js";
import { signSession, SESSION_COOKIE, sessionCookieOptions } from "../lib/jwt.js";
import { clearFailures, lockMinutesRemaining, recordFailure } from "../lib/login-throttle.js";
import { hashPassword, verifyPassword } from "../lib/password.js";
import { prisma } from "../lib/prisma.js";
import { requireStaff, staffSession, tenant } from "../middleware/auth.js";
import { ApiError } from "../middleware/errorHandler.js";
import { validate } from "../middleware/validate.js";
import { changeEmailSchema, changePasswordSchema, loginSchema } from "../validation/auth.schema.js";

export const authRouter = Router();

/**
 * The capability keys a role holds, or null for the Principal — who holds
 * everything, so the client treats null as "all" rather than being sent a
 * list that could fall out of step with requireCap.
 */
async function capabilitiesOf(firmId: number, role: string): Promise<string[] | null> {
  if (role === ROOT_ROLE) return null;
  const grants = await prisma.roleCap.findMany({ where: { firmId, roleKey: role } });
  return grants.map((g) => g.cap);
}

const LOGIN_SCOPE = "office";

/**
 * The chamber this session is in, as the office needs to show it.
 *
 * Its name heads the office, and its slug is the link an advocate gives
 * their clients — so the office can show that link rather than the
 * advocate having to be told it once and remember it.
 */
async function chamberOf(firmId: number) {
  const firm = await prisma.firm.findUnique({
    where: { id: firmId },
    select: { slug: true, name: true, verified: true },
  });
  if (!firm) return null;
  return { ...firm, clientLoginPath: `/client/login/${firm.slug}` };
}

authRouter.post(
  "/login",
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body as { email: string; password: string };
    const ip = req.ip ?? "unknown";

    const wait = await lockMinutesRemaining(LOGIN_SCOPE, email, ip);
    if (wait > 0) {
      throw new ApiError(429, `Too many attempts. Try again in ${wait} minute${wait === 1 ? "" : "s"}.`);
    }

    // Unscoped by necessity: signing in is how we learn which chamber this
    // person belongs to. Everything after this point is scoped to it. The
    // address is unique across the platform, so no chamber has to be named
    // here — which is the whole reason sign-in moved to email.
    const user = await prisma.user.findUnique({
      where: { email },
      include: { firm: { select: { status: true, suspendedReason: true } } },
    });
    const valid = user ? await verifyPassword(password, user.passwordHash) : false;

    if (!user || !valid) {
      await recordFailure(LOGIN_SCOPE, email, ip);
      throw new ApiError(401, "Wrong email or password.");
    }

    // Only reachable by someone who proved they hold the password, so the
    // reason can be given plainly.
    if (user.firm.status !== "active") {
      throw new ApiError(
        403,
        user.firm.suspendedReason ||
          "This chamber's access has been suspended. Please contact the platform."
      );
    }

    await clearFailures(LOGIN_SCOPE, email, ip);

    const token = signSession({
      kind: "staff",
      sub: user.id,
      username: user.username,
      role: user.role,
      firm: user.firmId,
    });
    const capabilities = await capabilitiesOf(user.firmId, user.role);

    // The cookie serves the web app. The token in the body serves the mobile
    // app, which has no cookie jar and stores it in the device keychain.
    // A browser client should ignore it and rely on the httpOnly cookie —
    // putting a token where JavaScript can read it is only worth doing where
    // there is no alternative.
    res.cookie(SESSION_COOKIE, token, sessionCookieOptions);
    res.json({
      id: user.id,
      email: user.email,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
      // A placeholder written by the migration, which the holder should
      // replace. The office shell says so rather than leaving them to
      // discover it when a password reset has nowhere to go.
      emailIsPlaceholder: user.email.endsWith(".invalid"),
      capabilities,
      chamber: await chamberOf(user.firmId),
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
    const user = await tenant(req).db.user.findUnique({ where: { id: staffSession(req).sub } });
    if (!user) {
      throw new ApiError(401, "Your session has expired. Sign in again.");
    }

    res.json({
      id: user.id,
      email: user.email,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
      emailIsPlaceholder: user.email.endsWith(".invalid"),
      capabilities: await capabilitiesOf(user.firmId, user.role),
      chamber: await chamberOf(user.firmId),
    });
  })
);

authRouter.post(
  "/change-password",
  requireStaff,
  validate(changePasswordSchema),
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body as { currentPassword: string; newPassword: string };

    const { db } = tenant(req);
    const user = await db.user.findUnique({ where: { id: staffSession(req).sub } });
    if (!user) {
      throw new ApiError(401, "Your session has expired. Sign in again.");
    }

    const valid = await verifyPassword(currentPassword, user.passwordHash);
    if (!valid) {
      throw new ApiError(400, "That is not your current password.");
    }

    await db.user.update({
      where: { id: user.id },
      data: {
        passwordHash: await hashPassword(newPassword),
        mustChangePassword: false,
      },
    });

    res.status(204).end();
  })
);

/**
 * Replacing the address you sign in with.
 *
 * Needs the password, not just the session: an unattended signed-in screen
 * must not be enough to move somebody's sign-in to an address the person
 * at the keyboard controls.
 */
authRouter.post(
  "/change-email",
  requireStaff,
  validate(changeEmailSchema),
  asyncHandler(async (req, res) => {
    const { password, email } = req.body as { password: string; email: string };

    const { db } = tenant(req);
    const user = await db.user.findUnique({ where: { id: staffSession(req).sub } });
    if (!user) throw new ApiError(401, "Your session has expired. Sign in again.");

    if (!(await verifyPassword(password, user.passwordHash))) {
      throw new ApiError(400, "That is not your password.");
    }

    // Unscoped, because the address is unique across the platform. It says
    // only that some account somewhere holds it, which the person is about
    // to discover anyway by being unable to use it.
    const taken = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (taken && taken.id !== user.id) {
      throw new ApiError(400, "Another account already signs in with that address.");
    }

    await db.user.update({ where: { id: user.id }, data: { email } });
    res.status(204).end();
  })
);

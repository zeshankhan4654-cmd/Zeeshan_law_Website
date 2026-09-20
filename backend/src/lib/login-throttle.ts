import { prisma } from "./prisma.js";
import { env } from "../config/env.js";

/**
 * Login attempt throttling, per (scope, identity, ip) — so a client login and
 * a staff login for the same name are tracked independently, and one bad
 * actor hammering an account from one address doesn't lock everyone else
 * signing in from elsewhere.
 */

/** Minutes remaining before this identity may try again, or 0 if not locked. */
export async function lockMinutesRemaining(scope: string, identity: string, ip: string): Promise<number> {
  const row = await prisma.rateLimit.findUnique({
    where: { scope_identity_ip: { scope, identity, ip } },
  });
  if (!row?.lockedUntil) return 0;

  const msLeft = row.lockedUntil.getTime() - Date.now();
  return msLeft > 0 ? Math.ceil(msLeft / 60_000) : 0;
}

/** Record one failed attempt, locking the identity out once the threshold is hit. */
export async function recordFailure(scope: string, identity: string, ip: string): Promise<void> {
  const existing = await prisma.rateLimit.findUnique({
    where: { scope_identity_ip: { scope, identity, ip } },
  });
  const attempts = (existing?.attempts ?? 0) + 1;
  const lockedUntil =
    attempts >= env.login.maxAttempts
      ? new Date(Date.now() + env.login.lockoutMinutes * 60_000)
      : null;

  await prisma.rateLimit.upsert({
    where: { scope_identity_ip: { scope, identity, ip } },
    create: { scope, identity, ip, attempts, lockedUntil },
    update: { attempts, lockedUntil },
  });
}

/** A successful sign-in clears the identity's record entirely. */
export async function clearFailures(scope: string, identity: string, ip: string): Promise<void> {
  await prisma.rateLimit.deleteMany({ where: { scope, identity, ip } });
}

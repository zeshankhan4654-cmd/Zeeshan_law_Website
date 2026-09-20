import { prisma } from "./prisma.js";

/**
 * A general counter of attempts, keyed by (scope, identity, ip).
 *
 * The sign-in throttle is one user of this; the public enquiry form is the
 * other. An enquiry form is the only place on the whole site where an
 * unauthenticated stranger can write to the database, so it gets a limit
 * that is generous to a person and tiresome to a script.
 */

/** Seconds until this key may act again, or 0 if it may act now. */
export async function secondsUntilAllowed(
  scope: string,
  identity: string,
  ip: string
): Promise<number> {
  const row = await prisma.rateLimit.findUnique({
    where: { scope_identity_ip: { scope, identity, ip } },
  });
  if (!row?.lockedUntil) return 0;

  const msLeft = row.lockedUntil.getTime() - Date.now();
  return msLeft > 0 ? Math.ceil(msLeft / 1000) : 0;
}

/**
 * Counts one action. Once `max` are counted the key is held off for
 * `cooloffMinutes`, after which the count starts again.
 */
export async function countAction(
  scope: string,
  identity: string,
  ip: string,
  max: number,
  cooloffMinutes: number
): Promise<void> {
  const existing = await prisma.rateLimit.findUnique({
    where: { scope_identity_ip: { scope, identity, ip } },
  });

  // A lock that has run out starts a fresh count rather than resuming an
  // old one — otherwise one burst yesterday makes today's first attempt the
  // last one.
  const expired = existing?.lockedUntil !== null && (existing?.lockedUntil?.getTime() ?? 0) <= Date.now();
  const attempts = expired ? 1 : (existing?.attempts ?? 0) + 1;

  const lockedUntil =
    attempts >= max ? new Date(Date.now() + cooloffMinutes * 60_000) : null;

  await prisma.rateLimit.upsert({
    where: { scope_identity_ip: { scope, identity, ip } },
    create: { scope, identity, ip, attempts, lockedUntil },
    update: { attempts, lockedUntil },
  });
}

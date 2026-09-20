import { env } from "../config/env.js";
import { prisma } from "./prisma.js";
import { forFirm, type FirmClient } from "./tenant.js";

/**
 * The chamber whose public website this server serves.
 *
 * Everything behind a sign-in knows its chamber from the session. The
 * public pages have no session, so they need to be told: without this, the
 * moment a second advocate publishes an article it would appear on the
 * first one's website, and a stranger reading arbitratorandlaw.com would be
 * reading another chamber's writing under this chamber's name.
 *
 * One deployment therefore serves one chamber's public face, named by
 * `PLATFORM_FIRM_SLUG`. When chambers get public pages of their own they
 * will be resolved from the request's host or path instead, and this
 * becomes the fallback for the bare domain.
 */

/** Resolved once. A slug's id does not change, and a firm is not renumbered. */
let resolved: number | null = null;

export async function platformFirmId(): Promise<number> {
  if (resolved !== null) return resolved;

  const firm = await prisma.firm.findUnique({
    where: { slug: env.platformFirmSlug },
    select: { id: true },
  });

  if (!firm) {
    // Fail loudly. Guessing "the first firm" here would quietly publish
    // somebody else's chamber on this domain.
    throw new Error(
      `No chamber has the slug "${env.platformFirmSlug}". ` +
        "Set PLATFORM_FIRM_SLUG to the chamber whose website this server serves."
    );
  }

  resolved = firm.id;
  return resolved;
}

/** A scoped client for the public site's own chamber. */
export async function platformDb(): Promise<FirmClient> {
  return forFirm(await platformFirmId());
}

/** For tests, which create and destroy chambers within one process. */
export function forgetPlatformFirm(): void {
  resolved = null;
}

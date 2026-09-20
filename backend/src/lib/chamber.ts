import { prisma } from "./prisma.js";

/**
 * Creating a chamber.
 *
 * Shared by public sign-up and by anything the platform admin does later,
 * so a chamber made either way is the same chamber.
 */

/** Reserved at the front of the URL space, or too confusing to hand out. */
const RESERVED_SLUGS = new Set([
  "admin", "api", "app", "assets", "auth", "blog", "client", "clients",
  "contact", "dashboard", "help", "login", "logout", "office", "platform",
  "portal", "public", "resources", "settings", "signup", "static", "support",
  "www",
]);

/**
 * "The Arbitrator & Law Associates" -> "arbitrator-law-associates".
 *
 * The slug goes in the link an advocate sends their clients, so it is worth
 * it being readable: a client asked to open a URL full of digits has a
 * reason to think it is a scam.
 */
export function proposeSlug(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
    .replace(/-+$/g, "");

  return base || "chamber";
}

/** The first free slug at or after this one. */
export async function freeSlug(name: string): Promise<string> {
  const base = proposeSlug(name);

  for (let n = 0; ; n += 1) {
    const candidate = n === 0 ? base : `${base}-${n + 1}`;
    if (RESERVED_SLUGS.has(candidate)) continue;

    const taken = await prisma.firm.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!taken) return candidate;
  }
}

/** "Naveed Ahmad" -> "naveed.ahmad", free within this chamber. */
export async function freeUsername(firmId: number, fullName: string): Promise<string> {
  const parts = fullName.toLowerCase().replace(/[^a-z\s]/g, " ").split(/\s+/).filter(Boolean);
  const base = (parts.length > 1 ? `${parts[0]}.${parts[parts.length - 1]}` : parts[0]) || "staff";

  for (let n = 0; ; n += 1) {
    const candidate = n === 0 ? base : `${base}${n + 1}`;
    // Scoped to the chamber: two chambers may each have a naveed.ahmad, and
    // asking across the platform would both refuse a free name and tell the
    // asker that somebody they cannot see exists.
    const taken = await prisma.user.findUnique({
      where: { firmId_username: { firmId, username: candidate } },
      select: { id: true },
    });
    if (!taken) return candidate;
  }
}

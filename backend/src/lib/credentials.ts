import { randomBytes } from "node:crypto";
import { prisma } from "./prisma.js";

/**
 * Issuing a sign-in.
 *
 * Shared by the office screens and the command-line scripts so both produce
 * the same thing — a password that can be read down a telephone line, shown
 * once, and stored only as a hash.
 */

/** No l/1 and no o/0: these get read aloud and written down. */
const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

export function generatePassword(length = 14): string {
  return Array.from(randomBytes(length), (b) => ALPHABET[b % ALPHABET.length]).join("");
}

/** "Fazal ur Rehman" -> "fazal.rehman", made unique against a taken-check. */
export async function proposeUsername(
  name: string,
  isTaken: (candidate: string) => Promise<boolean>,
  fallback = "client"
): Promise<string> {
  const parts = name.toLowerCase().replace(/[^a-z\s]/g, " ").split(/\s+/).filter(Boolean);
  const base = (parts.length > 1 ? `${parts[0]}.${parts[parts.length - 1]}` : parts[0]) || fallback;

  for (let n = 0; ; n += 1) {
    const candidate = n === 0 ? base : `${base}${n + 1}`;
    if (!(await isTaken(candidate))) return candidate;
  }
}

export const portalUsernameTaken = async (candidate: string): Promise<boolean> =>
  (await prisma.client.findUnique({ where: { portalUsername: candidate } })) !== null;

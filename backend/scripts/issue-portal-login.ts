/**
 * Issues a client portal sign-in from the command line.
 *
 *   npm run portal:issue -- "Fazal ur Rehman"
 *
 * Phase 5 puts this behind the Clients screen, where a clerk with the
 * clients.portal capability does it in two clicks. Until then this is how a
 * client gets into the app, and it is also the only sanctioned way to reset a
 * forgotten password: the password is generated here, printed once, and
 * stored only as a bcrypt hash.
 */
import { randomBytes } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/password.js";

const prisma = new PrismaClient();

/** A password that can be read down a phone line without spelling it out. */
function generatePassword(): string {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789"; // no l/1, no o/0
  const bytes = randomBytes(14);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

/** "Fazal ur Rehman" -> "fazal.rehman", made unique if it is already taken. */
async function proposeUsername(name: string): Promise<string> {
  const parts = name.toLowerCase().replace(/[^a-z\s]/g, " ").split(/\s+/).filter(Boolean);
  const base = (parts.length > 1 ? `${parts[0]}.${parts[parts.length - 1]}` : parts[0]) || "client";

  for (let n = 0; ; n += 1) {
    const candidate = n === 0 ? base : `${base}${n + 1}`;
    const taken = await prisma.client.findUnique({ where: { portalUsername: candidate } });
    if (!taken) return candidate;
  }
}

async function main() {
  const name = process.argv.slice(2).join(" ").trim();
  if (!name) {
    console.error('Usage: npm run portal:issue -- "Client Name"');
    process.exit(1);
  }

  const existing = await prisma.client.findFirst({ where: { name } });
  const client = existing ?? (await prisma.client.create({ data: { name } }));

  const username = client.portalUsername ?? (await proposeUsername(name));
  const password = generatePassword();

  await prisma.client.update({
    where: { id: client.id },
    data: {
      portalEnabled: true,
      portalUsername: username,
      portalHash: await hashPassword(password),
      portalMustChangePassword: true,
    },
  });

  console.log(`\n  ${existing ? "Portal access reset for" : "Client created:"} ${client.name}`);
  console.log(`  username  ${username}`);
  console.log(`  password  ${password}`);
  console.log("\n  Give these to the client directly. The password is not stored and");
  console.log("  cannot be shown again; the app makes them choose their own on first");
  console.log("  sign-in. Run this again to issue a fresh one.\n");
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

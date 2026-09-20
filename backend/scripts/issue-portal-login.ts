/**
 * Issues a client portal sign-in from the command line.
 *
 *   npm run portal:issue -- "Fazal ur Rehman"
 *   npm run portal:issue -- --firm other-chamber "Fazal ur Rehman"
 *
 * The chamber defaults to the one this deployment's website serves; a
 * different one is named with --firm. The Clients screen does the same
 * thing in two clicks for a clerk with the clients.portal capability, and
 * this stays as the way to reset a forgotten password from a terminal: the
 * password is generated here, printed once, and stored only as a bcrypt
 * hash.
 */
import { randomBytes } from "node:crypto";
import { hashPassword } from "../src/lib/password.js";
import { prisma } from "../src/lib/prisma.js";
import { forFirm } from "../src/lib/tenant.js";
import { resolveChamber, takeFirmArg } from "./chamber-arg.js";

/** A password that can be read down a phone line without spelling it out. */
function generatePassword(): string {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789"; // no l/1, no o/0
  const bytes = randomBytes(14);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

/**
 * "Fazal ur Rehman" -> "fazal.rehman", made unique within this chamber.
 *
 * Within, not across: two advocates may each act for a Fazal ur Rehman, and
 * the chamber is supplied by the link the client is sent.
 */
async function proposeUsername(firmId: number, name: string): Promise<string> {
  const parts = name.toLowerCase().replace(/[^a-z\s]/g, " ").split(/\s+/).filter(Boolean);
  const base = (parts.length > 1 ? `${parts[0]}.${parts[parts.length - 1]}` : parts[0]) || "client";

  for (let n = 0; ; n += 1) {
    const candidate = n === 0 ? base : `${base}${n + 1}`;
    const taken = await prisma.client.findUnique({
      where: { firmId_portalUsername: { firmId, portalUsername: candidate } },
      select: { id: true },
    });
    if (!taken) return candidate;
  }
}

async function main() {
  const { slug, rest } = takeFirmArg(process.argv.slice(2));
  const name = rest.join(" ").trim();
  if (!name) {
    console.error('Usage: npm run portal:issue -- [--firm <slug>] "Client Name"');
    process.exit(1);
  }

  const chamber = await resolveChamber(slug);
  const db = forFirm(chamber.id);

  const existing = await db.client.findFirst({ where: { name } });
  const client =
    existing ?? (await db.client.create({ data: { firmId: chamber.id, name } }));

  const username = client.portalUsername ?? (await proposeUsername(chamber.id, name));
  const password = generatePassword();

  await db.client.update({
    where: { id: client.id },
    data: {
      portalEnabled: true,
      portalUsername: username,
      portalHash: await hashPassword(password),
      portalMustChangePassword: true,
    },
  });

  console.log(`\n  Chamber: ${chamber.name} (${chamber.slug})`);
  console.log(`  ${existing ? "Portal access reset for" : "Client created:"} ${client.name}`);
  console.log(`  username  ${username}`);
  console.log(`  password  ${password}`);
  console.log(`  sign-in    /client/login/${chamber.slug}`);
  console.log("\n  Give these to the client directly, along with that link — the");
  console.log("  chamber is part of signing in, so the username alone is not enough.");
  console.log("  The password is not stored and");
  console.log("  cannot be shown again; the app makes them choose their own on first");
  console.log("  sign-in. Run this again to issue a fresh one.\n");
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

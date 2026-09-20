/**
 * Creates a chamber account, or resets one, from the command line.
 *
 *   npm run staff:issue -- "Naveed Ahmad" editor naveed@example.com
 *   npm run staff:issue -- --firm other-chamber "Naveed Ahmad" editor n@x.com
 *
 * The email address is how they sign in and is required for a new account.
 * Resetting an existing one may leave it off to keep the address they have.
 *
 * The chamber defaults to the one this deployment's website serves; a
 * different one is named with --firm. The role must already exist in that
 * chamber (admin, editor and associate are seeded — see prisma/seed.ts).
 * Roles & Access does this in the office; this stays as the terminal way in
 * and the sanctioned way to reset a forgotten password.
 */
import { randomBytes } from "node:crypto";
import { hashPassword } from "../src/lib/password.js";
import { prisma } from "../src/lib/prisma.js";
import { forFirm } from "../src/lib/tenant.js";
import { resolveChamber, takeFirmArg } from "./chamber-arg.js";

function generatePassword(): string {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789"; // no l/1, no o/0
  return Array.from(randomBytes(14), (b) => alphabet[b % alphabet.length]).join("");
}

/** The handle inside this chamber, which another chamber may also use. */
async function proposeUsername(firmId: number, name: string): Promise<string> {
  const parts = name.toLowerCase().replace(/[^a-z\s]/g, " ").split(/\s+/).filter(Boolean);
  const base = (parts.length > 1 ? `${parts[0]}.${parts[parts.length - 1]}` : parts[0]) || "staff";

  for (let n = 0; ; n += 1) {
    const candidate = n === 0 ? base : `${base}${n + 1}`;
    const taken = await prisma.user.findUnique({
      where: { firmId_username: { firmId, username: candidate } },
      select: { id: true },
    });
    if (!taken) return candidate;
  }
}

async function main() {
  const { slug, rest } = takeFirmArg(process.argv.slice(2));
  const [name, roleKey, email] = [rest[0]?.trim(), rest[1]?.trim(), rest[2]?.trim().toLowerCase()];

  const chamber = await resolveChamber(slug);
  const db = forFirm(chamber.id);

  if (!name || !roleKey) {
    console.error(
      'Usage: npm run staff:issue -- [--firm <slug>] "Full Name" <role> [email]'
    );
    const roles = await db.role.findMany({ orderBy: { sortOrder: "asc" } });
    console.error(`Roles in ${chamber.name}: ${roles.map((r) => r.roleKey).join(", ")}`);
    process.exit(1);
  }

  const role = await db.role.findFirst({ where: { roleKey } });
  if (!role) throw new Error(`No role "${roleKey}" in ${chamber.name}.`);

  const existing = await db.user.findFirst({ where: { fullName: name } });

  if (!existing && !email) {
    throw new Error(
      "A new account needs an email address to sign in with:\n" +
        `  npm run staff:issue -- --firm ${chamber.slug} "${name}" ${roleKey} them@example.com`
    );
  }

  // Unscoped: the address is how sign-in finds an account at all, so it is
  // unique across the platform. The message names no chamber.
  if (email) {
    const taken = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (taken && taken.id !== existing?.id) {
      throw new Error("An account already signs in with that email address.");
    }
  }

  const username = existing?.username ?? (await proposeUsername(chamber.id, name));
  const password = generatePassword();
  const passwordHash = await hashPassword(password);

  if (existing) {
    await db.user.update({
      where: { id: existing.id },
      data: {
        passwordHash,
        role: roleKey,
        mustChangePassword: true,
        ...(email ? { email } : {}),
      },
    });
  } else {
    await db.user.create({
      data: {
        firmId: chamber.id,
        username,
        email: email as string,
        passwordHash,
        fullName: name,
        role: roleKey,
        mustChangePassword: true,
      },
    });
  }

  console.log(`\n  Chamber: ${chamber.name} (${chamber.slug})`);
  console.log(`  ${existing ? "Reset" : "Created"}: ${name} (${role.label})`);
  console.log(`  sign in   ${email ?? existing?.email ?? ""}`);
  console.log(`  handle    ${username}`);
  console.log(`  password  ${password}`);
  console.log("\n  Printed once; only the hash is stored. They must choose their");
  console.log("  own password on first sign-in.\n");
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

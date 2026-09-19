/**
 * Creates a chamber account, or resets one, from the command line.
 *
 *   npm run staff:issue -- "Naveed Ahmad" editor
 *
 * The role must already exist (admin, editor, associate ship as defaults —
 * see prisma/seed.ts). Phase 6 puts this behind Roles & Access; until then
 * this is how a clerk or colleague gets in, and the only sanctioned way to
 * reset a forgotten password.
 */
import { randomBytes } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/password.js";

const prisma = new PrismaClient();

function generatePassword(): string {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789"; // no l/1, no o/0
  return Array.from(randomBytes(14), (b) => alphabet[b % alphabet.length]).join("");
}

async function proposeUsername(name: string): Promise<string> {
  const parts = name.toLowerCase().replace(/[^a-z\s]/g, " ").split(/\s+/).filter(Boolean);
  const base = (parts.length > 1 ? `${parts[0]}.${parts[parts.length - 1]}` : parts[0]) || "staff";

  for (let n = 0; ; n += 1) {
    const candidate = n === 0 ? base : `${base}${n + 1}`;
    if (!(await prisma.user.findUnique({ where: { username: candidate } }))) return candidate;
  }
}

async function main() {
  const [name, roleKey] = [process.argv[2]?.trim(), process.argv[3]?.trim()];
  if (!name || !roleKey) {
    console.error('Usage: npm run staff:issue -- "Full Name" <role>');
    const roles = await prisma.role.findMany({ orderBy: { sortOrder: "asc" } });
    console.error(`Roles: ${roles.map((r) => r.roleKey).join(", ")}`);
    process.exit(1);
  }

  const role = await prisma.role.findUnique({ where: { roleKey } });
  if (!role) throw new Error(`No role "${roleKey}".`);

  const existing = await prisma.user.findFirst({ where: { fullName: name } });
  const username = existing?.username ?? (await proposeUsername(name));
  const password = generatePassword();
  const passwordHash = await hashPassword(password);

  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: { passwordHash, role: roleKey, mustChangePassword: true },
    });
  } else {
    await prisma.user.create({
      data: { username, passwordHash, fullName: name, role: roleKey, mustChangePassword: true },
    });
  }

  console.log(`\n  ${existing ? "Reset" : "Created"}: ${name} (${role.label})`);
  console.log(`  username  ${username}`);
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

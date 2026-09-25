import { randomInt } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/password.js";
import { seedChamberRoles } from "../src/lib/default-roles.js";
import { forFirm } from "../src/lib/tenant.js";
import { RESEARCH_ARTICLES } from "./seed-data/research.js";

const prisma = new PrismaClient();

/**
 * Everything seeded belongs to one chamber — the one this deployment's
 * public site serves. On a multi-chamber platform there is no such thing as
 * "the roles" or "the first admin" any more; each chamber gets its own set
 * when it is created, and this seeds the first one.
 */
const FIRM_SLUG = process.env.PLATFORM_FIRM_SLUG ?? "arbitrator-law";

/**
 * The first account's starting password, made fresh every time.
 *
 * This used to be a fixed word written in this file, which is safe only
 * while nobody outside can read the file. This repository is public, so it
 * was not: the account exists from the moment the database is seeded until
 * somebody signs in and changes the password, and the one thing
 * `mustChangePassword` still permits is that change. A starting password
 * anyone can look up hands that window — and with it the chamber's admin
 * account — to whoever reaches the deployment first.
 *
 * It is printed once, to whoever ran the deployment, and kept nowhere but
 * as a hash. Lose it before signing in and the answer is to delete the row
 * and seed again, which is the correct trade.
 *
 * The alphabet leaves out the characters that are read wrongly off a
 * terminal — no O/0, no l/1/I — because this gets typed by hand, once,
 * usually on a phone.
 */
const SAFE_CHARS = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function startingPassword(): string {
  let out = "";
  for (let i = 0; i < 20; i += 1) out += SAFE_CHARS[randomInt(SAFE_CHARS.length)];
  return out.replace(/(.{5})(?=.)/g, "$1-");
}

async function main() {
  const firm = await prisma.firm.upsert({
    where: { slug: FIRM_SLUG },
    create: { slug: FIRM_SLUG, name: "The Arbitrator & Law Associates" },
    update: {},
  });
  const firmId = firm.id;
  console.log(`Seeding chamber "${firm.name}" (${FIRM_SLUG}).`);

  // The same starting roles a chamber gets when an advocate signs one up,
  // from the same place, so the first chamber and the thousandth match.
  await seedChamberRoles(forFirm(firmId), firmId);

  // A way in on a fresh database. The app refuses to let this account touch
  // anything else until its password has been changed — see
  // requireNoPendingPasswordChange. Change it immediately once you are in.
  const existingAdmin = await prisma.user.count({ where: { firmId, role: "admin" } });
  if (existingAdmin === 0) {
    // `.invalid` is reserved by RFC 2606, so this placeholder can never be
    // a real address and can never collide with one. It signs in, and the
    // office tells its holder to replace it.
    const email = `admin@${FIRM_SLUG}.invalid`;
    const password = startingPassword();
    await prisma.user.create({
      data: {
        firmId,
        username: "admin",
        email,
        passwordHash: await hashPassword(password),
        fullName: "Principal",
        role: "admin",
        mustChangePassword: true,
      },
    });
    // Loud, because it is shown once and a deployment prints a great deal.
    console.log(
      [
        "",
        "  ┌─────────────────────────────────────────────────────────────┐",
        "  │  A first account has been made. This is shown ONCE.         │",
        "  └─────────────────────────────────────────────────────────────┘",
        "",
        `      sign in     ${email}`,
        `      password    ${password}`,
        "",
        "  Sign in and change both now. The account can do nothing else",
        "  until the password is changed, and that address is a reserved",
        "  placeholder that can never receive mail.",
        "",
      ].join("\n")
    );
  } else {
    console.log("An admin account already exists; skipped seeding one.");
  }

  // The chamber's opening library. Only seeded into an empty library, so a
  // re-run never duplicates them or overwrites edits made in the office.
  const existingResearch = await prisma.research.count({ where: { firmId } });
  if (existingResearch === 0) {
    await prisma.research.createMany({
      data: RESEARCH_ARTICLES.map((a) => ({
        ...a,
        firmId,
        published: true,
        // Also in the shared library, not merely on the chamber's own
        // site. Without this a fresh install has an empty public library:
        // the migration that approved already-published entries runs
        // before this seed writes any, so these would sit at "private"
        // for ever and nothing would appear on the Resources page.
        //
        // Safe to approve unreviewed only because these are the platform
        // chamber's own articles, shipped with the product. Nothing any
        // other chamber writes is ever approved without being read.
        shareState: "approved",
        sharedAt: new Date(),
        shareNote: "Seeded with the platform.",
      })),
    });
    console.log(
      `Seeded ${RESEARCH_ARTICLES.length} legal research articles into the shared library.`
    );
  } else {
    console.log("The research library already has entries; skipped seeding.");
  }

  console.log("Seed complete.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

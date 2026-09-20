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
    await prisma.user.create({
      data: {
        firmId,
        username: "admin",
        email,
        passwordHash: await hashPassword("admin123"),
        fullName: "Principal",
        role: "admin",
        mustChangePassword: true,
      },
    });
    console.log(
      `Seeded a first account: sign in with "${email}", password "admin123" — ` +
        "change both on first sign-in."
    );
  } else {
    console.log("An admin account already exists; skipped seeding one.");
  }

  // The chamber's opening library. Only seeded into an empty library, so a
  // re-run never duplicates them or overwrites edits made in the office.
  const existingResearch = await prisma.research.count({ where: { firmId } });
  if (existingResearch === 0) {
    await prisma.research.createMany({
      data: RESEARCH_ARTICLES.map((a) => ({ ...a, firmId, published: true })),
    });
    console.log(`Seeded ${RESEARCH_ARTICLES.length} legal research articles.`);
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

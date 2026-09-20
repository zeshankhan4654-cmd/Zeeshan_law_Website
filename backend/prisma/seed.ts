import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/password.js";
import { RESEARCH_ARTICLES } from "./seed-data/research.js";

const prisma = new PrismaClient();

const DEFAULT_ROLES = [
  { roleKey: "admin", label: "Principal", description: "Everything, including accounts and deleting records", isSystem: true, sortOrder: 10 },
  { roleKey: "editor", label: "Clerk", description: "Day-to-day work, the diaries, the money, and the website", isSystem: true, sortOrder: 20 },
  { roleKey: "associate", label: "Colleague", description: "Case work only, with no money and no accounts", isSystem: true, sortOrder: 30 },
];

const EDITOR_CAPS = [
  "cases.view", "cases.edit",
  "clients.view", "clients.edit", "clients.portal",
  "hearings.edit", "updates.edit",
  "documents.edit", "messages.reply",
  "money.view", "money.edit",
  "comms.view", "comms.edit",
  "library.view", "library.edit", "library.publish",
  "enquiries.view",
  "blog.edit", "testimonials.edit",
];

const ASSOCIATE_CAPS = [
  "cases.view", "cases.edit",
  "clients.view", "clients.edit",
  "hearings.edit", "updates.edit",
  "documents.edit", "messages.reply",
  "comms.view", "comms.edit",
  "library.view", "library.edit",
  "enquiries.view",
];

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

  for (const role of DEFAULT_ROLES) {
    await prisma.role.upsert({
      where: { firmId_roleKey: { firmId, roleKey: role.roleKey } },
      create: { ...role, firmId },
      update: role,
    });
  }

  const grants = [
    ...EDITOR_CAPS.map((cap) => ({ roleKey: "editor", cap })),
    ...ASSOCIATE_CAPS.map((cap) => ({ roleKey: "associate", cap })),
  ];
  for (const grant of grants) {
    await prisma.roleCap.upsert({
      where: { firmId_roleKey_cap: { firmId, ...grant } },
      create: { ...grant, firmId },
      update: {},
    });
  }

  // A way in on a fresh database. The app refuses to let this account touch
  // anything else until its password has been changed — see
  // requireNoPendingPasswordChange. Change it immediately once you are in.
  const existingAdmin = await prisma.user.count({ where: { firmId, role: "admin" } });
  if (existingAdmin === 0) {
    await prisma.user.create({
      data: {
        firmId,
        username: "admin",
        passwordHash: await hashPassword("admin123"),
        fullName: "Principal",
        role: "admin",
        mustChangePassword: true,
      },
    });
    console.log('Seeded a first account: username "admin", password "admin123" — change it on first sign-in.');
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

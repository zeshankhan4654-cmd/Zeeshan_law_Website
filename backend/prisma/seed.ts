import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/password.js";

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

async function main() {
  for (const role of DEFAULT_ROLES) {
    await prisma.role.upsert({
      where: { roleKey: role.roleKey },
      create: role,
      update: role,
    });
  }

  const grants = [
    ...EDITOR_CAPS.map((cap) => ({ roleKey: "editor", cap })),
    ...ASSOCIATE_CAPS.map((cap) => ({ roleKey: "associate", cap })),
  ];
  for (const grant of grants) {
    await prisma.roleCap.upsert({
      where: { roleKey_cap: grant },
      create: grant,
      update: {},
    });
  }

  // A way in on a fresh database. The app refuses to let this account touch
  // anything else until its password has been changed — see
  // requireNoPendingPasswordChange. Change it immediately once you are in.
  const existingAdmin = await prisma.user.count({ where: { role: "admin" } });
  if (existingAdmin === 0) {
    await prisma.user.create({
      data: {
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

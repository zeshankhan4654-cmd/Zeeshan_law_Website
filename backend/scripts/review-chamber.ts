/**
 * A chamber of invented matters, for a store reviewer to sign in to.
 *
 *   npm run review:chamber
 *   npm run review:chamber -- --slug play-review
 *
 * Google will not review an app it cannot get past the sign-in screen of,
 * so a working account has to be handed to a stranger. The obvious way is
 * to make one in the chamber that is already there, and it is the wrong
 * way: it puts a real client's file, a real case number and a real fee in
 * front of somebody with no business seeing any of it, and nothing in the
 * app distinguishes a reviewer from anyone else once they are inside.
 *
 * So the reviewer gets a chamber of their own, holding nothing real. Every
 * name, matter, figure and citation written below is invented. No citation
 * here refers to a decided case and none should be relied on for anything.
 *
 * Unlike demo:data this is allowed to run against production, because the
 * production server is exactly where the reviewer will sign in. What keeps
 * that safe is not the environment but the scope: it resolves one chamber,
 * refuses to proceed if that chamber is the one this deployment serves, and
 * writes only through a client locked to the chamber it made.
 *
 * Running it again refreshes that chamber's sample matters and re-issues
 * the password. It never reads or writes another chamber's rows.
 */
import { randomBytes } from "node:crypto";
import { seedChamberRoles } from "../src/lib/default-roles.js";
import { hashPassword } from "../src/lib/password.js";
import { prisma } from "../src/lib/prisma.js";
import { forFirm } from "../src/lib/tenant.js";

const DEFAULT_SLUG = "play-review";

function generatePassword(): string {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789"; // no l/1, no o/0
  return Array.from(randomBytes(14), (b) => alphabet[b % alphabet.length]).join("");
}

function day(offset: number): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offset);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function readSlug(argv: string[]): string {
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--slug") {
      const value = argv[i + 1];
      if (!value) throw new Error("--slug needs a value after it.");
      return value;
    }
    if (arg?.startsWith("--slug=")) return arg.slice("--slug=".length);
  }
  return DEFAULT_SLUG;
}

async function main() {
  const slug = readSlug(process.argv.slice(2));

  // The one refusal that matters. PLATFORM_FIRM_SLUG names the chamber
  // whose real records this deployment serves; a mistyped --slug that
  // landed on it would wipe that chamber's matters and hand a stranger a
  // sign-in to them.
  const platformSlug = process.env.PLATFORM_FIRM_SLUG ?? "arbitrator-law";
  if (slug === platformSlug) {
    throw new Error(
      `Refusing: "${slug}" is the chamber this deployment serves, which holds real records. ` +
        "The reviewer's chamber must be a separate one."
    );
  }

  const firm = await prisma.firm.upsert({
    where: { slug },
    create: { slug, name: "Sample Chamber (for app review)" },
    update: {},
  });
  const firmId = firm.id;
  const db = forFirm(firmId);

  // Belt and braces: everything past this point goes through `db`, which
  // cannot see or touch another chamber's rows whatever this file asks for.
  console.log(`Chamber "${firm.name}" (${slug}), id ${firmId}.`);

  await seedChamberRoles(db, firmId);

  // ---- clear this chamber's own sample matters ---------------------------
  // Children first: the schema does not cascade, and a client cannot go
  // while a case points at it.
  await db.diaryTask.deleteMany({});
  await db.communication.deleteMany({});
  await db.expense.deleteMany({});
  await db.officialFee.deleteMany({});
  await db.fee.deleteMany({});
  await db.hearing.deleteMany({});
  await db.case.deleteMany({});
  await db.client.deleteMany({});
  await db.judgment.deleteMany({});
  await db.libraryFolder.deleteMany({});

  // ---- the people --------------------------------------------------------
  const rehman = await db.client.create({
    data: {
      firmId,
      name: "Fazal ur Rehman",
      fatherName: "Gul Muhammad",
      cnic: "17301-1234567-1",
      phone: "0300 1234567",
      address: "Sample address, Peshawar",
      portalEnabled: false,
      notes: "Sample client. Not a real person.",
    },
  });

  const rukhsana = await db.client.create({
    data: {
      firmId,
      name: "Rukhsana Bibi",
      fatherName: "Abdul Karim",
      cnic: "17301-7654321-8",
      phone: "0311 7654321",
      portalEnabled: false,
      notes: "Sample client. Not a real person.",
    },
  });

  // ---- the matters -------------------------------------------------------
  const appeal = await db.case.create({
    data: {
      firmId,
      clientId: rehman.id,
      title: "Sample Criminal Appeal",
      caseNo: "Cr.A. 412/2026",
      court: "Sample High Court",
      caseType: "Criminal Appeal",
      sections: "Section 302, Pakistan Penal Code",
      firDetails: "FIR 214/2025, Sample Police Station, 4 May 2025",
      ourSide: "Appellant",
      opposingParty: "The State",
      judge: "Sample Judge",
      stage: "Arguments",
      status: "Active",
      filedOn: day(-120),
      nextHearing: day(2),
      assignedTo: "Sample Associate",
      notes: "Sample matter, for app review. Invented throughout.",
    },
  });

  const maintenance = await db.case.create({
    data: {
      firmId,
      clientId: rukhsana.id,
      title: "Sample Family Suit for maintenance",
      caseNo: "Suit 118/2026",
      court: "Sample Family Court",
      caseType: "Family",
      ourSide: "Plaintiff",
      opposingParty: "Sample Respondent",
      stage: "Framing of issues",
      status: "Active",
      filedOn: day(-60),
      nextHearing: day(6),
      assignedTo: "Sample Associate",
    },
  });

  // ---- hearings: one written up, one still to come -----------------------
  await db.hearing.create({
    data: {
      firmId,
      caseId: appeal.id,
      hearingDate: day(-7),
      purpose: "Framing of issues",
      outcome: "Adjourned at the respondent's request.",
      orderSheet: "Sample order sheet. To come up for issues.",
      attendedBy: "Sample Associate",
      nextDate: day(2),
    },
  });
  await db.hearing.create({
    data: { firmId, caseId: appeal.id, hearingDate: day(2), purpose: "Arguments on the appeal" },
  });
  await db.hearing.create({
    data: { firmId, caseId: maintenance.id, hearingDate: day(6), purpose: "Reconciliation proceedings" },
  });

  // ---- money -------------------------------------------------------------
  await db.fee.create({
    data: { firmId, caseId: appeal.id, kind: "Agreed", amount: 150000, entryDate: day(-110),
            note: "Sample brief fee", createdBy: "review" },
  });
  await db.fee.create({
    data: { firmId, caseId: appeal.id, kind: "Received", amount: 75000, entryDate: day(-100),
            mode: "Bank", receiptNo: "SAMPLE-001", note: "Sample first instalment", createdBy: "review" },
  });
  await db.officialFee.create({
    data: { firmId, caseId: appeal.id, kind: "Court fee", description: "Sample registry charge",
            amount: 2400, entryDate: day(-100), receiptNo: "SAMPLE-R-9001", paidBy: "Chamber",
            createdBy: "review" },
  });
  await db.expense.create({
    data: { firmId, category: "Travel", amount: 1800, expenseDate: day(-20),
            description: "Sample travel to court", paidTo: "Sample", mode: "Cash",
            caseId: appeal.id, createdBy: "review" },
  });

  // ---- the diary ---------------------------------------------------------
  await db.diaryTask.create({
    data: { firmId, taskDate: day(-3), title: "Sample: collect the certified copy",
            notes: "Sample note.", priority: "Urgent", caseId: appeal.id, createdBy: "review" },
  });
  await db.diaryTask.create({
    data: { firmId, taskDate: day(0), title: "Sample: file the rejoinder", priority: "Normal",
            caseId: maintenance.id, createdBy: "review" },
  });
  await db.diaryTask.create({
    data: { firmId, taskDate: day(0), title: "Sample: pay the process fee", priority: "Normal",
            done: true, doneAt: day(0), createdBy: "review" },
  });

  // ---- a call, with something to follow up -------------------------------
  await db.communication.create({
    data: { firmId, clientId: rehman.id, caseId: appeal.id, method: "Telephone", direction: "Outgoing",
            personName: "Fazal ur Rehman", personNumber: "0300 1234567", personRole: "Client",
            subject: "Sample: the next date", summary: "Sample note of what was said.",
            commDate: day(-2), commTime: "16:40", followUpDue: day(1), createdBy: "review" },
  });

  // ---- a shelf, with something on it -------------------------------------
  const shelf = await db.libraryFolder.create({
    data: { firmId, kind: "judgments", name: "Sample shelf", sortOrder: 0 },
  });
  await db.judgment.create({
    data: {
      firmId,
      folderId: shelf.id,
      title: "Sample judgment note",
      // Deliberately not a citation. An invented one printed in the format
      // of a real report is the one thing in this file that could be
      // mistaken for law and repeated as if it were.
      citation: "",
      court: "Sample Court",
      principle: "Sample principle. This is not a decided case and states no law.",
      summary: "Sample entry, so the library has something in it for the review.",
      published: false,
      submittedBy: "review",
    },
  });

  // ---- the account the reviewer signs in with ----------------------------
  //
  // An associate, not an admin. A reviewer needs to see that the app works;
  // nothing about that requires the ability to change a chamber's records,
  // and the account will sit there after the review is done.
  const email = `reviewer@${slug}.invalid`;
  const password = generatePassword();
  const existing = await db.user.findFirst({ where: { username: "reviewer" } });

  if (existing) {
    await db.user.update({
      where: { id: existing.id },
      data: { passwordHash: await hashPassword(password), role: "associate",
              mustChangePassword: false, email },
    });
  } else {
    await db.user.create({
      data: { firmId, username: "reviewer", email, passwordHash: await hashPassword(password),
              fullName: "App Reviewer", role: "associate",
              // Not forced: a reviewer made to change a password on first
              // sign-in will report the app as broken, and they would be
              // half right — nothing else works until they do.
              mustChangePassword: false },
    });
  }

  console.log(
    [
      "",
      "  ┌─────────────────────────────────────────────────────────────┐",
      "  │  The reviewer's sign-in. This is shown ONCE.                │",
      "  └─────────────────────────────────────────────────────────────┘",
      "",
      `      sign in     ${email}`,
      `      password    ${password}`,
      "",
      "  Put these in the Play Console under App access, and nowhere else.",
      "  Not in this repository, not in a message, not in a photograph.",
      "",
      "  Everything this account can see is invented. It is an associate in",
      `  the chamber "${slug}", and can see nothing in any other chamber.`,
      "",
    ].join("\n")
  );
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

/**
 * Puts one worked example into a development database, so the client portal
 * can be seen doing its job before Phase 5 builds the office screens that
 * create real cases.
 *
 *   npm run demo:data -- "Fazal ur Rehman"
 *
 * Everything it writes is labelled DEMO. It refuses to run against a
 * production database, and re-running it replaces its own rows rather than
 * piling up duplicates.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const MARK = "[DEMO]";

function daysFromNow(days: number): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("demo:data will not run against a production database.");
  }

  const name = process.argv.slice(2).join(" ").trim();
  if (!name) {
    console.error('Usage: npm run demo:data -- "Client Name"');
    process.exit(1);
  }

  const client = await prisma.client.findFirst({ where: { name } });
  if (!client) {
    throw new Error(`No client named "${name}". Run: npm run portal:issue -- "${name}"`);
  }

  // Replace anything an earlier run left behind (cascades to the children).
  await prisma.case.deleteMany({ where: { clientId: client.id, title: { startsWith: MARK } } });

  const matter = await prisma.case.create({
    data: {
      clientId: client.id,
      title: `${MARK} Civil Suit for Specific Performance`,
      court: "Civil Judge, Peshawar",
      caseType: "Civil Suit",
      status: "Active",
      nextHearing: daysFromNow(11),
      notes: "INTERNAL: this note must never appear in the client portal.",
    },
  });

  await prisma.hearing.createMany({
    data: [
      {
        caseId: matter.id,
        hearingDate: daysFromNow(-24),
        purpose: "Framing of issues",
        outcome: "INTERNAL: adjourned, opposing counsel unprepared.",
      },
      {
        caseId: matter.id,
        hearingDate: daysFromNow(-6),
        purpose: "Recording of evidence, plaintiff",
        outcome: "INTERNAL: examination-in-chief completed.",
      },
    ],
  });

  await prisma.caseUpdate.createMany({
    data: [
      {
        caseId: matter.id,
        updateDate: daysFromNow(-24),
        message: "Issues were framed. The court has fixed the matter for evidence.",
        author: "The Arbitrator & Law Associates",
      },
      {
        caseId: matter.id,
        updateDate: daysFromNow(-6),
        message:
          "Your examination-in-chief has been recorded. Cross-examination is expected on the next date.",
        author: "The Arbitrator & Law Associates",
      },
    ],
  });

  await prisma.document.createMany({
    data: [
      {
        caseId: matter.id,
        title: `${MARK} Plaint as filed`,
        origName: "plaint.pdf",
        storedName: "",
        sizeBytes: 184_320,
        clientVisible: true,
      },
      {
        caseId: matter.id,
        title: `${MARK} Office strategy note`,
        origName: "strategy.pdf",
        storedName: "",
        sizeBytes: 22_016,
        clientVisible: false, // must not appear in the portal
      },
    ],
  });

  await prisma.caseMessage.create({
    data: {
      caseId: matter.id,
      authorType: "office",
      authorName: "The Arbitrator & Law Associates",
      body: "Please bring the original sale agreement to the next date.",
      answered: true,
    },
  });

  await prisma.fee.createMany({
    data: [
      { caseId: matter.id, kind: "agreed", amount: 150_000, entryDate: daysFromNow(-40), note: `${MARK} Agreed fee` },
      { caseId: matter.id, kind: "received", amount: 75_000, entryDate: daysFromNow(-38), note: `${MARK} First instalment` },
    ],
  });

  // A cause list needs more than one matter on it. These give the staff
  // diary something to show for today and the days just ahead.
  const otherName = "Sher Afzal Khan";
  const other =
    (await prisma.client.findFirst({ where: { name: otherName } })) ??
    (await prisma.client.create({ data: { name: otherName, phone: "0300-0000000" } }));

  await prisma.case.deleteMany({ where: { clientId: other.id, title: { startsWith: MARK } } });

  const listed = [
    {
      clientId: client.id,
      title: `${MARK} Criminal Appeal against conviction`,
      court: "Peshawar High Court",
      caseType: "Criminal Appeal",
      hearing: daysFromNow(0),
      purpose: "Arguments on the appeal",
    },
    {
      clientId: other.id,
      title: `${MARK} Family Suit for maintenance`,
      court: "Family Court, Peshawar",
      caseType: "Family Suit",
      hearing: daysFromNow(1),
      purpose: "Reconciliation proceedings",
    },
    {
      clientId: other.id,
      title: `${MARK} Rent Controller proceedings`,
      court: "Rent Controller, Peshawar",
      caseType: "Rent",
      hearing: daysFromNow(4),
      purpose: "Evidence of the landlord",
    },
  ];

  for (const entry of listed) {
    const created = await prisma.case.create({
      data: {
        clientId: entry.clientId,
        title: entry.title,
        court: entry.court,
        caseType: entry.caseType,
        status: "Active",
        nextHearing: entry.hearing,
        notes: "INTERNAL: strategy note, never visible in the portal.",
      },
    });
    await prisma.hearing.create({
      data: { caseId: created.id, hearingDate: entry.hearing, purpose: entry.purpose },
    });
  }

  // An unanswered client question, so the office list is not empty.
  await prisma.caseMessage.create({
    data: {
      caseId: matter.id,
      authorType: "client",
      authorName: client.name,
      body: "Will I need to attend in person on the next date?",
      answered: false,
    },
  });

  console.log(`\n  Demo case created for ${client.name} (case #${matter.id}).`);
  console.log(`  Three further matters are listed for the staff diary, one today.`);
  console.log("  It carries an internal case note, an internal hearing outcome and");
  console.log("  an unshared document — all three should be invisible in the portal.\n");
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

/**
 * Reminds clients and the chamber of tomorrow's hearings.
 *
 *   npm run notify:hearings
 *
 * Meant for a daily cron entry, late afternoon:
 *
 *   30 16 * * *  cd /path/to/backend && /usr/bin/npm run notify:hearings
 *
 * Safe to run twice. Each hearing carries `reminderSentAt`, set in the same
 * step as the send, so a second run the same day tells nobody anything
 * again — which matters, because the failure mode of a cron job is running
 * more often than you meant, not less.
 *
 * Nothing here names a case. A reminder is read on a lock screen; what the
 * client is litigating is their business, not their bus's.
 */
import { PrismaClient } from "@prisma/client";
import { notify, staffWithCapability } from "../src/lib/push.js";

const prisma = new PrismaClient();

function tomorrowRange(): { from: Date; to: Date } {
  const from = new Date();
  from.setUTCHours(0, 0, 0, 0);
  from.setUTCDate(from.getUTCDate() + 1);

  const to = new Date(from);
  to.setUTCDate(to.getUTCDate() + 1);

  return { from, to };
}

async function main() {
  const { from, to } = tomorrowRange();
  const day = from.toISOString().slice(0, 10);

  const hearings = await prisma.hearing.findMany({
    where: { hearingDate: { gte: from, lt: to }, reminderSentAt: null },
    select: { id: true, case: { select: { id: true, clientId: true } } },
  });

  if (hearings.length === 0) {
    console.log(`Nothing listed for ${day}, or every reminder has already gone out.`);
    return;
  }

  // One notification per client, however many of their matters are listed.
  const byClient = new Map<number, number>();
  for (const h of hearings) {
    byClient.set(h.case.clientId, (byClient.get(h.case.clientId) ?? 0) + 1);
  }

  let reached = 0;
  for (const [clientId, count] of byClient) {
    reached += await notify("client", [clientId], {
      title: "You have a hearing tomorrow",
      body:
        count === 1
          ? "One of your matters is listed tomorrow. Open the app for the details."
          : `${count} of your matters are listed tomorrow. Open the app for the details.`,
      path: "/cases",
    });
  }

  // And the chamber, once, with a count rather than a list.
  const staff = await staffWithCapability("cases.view");
  const staffReached = await notify("staff", staff, {
    title: "Tomorrow's cause list",
    body: `${hearings.length} matter${hearings.length === 1 ? "" : "s"} listed tomorrow.`,
    path: "/diary",
  });

  // Marked only after the attempt, and marked regardless of whether any
  // device was reachable: a client with no app installed must not keep the
  // job retrying for ever.
  await prisma.hearing.updateMany({
    where: { id: { in: hearings.map((h) => h.id) } },
    data: { reminderSentAt: new Date() },
  });

  console.log(
    `${day}: ${hearings.length} hearing(s) — ` +
      `${byClient.size} client(s) reached on ${reached} device(s), ` +
      `chamber on ${staffReached} device(s).`
  );
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

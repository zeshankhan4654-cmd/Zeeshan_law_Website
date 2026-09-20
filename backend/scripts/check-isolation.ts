import { Prisma } from "@prisma/client";
import { prisma } from "../src/lib/prisma.js";
import { forFirm, scopedModelNames } from "../src/lib/tenant.js";

/**
 * Proves the wall between chambers holds.
 *
 * Multi-tenancy is the one part of this system where a bug is not an
 * inconvenience: a query that forgets its chamber hands one advocate
 * another advocate's privileged client file. Arguing that the scoping is
 * correct is not enough — this makes two chambers, gives each one real
 * records, and then has each of them try, by every route Prisma offers, to
 * touch the other's. Every attempt must fail.
 *
 *   npm run check:isolation
 *
 * It creates two throwaway chambers and deletes them again, so it is safe
 * to run against a development database. It does not touch existing data.
 */

let failures = 0;
let checks = 0;

function ok(what: string): void {
  checks += 1;
  console.log(`  ✓ ${what}`);
}

function fail(what: string, detail: string): void {
  checks += 1;
  failures += 1;
  console.error(`  ✗ ${what}\n      ${detail}`);
}

/** The result must be empty — null, or an array with nothing in it. */
function expectNothing(what: string, got: unknown): void {
  const empty = got === null || got === undefined || (Array.isArray(got) && got.length === 0);
  if (empty) ok(what);
  else fail(what, `saw ${JSON.stringify(got)}`);
}

function expectEqual(what: string, got: unknown, want: unknown): void {
  if (got === want) ok(what);
  else fail(what, `expected ${JSON.stringify(want)}, saw ${JSON.stringify(got)}`);
}

/** The call must throw. Silently doing nothing is not good enough here. */
async function expectRefused(what: string, run: () => Promise<unknown>): Promise<void> {
  try {
    const got = await run();
    fail(what, `it succeeded, returning ${JSON.stringify(got)}`);
  } catch (err) {
    const why = (err as Error).message.split("\n")[0] ?? "";
    ok(`${what} — refused: ${why.slice(0, 90)}`);
  }
}

type Chamber = Awaited<ReturnType<typeof makeChamber>>;

/** A chamber with one of everything worth stealing. */
async function makeChamber(slug: string, name: string) {
  const firm = await prisma.firm.create({ data: { slug, name } });
  const db = forFirm(firm.id);

  const client = await db.client.create({
    data: { firmId: firm.id, name: `${name}'s client`, phone: "0300-0000000" },
  });
  const matter = await db.case.create({
    data: { firmId: firm.id, clientId: client.id, title: `${name} v. The Other Side` },
  });
  const message = await db.caseMessage.create({
    data: {
      firmId: firm.id,
      caseId: matter.id,
      authorType: "client",
      authorName: "A client",
      body: "Privileged: what should I say in the witness box?",
    },
  });
  const document = await db.document.create({
    data: { firmId: firm.id, caseId: matter.id, title: "Draft affidavit", storedName: "x.pdf" },
  });
  const fee = await db.fee.create({
    data: { firmId: firm.id, caseId: matter.id, kind: "agreed", amount: 250000, entryDate: new Date() },
  });
  const setting = await db.setting.create({
    data: { firmId: firm.id, key: "contact.phone", value: `secret-${slug}` },
  });
  const post = await db.post.create({
    data: { firmId: firm.id, slug: "a-note", title: `${name} writes` },
  });

  return { firm, db, client, matter, message, document, fee, setting, post };
}

/** One message in a chamber, whatever an earlier probe did to the last one. */
async function freshMessage(chamber: Chamber): Promise<number> {
  const created = await chamber.db.caseMessage.create({
    data: {
      firmId: chamber.firm.id,
      caseId: chamber.matter.id,
      authorType: "client",
      authorName: "A client",
      body: "Privileged: what should I say in the witness box?",
    },
    select: { id: true },
  });
  return created.id;
}

/** Everything one chamber can try against another's records. */
async function probe(attacker: Chamber, victim: Chamber): Promise<void> {
  const { db } = attacker;
  const them = victim;

  console.log(`\n  ${attacker.firm.name} reaching for ${victim.firm.name}:`);

  // --- reading, including straight by id ----------------------------------
  expectNothing(
    "cannot read their client by id",
    await db.client.findUnique({ where: { id: them.client.id } })
  );
  expectNothing(
    "cannot read their case by id",
    await db.case.findFirst({ where: { id: them.matter.id } })
  );
  expectNothing(
    "cannot read their client's message",
    await db.caseMessage.findFirst({ where: { id: them.message.id } })
  );
  expectNothing(
    "cannot read their document",
    await db.document.findFirst({ where: { id: them.document.id } })
  );
  expectNothing("cannot read their fee", await db.fee.findFirst({ where: { id: them.fee.id } }));
  // Both chambers gave an article the same slug, which they are now free to
  // do. Looking it up must find its own, never theirs.
  const bySlug = await db.post.findFirst({ where: { slug: them.post.slug } });
  expectEqual("the same slug in both chambers resolves to its own", bySlug?.id, attacker.post.id);

  // findUniqueOrThrow is a separate code path in Prisma, so it is checked too.
  await expectRefused("findUniqueOrThrow on their client", () =>
    db.client.findUniqueOrThrow({ where: { id: them.client.id } })
  );

  // --- listing -------------------------------------------------------------
  const cases = await db.case.findMany({ select: { id: true } });
  if (cases.some((c) => c.id === them.matter.id)) {
    fail("their case is absent from a list of all cases", "it was listed");
  } else ok("their case is absent from a list of all cases");

  const clients = await db.client.findMany({ select: { id: true } });
  expectEqual("sees only its own clients", clients.length, 1);

  expectEqual("counts only its own cases", await db.case.count(), 1);

  // --- aggregates, which are a leak of their own ---------------------------
  const money = await db.fee.aggregate({ _sum: { amount: true } });
  expectEqual(
    "fee totals exclude theirs",
    Number(money._sum.amount ?? 0),
    Number(attacker.fee.amount)
  );

  const grouped = await db.case.groupBy({ by: ["status"], _count: { _all: true } });
  expectEqual(
    "groupBy counts only its own cases",
    grouped.reduce((n, row) => n + row._count._all, 0),
    1
  );

  // --- the composite keys, which are the easy thing to get wrong -----------
  expectNothing(
    "cannot reach their setting through the composite key",
    await db.setting.findUnique({
      where: { firmId_key: { firmId: them.firm.id, key: "contact.phone" } },
    })
  );
  expectNothing(
    "cannot reach their article through the composite key",
    await db.post.findUnique({
      where: { firmId_slug: { firmId: them.firm.id, slug: them.post.slug } },
    })
  );

  // --- writing -------------------------------------------------------------
  await expectRefused("cannot rename their client", () =>
    db.client.update({ where: { id: them.client.id }, data: { name: "Taken over" } })
  );
  await expectRefused("cannot delete their case", () =>
    db.case.delete({ where: { id: them.matter.id } })
  );

  const bulkUpdate = await db.client.updateMany({
    where: { id: them.client.id },
    data: { notes: "Taken over" },
  });
  expectEqual("updateMany touches none of their clients", bulkUpdate.count, 0);

  const bulkDelete = await db.document.deleteMany({ where: { id: them.document.id } });
  expectEqual("deleteMany removes none of their documents", bulkDelete.count, 0);

  // A blanket deleteMany with no `where` at all is the worst case. Both
  // chambers are given a fresh message first, so this reads the same
  // whichever direction the probe runs in.
  const mine = await freshMessage(attacker);
  const theirs = await freshMessage(victim);

  const ownBefore = await prisma.caseMessage.count({ where: { firmId: attacker.firm.id } });
  const wipe = await db.caseMessage.deleteMany({});
  expectEqual("an unfiltered deleteMany stops at its own chamber", wipe.count, ownBefore);

  const gone = await prisma.caseMessage.findUnique({ where: { id: mine } });
  expectEqual("it did delete its own", gone, null);

  const survived = await prisma.caseMessage.findUnique({ where: { id: theirs } });
  if (survived) ok("their message survived it");
  else fail("their message survived it", "it was deleted");

  // --- claiming to be them -------------------------------------------------
  await expectRefused("cannot create a record in their chamber", () =>
    db.client.create({ data: { firmId: them.firm.id, name: "Planted" } })
  );

  // --- moving a row across the wall ---------------------------------------
  await db.client.update({
    where: { id: attacker.client.id },
    // A deliberate attempt to hand its own client to the other chamber;
    // the extension strips it rather than letting the row walk.
    data: { firmId: them.firm.id, name: "Still ours" } as Prisma.ClientUpdateInput,
  });
  const moved = await prisma.client.findUnique({ where: { id: attacker.client.id } });
  expectEqual("a record cannot be moved into another chamber", moved?.firmId, attacker.firm.id);

  // --- upsert, which both reads and writes ---------------------------------
  //
  // An upsert naming their row by its composite key finds nothing to update
  // — the scope has already ruled their row out — so it falls through to the
  // create, and that collides with the attacker's own row of the same key.
  // The collision is the wall doing its job, so the check is not on whether
  // this throws but on what happened to their setting: nothing may have.
  await db.setting
    .upsert({
      where: { firmId_key: { firmId: them.firm.id, key: "contact.phone" } },
      create: { firmId: attacker.firm.id, key: "contact.phone", value: "overwritten" },
      update: { value: "overwritten" },
    })
    .catch(() => undefined);

  const theirSetting = await prisma.setting.findUnique({
    where: { firmId_key: { firmId: them.firm.id, key: "contact.phone" } },
  });
  expectEqual(
    "upsert cannot overwrite their setting",
    theirSetting?.value,
    `secret-${them.firm.slug}`
  );

  const ownSetting = await prisma.setting.findUnique({
    where: { firmId_key: { firmId: attacker.firm.id, key: "contact.phone" } },
  });
  expectEqual(
    "and it did not quietly overwrite its own either",
    ownSetting?.value,
    `secret-${attacker.firm.slug}`
  );
}

/** Every model that holds chamber work must be scoped; this says which are not. */
function reportCoverage(): void {
  console.log("\n  Schema coverage:");
  const scoped = new Set(scopedModelNames());
  const unscoped = Prisma.dmmf.datamodel.models
    .map((m) => m.name)
    .filter((name) => !scoped.has(name));

  console.log(`  ✓ ${scoped.size} models scoped to a chamber`);

  // Firm is the chambers themselves; RateLimit is deliberately global.
  const expectedUnscoped = new Set(["Firm", "RateLimit"]);
  const unexpected = unscoped.filter((name) => !expectedUnscoped.has(name));

  if (unexpected.length === 0) {
    ok(`the only unscoped models are ${[...expectedUnscoped].join(" and ")}`);
  } else {
    fail(
      "a model holds data without naming a chamber",
      `${unexpected.join(", ")} — add firmId, or add it to the expected list with a reason`
    );
  }
}

async function main(): Promise<void> {
  const stamp = Date.now();
  console.log("Isolation check: two chambers, each trying to read the other.\n");

  const a = await makeChamber(`isolation-a-${stamp}`, "Chamber A");
  const b = await makeChamber(`isolation-b-${stamp}`, "Chamber B");

  try {
    // Both directions. A one-way test would pass on a bug that scopes the
    // first chamber correctly and the second not at all.
    await probe(a, b);
    await probe(b, a);
    reportCoverage();
  } finally {
    await prisma.firm.deleteMany({ where: { id: { in: [a.firm.id, b.firm.id] } } });
  }

  console.log(
    `\n${failures === 0 ? "PASS" : "FAIL"}: ${checks - failures}/${checks} checks passed.`
  );
  await prisma.$disconnect();
  if (failures > 0) process.exit(1);
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});

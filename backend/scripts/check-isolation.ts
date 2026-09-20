import { Prisma } from "@prisma/client";
import { hashPassword, verifyPassword } from "../src/lib/password.js";
import { listChambers, submissionQueue } from "../src/lib/platform-stats.js";
import { APPROVED_AND_STANDING, assertChamberMayShare } from "../src/lib/shared-library.js";
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

  // Deliberately the same handle and the same client username in both
  // chambers. Before M2 the second of these could not exist at all.
  const staff = await db.user.create({
    data: {
      firmId: firm.id,
      username: "naveed.ahmad",
      email: `naveed@${slug}.invalid`,
      fullName: "Naveed Ahmad",
      role: "admin",
      passwordHash: await hashPassword(`password-for-${slug}`),
    },
  });
  await db.client.update({
    where: { id: client.id },
    data: {
      portalEnabled: true,
      portalUsername: "fazal.rehman",
      portalHash: await hashPassword(`portal-for-${slug}`),
    },
  });

  return { firm, db, client, matter, message, document, fee, setting, post, staff };
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

/**
 * The names two chambers may now share, and the one thing that still tells
 * them apart at sign-in.
 */
async function probeIdentities(a: Chamber, b: Chamber): Promise<void> {
  console.log("\n  Sign-in identities:");

  // Both chambers hold a naveed.ahmad and a fazal.rehman. The rows exist,
  // which is itself the M2 property — under the old global unique index
  // creating the second chamber would have failed outright.
  expectEqual("both chambers hold a staff handle of the same name", a.staff.username, b.staff.username);

  const handles = await prisma.user.findMany({ where: { username: "naveed.ahmad" } });
  expectEqual("and both rows exist", handles.length >= 2, true);

  // The address is what is unique, and it is what sign-in looks up.
  await expectRefused("two accounts cannot share an email address", () =>
    prisma.user.create({
      data: {
        firmId: b.firm.id,
        username: "someone.else",
        email: a.staff.email,
        fullName: "Someone Else",
        role: "admin",
        passwordHash: "x",
      },
    })
  );

  // A handle free in one chamber is not free in its own, twice over.
  await expectRefused("a chamber cannot reuse its own handle", () =>
    a.db.user.create({
      data: {
        firmId: a.firm.id,
        username: a.staff.username,
        email: `another@${a.firm.slug}.invalid`,
        fullName: "Another",
        role: "admin",
        passwordHash: "x",
      },
    })
  );

  // Signing in by address lands in the right chamber, and only that one.
  for (const chamber of [a, b]) {
    const found = await prisma.user.findUnique({ where: { email: chamber.staff.email } });
    expectEqual(
      `${chamber.firm.name}'s address resolves to its own chamber`,
      found?.firmId,
      chamber.firm.id
    );
  }

  // The client username is shared, so the chamber in the link is the only
  // thing that decides whose client signs in — and the other chamber's
  // password must not work against it.
  for (const [chamber, other] of [[a, b], [b, a]] as const) {
    const client = await prisma.client.findUnique({
      where: { firmId_portalUsername: { firmId: chamber.firm.id, portalUsername: "fazal.rehman" } },
    });
    expectEqual(
      `fazal.rehman in ${chamber.firm.name} is ${chamber.firm.name}'s client`,
      client?.id,
      chamber.client.id
    );

    const wrong = client?.portalHash
      ? await verifyPassword(`portal-for-${other.firm.slug}`, client.portalHash)
      : true;
    if (wrong) {
      fail(`the other chamber's password does not open ${chamber.firm.name}'s client`, "it did");
    } else {
      ok(`the other chamber's password does not open ${chamber.firm.name}'s client`);
    }
  }
}

/**
 * A platform admin runs the platform. They do not read inside chambers.
 *
 * The console's own reads go through lib/platform-stats.ts, which returns
 * counts and dates. This checks the other half — that being a platform
 * admin does not widen the ordinary office at all, because the scoped
 * client still comes from the admin's own session.
 */
async function probePlatformAdmin(a: Chamber, b: Chamber): Promise<void> {
  console.log("\n  A platform admin:");

  await prisma.user.update({
    where: { id: a.staff.id },
    data: { platformAdmin: true },
  });

  // Their session names their own chamber, so this is the client every
  // office route gets for them. Being a platform admin changes nothing
  // about it.
  const theirs = forFirm(a.firm.id);

  expectNothing(
    "still cannot read another chamber's client",
    await theirs.client.findUnique({ where: { id: b.client.id } })
  );
  expectNothing(
    "still cannot read another chamber's case",
    await theirs.case.findFirst({ where: { id: b.matter.id } })
  );
  // Naming the other chamber outright in the `where` is overridden, not
  // honoured: the scope is applied last and wins. So this returns their own
  // message or nothing — never the other chamber's.
  const reached = await theirs.caseMessage.findFirst({ where: { firmId: b.firm.id } });
  if (reached && reached.firmId !== a.firm.id) {
    fail("asking for another chamber's messages by firm id", `got firm ${reached.firmId}`);
  } else {
    ok("asking for another chamber's messages by firm id returns only its own");
  }
  expectEqual(
    "still counts only its own cases",
    await theirs.case.count(),
    1
  );

  // What the console is allowed to know, and the shape of it.
  const { items } = await listChambers({ q: "", status: "", verified: "", limit: 100, offset: 0 });
  const other = items.find((c) => c.id === b.firm.id);

  if (!other) {
    fail("the console can see that the other chamber exists", "it was not listed");
    return;
  }
  ok("the console can see that the other chamber exists");
  expectEqual("and how many clients it has", other.counts.clients, 1);

  // The load-bearing check: nothing in what the console returns is a name,
  // a title or a body from inside the chamber. Serialised whole and
  // searched, so a field added later without thought is caught here.
  const serialised = JSON.stringify(items);
  const mustNotAppear: [string, string][] = [
    ["a client's name", `${b.firm.name}'s client`],
    ["a case title", b.matter.title],
    ["a privileged message", "witness box"],
    ["a document title", "Draft affidavit"],
    ["a setting's value", `secret-${b.firm.slug}`],
  ];

  for (const [what, needle] of mustNotAppear) {
    if (serialised.includes(needle)) {
      fail(`the console never returns ${what}`, `found "${needle}"`);
    } else {
      ok(`the console never returns ${what}`);
    }
  }

  await prisma.user.update({
    where: { id: a.staff.id },
    data: { platformAdmin: false },
  });
}

/**
 * The shared library is the one thing meant to cross chambers — so what
 * keeps it safe is not the wall but the gate. This checks the gate.
 */
async function probeSharedLibrary(a: Chamber, b: Chamber): Promise<void> {
  console.log("\n  The shared library:");

  // Each chamber writes a judgment. Neither has offered it to anybody.
  const made = new Map<number, number>();
  for (const chamber of [a, b]) {
    const j = await chamber.db.judgment.create({
      data: {
        firmId: chamber.firm.id,
        title: `${chamber.firm.name} on limitation`,
        citation: `2026 XYZ ${chamber.firm.id}`,
        court: "Peshawar High Court",
        principle: "Not yet offered to anybody.",
        // Published on their own site, which must not be the same thing as
        // being in the shared library.
        published: true,
      },
      select: { id: true },
    });
    made.set(chamber.firm.id, j.id);
  }

  const publicly = async () =>
    prisma.judgment.findMany({ where: APPROVED_AND_STANDING, select: { id: true } });

  const mine = made.get(a.firm.id) as number;
  const theirs = made.get(b.firm.id) as number;

  // 1. Publishing on your own site does not share anything.
  const beforeIds = (await publicly()).map((r) => r.id);
  if (beforeIds.includes(mine) || beforeIds.includes(theirs)) {
    fail("publishing on a chamber's own site does not share it", "it appeared publicly");
  } else {
    ok("publishing on a chamber's own site does not share it");
  }

  // 2. Nor does the other chamber see it.
  expectNothing(
    "an unshared entry is invisible to the other chamber",
    await b.db.judgment.findUnique({ where: { id: mine } })
  );

  // 3. Offering it is not the same as it appearing.
  await prisma.judgment.update({
    where: { id: mine },
    data: { shareState: "pending", submittedBy: "someone" },
  });
  const pendingIds = (await publicly()).map((r) => r.id);
  expectEqual("offering an entry does not publish it", pendingIds.includes(mine), false);

  const queue = await submissionQueue("pending");
  expectEqual("but it does reach the moderation queue", queue.some((e) => e.id === mine), true);

  // 4. An unverified chamber's work cannot be approved.
  await prisma.firm.update({ where: { id: a.firm.id }, data: { verified: false } });
  await expectRefused("an unverified chamber's work cannot be approved", () =>
    assertChamberMayShare(a.firm.id)
  );

  // 5. Verified and approved, it appears — and only it.
  await prisma.firm.update({ where: { id: a.firm.id }, data: { verified: true } });
  await prisma.judgment.update({
    where: { id: mine },
    data: { shareState: "approved", sharedAt: new Date() },
  });

  const liveIds = (await publicly()).map((r) => r.id);
  expectEqual("an approved entry appears in the shared library", liveIds.includes(mine), true);
  expectEqual("and the other chamber's unoffered one does not", liveIds.includes(theirs), false);

  // 6. Suspending the chamber takes its contribution down with it, and
  //    restoring it brings it back — without touching a single row.
  await prisma.firm.update({ where: { id: a.firm.id }, data: { status: "suspended" } });
  expectEqual(
    "a suspended chamber's contributions leave the shared library",
    (await publicly()).map((r) => r.id).includes(mine),
    false
  );

  await prisma.firm.update({ where: { id: a.firm.id }, data: { status: "active" } });
  expectEqual(
    "and come back when it is restored",
    (await publicly()).map((r) => r.id).includes(mine),
    true
  );

  // 7. Withdrawing verification does the same.
  await prisma.firm.update({ where: { id: a.firm.id }, data: { verified: false } });
  expectEqual(
    "withdrawing verification takes them down too",
    (await publicly()).map((r) => r.id).includes(mine),
    false
  );
  await prisma.firm.update({ where: { id: a.firm.id }, data: { verified: true } });

  // 8. Even approved, it is still that chamber's row. The other chamber
  //    reads it through the public library, never through its own client.
  expectNothing(
    "an approved entry is still not in the other chamber's own library",
    await b.db.judgment.findUnique({ where: { id: mine } })
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

  // Firm is the chambers themselves; RateLimit and PlatformAudit are
  // deliberately platform-level — a throttle and a record of what was done
  // *to* chambers, neither of which belongs inside one.
  const expectedUnscoped = new Set(["Firm", "RateLimit", "PlatformAudit"]);
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
    await probeIdentities(a, b);
    await probePlatformAdmin(a, b);
    await probeSharedLibrary(a, b);
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

import { prisma } from "./prisma.js";

/**
 * Everything the platform console is allowed to know about a chamber.
 *
 * Running a platform means knowing which chambers exist, how big they are,
 * whether they are active and when they were last used. It does not mean
 * reading an advocate's case files. Those two are not separated here by the
 * console choosing to show less than it could — they are separated by this
 * module being the *only* way the console reads anything, and by every
 * function in it returning counts, dates and chamber metadata.
 *
 * The rule, stated once so it can be checked against:
 *
 *   No function here may return a row, or any field of a row, from a
 *   chamber-scoped table. Numbers and timestamps only.
 *
 * `clients.name`, `cases.title`, a message body, a document title, a fee —
 * none of these may appear in anything returned from this file. If the
 * console ever needs one, that is not a change to this file; it is a
 * decision about the product, and it belongs in front of the person whose
 * privilege it is.
 *
 * There is also no route anywhere that takes a chamber id and returns its
 * records. A platform admin signed into the office reaches their own
 * chamber and no other, exactly like everybody else, because `tenant(req)`
 * derives the chamber from their own session. Being a platform admin adds
 * the console; it does not widen the office.
 */

export type ChamberSummary = {
  id: number;
  slug: string;
  name: string;
  status: string;
  suspendedReason: string;
  verified: boolean;
  enrolmentNo: string;
  createdAt: Date;
  counts: { staff: number; clients: number; cases: number };
  /** The most recent case activity, as a date. Never what the activity was. */
  lastActivityAt: Date | null;
};

export type PlatformTotals = {
  chambers: number;
  active: number;
  suspended: number;
  verified: number;
  staff: number;
  clients: number;
  cases: number;
};

/** Platform-wide numbers for the top of the console. */
export async function platformTotals(): Promise<PlatformTotals> {
  const [chambers, active, suspended, verified, staff, clients, cases] = await Promise.all([
    prisma.firm.count(),
    prisma.firm.count({ where: { status: "active" } }),
    prisma.firm.count({ where: { status: "suspended" } }),
    prisma.firm.count({ where: { verified: true } }),
    prisma.user.count(),
    prisma.client.count(),
    prisma.case.count(),
  ]);

  return { chambers, active, suspended, verified, staff, clients, cases };
}

/**
 * The only fields of a chamber the console ever reads.
 *
 * `_count` is the whole trick: Prisma cannot be coaxed into returning a
 * field of a related row through it, so the sizes come back as numbers with
 * no way for a name or a title to ride along.
 */
const CHAMBER_FIELDS = {
  id: true,
  slug: true,
  name: true,
  status: true,
  suspendedReason: true,
  verified: true,
  enrolmentNo: true,
  createdAt: true,
  _count: { select: { users: true, clients: true, cases: true } },
} as const;

type ChamberRow = {
  id: number;
  slug: string;
  name: string;
  status: string;
  suspendedReason: string;
  verified: boolean;
  enrolmentNo: string;
  createdAt: Date;
  _count: { users: number; clients: number; cases: number };
};

/**
 * Adds when each chamber was last worked in — the date, and only the date.
 * A groupBy with `_max` over a timestamp has no way to carry a case title.
 */
async function withActivity(firms: ChamberRow[]): Promise<ChamberSummary[]> {
  const ids = firms.map((f) => f.id);

  const activity = ids.length
    ? await prisma.case.groupBy({
        by: ["firmId"],
        where: { firmId: { in: ids } },
        _max: { updatedAt: true },
      })
    : [];
  const lastByFirm = new Map(activity.map((row) => [row.firmId, row._max.updatedAt]));

  return firms.map((firm) => ({
    id: firm.id,
    slug: firm.slug,
    name: firm.name,
    status: firm.status,
    suspendedReason: firm.suspendedReason,
    verified: firm.verified,
    enrolmentNo: firm.enrolmentNo,
    createdAt: firm.createdAt,
    counts: {
      staff: firm._count.users,
      clients: firm._count.clients,
      cases: firm._count.cases,
    },
    lastActivityAt: lastByFirm.get(firm.id) ?? null,
  }));
}

export type ChamberQuery = {
  q: string;
  status: "" | "active" | "suspended";
  verified: "" | "yes" | "no";
  limit: number;
  offset: number;
};

/**
 * The chambers on the platform, with their sizes.
 *
 * `q` searches the chamber's own name, slug and enrolment number — the
 * things the advocate gave about themselves. It deliberately does not
 * search clients or cases: a console that can find "which chamber is acting
 * for X" is a console that reads inside chambers.
 */
export async function listChambers(
  query: ChamberQuery
): Promise<{ items: ChamberSummary[]; total: number }> {
  const where = {
    ...(query.status ? { status: query.status } : {}),
    ...(query.verified ? { verified: query.verified === "yes" } : {}),
    ...(query.q
      ? {
          OR: [
            { name: { contains: query.q, mode: "insensitive" as const } },
            { slug: { contains: query.q, mode: "insensitive" as const } },
            { enrolmentNo: { contains: query.q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [firms, total] = await Promise.all([
    prisma.firm.findMany({
      where,
      orderBy: { id: "asc" },
      take: query.limit,
      skip: query.offset,
      select: CHAMBER_FIELDS,
    }),
    prisma.firm.count({ where }),
  ]);

  return { items: await withActivity(firms), total };
}

/** One chamber, shaped exactly as the list shapes them. */
export async function chamberById(id: number): Promise<ChamberSummary | null> {
  const firm = await prisma.firm.findUnique({ where: { id }, select: CHAMBER_FIELDS });
  if (!firm) return null;

  const [summary] = await withActivity([firm]);
  return summary ?? null;
}

/**
 * Writes down something a platform admin did to a chamber.
 *
 * Called on the way out of every action, never optional: the power to stop
 * an advocate working should not be usable quietly.
 */
export async function recordPlatformAction(entry: {
  actorId: number;
  actorEmail: string;
  action: "verify" | "unverify" | "suspend" | "restore";
  firmId: number;
  firmSlug: string;
  reason: string;
}): Promise<void> {
  await prisma.platformAudit.create({
    data: {
      actorId: entry.actorId,
      actorEmail: entry.actorEmail,
      action: entry.action,
      firmIdActedOn: entry.firmId,
      firmSlug: entry.firmSlug,
      reason: entry.reason,
    },
  });
}

/** The most recent platform actions, newest first. */
export async function recentPlatformActions(limit: number, firmId?: number) {
  return prisma.platformAudit.findMany({
    where: firmId ? { firmIdActedOn: firmId } : {},
    orderBy: { id: "desc" },
    take: limit,
  });
}

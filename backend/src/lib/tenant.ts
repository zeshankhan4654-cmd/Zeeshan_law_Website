import { Prisma } from "@prisma/client";
import { prisma } from "./prisma.js";

/**
 * The wall between chambers.
 *
 * Every table holding a chamber's work carries `firmId`. Relying on each
 * query to remember it would work right up until the day one did not — and
 * the thing on the other side of that mistake is another advocate's
 * privileged client file. So the scoping is not left to call sites: this
 * client injects the firm into every operation, and a query that forgot it
 * is impossible rather than merely unlikely.
 *
 * Two deliberate limits, both of which fail loudly rather than silently:
 *
 *  - **Nested writes** into a scoped relation are not reached by this. They
 *    hit the NOT NULL constraint on `firm_id` and throw. Create rows
 *    individually.
 *  - **`$queryRaw` bypasses extensions entirely.** It is never used on
 *    chamber data, and must not be.
 */

/**
 * Which models are scoped, derived from the schema rather than listed.
 *
 * A model added later with a `firmId` is protected the moment it exists; a
 * hand-written list would protect it only once somebody remembered.
 */
const SCOPED_MODELS = new Set(
  Prisma.dmmf.datamodel.models
    .filter((model) => model.fields.some((field) => field.name === "firmId"))
    .map((model) => model.name)
);

export function scopedModelNames(): string[] {
  return [...SCOPED_MODELS].sort();
}

/** Operations whose `where` selects the rows acted on. */
const FILTERED = new Set([
  "findUnique",
  "findUniqueOrThrow",
  "findFirst",
  "findFirstOrThrow",
  "findMany",
  "count",
  "aggregate",
  "groupBy",
  "updateMany",
  "deleteMany",
  "update",
  "delete",
]);

type Args = Record<string, unknown>;

function withFirm(where: unknown, firmId: number): Args {
  return { ...((where as Args) ?? {}), firmId };
}

/**
 * `firmId` is stripped from any write payload.
 *
 * Not for tidiness: without it, an update could move a row into another
 * chamber, which is the same leak by a different route.
 */
function withoutFirm(data: unknown): unknown {
  if (Array.isArray(data)) return data.map(withoutFirm);
  if (data && typeof data === "object") {
    const rest = { ...(data as Args) };
    delete rest.firmId;
    return rest;
  }
  return data;
}

/**
 * On the way in, a create must name its chamber and must name the right
 * one.
 *
 * Injecting it silently would also work, and was the first design. Naming
 * it is better: the type system then requires every create site to say
 * which chamber the row belongs to, so a reviewer reading the line can see
 * the scoping instead of trusting that a wrapper is doing it. This check
 * is the other half — the type says it must be stated, and this says it
 * must be true.
 */
function stamp(data: unknown, firmId: number, model: string): unknown {
  if (Array.isArray(data)) return data.map((row) => stamp(row, firmId, model));

  const row = (data as Args) ?? {};
  const declared = row.firmId;

  if (declared !== undefined && declared !== firmId) {
    throw new Error(
      `Refusing to create a ${model} for firm ${String(declared)} using firm ${firmId}'s client.`
    );
  }

  return { ...row, firmId };
}

/**
 * A Prisma client that can only see, and only write, one chamber.
 *
 * Built per request — the cost is an object, not a connection; the
 * underlying pool is shared.
 */
export function forFirm(firmId: number) {
  if (!Number.isInteger(firmId) || firmId < 1) {
    throw new Error(`forFirm called with an invalid firm: ${String(firmId)}`);
  }

  return prisma.$extends({
    name: "firm-scope",
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (!SCOPED_MODELS.has(model)) return query(args);

          const next = { ...(args as Args) };

          if (FILTERED.has(operation)) {
            next.where = withFirm(next.where, firmId);
          }

          if (operation === "create" || operation === "createMany") {
            next.data = stamp(next.data, firmId, model);
          }

          if (operation === "update" || operation === "updateMany") {
            next.data = withoutFirm(next.data);
          }

          if (operation === "upsert") {
            next.where = withFirm(next.where, firmId);
            next.create = stamp(next.create, firmId, model);
            next.update = withoutFirm(next.update);
          }

          return query(next);
        },
      },
    },
  });
}

/** What a scoped client looks like, for typing a request or a helper. */
export type FirmClient = ReturnType<typeof forFirm>;

import { prisma } from "../src/lib/prisma.js";

/**
 * Which chamber a command-line script is acting on.
 *
 * These scripts issue sign-ins and reset passwords, so naming the wrong
 * chamber would hand somebody a way into somebody else's office. It is
 * therefore always stated — as `--firm <slug>`, or by PLATFORM_FIRM_SLUG
 * for the chamber this deployment's own website serves — and the resolved
 * name is printed back so the operator can see it before reading a
 * password down the telephone.
 */
export type Chamber = { id: number; name: string; slug: string };

/** Pulls `--firm <slug>` out of argv and returns the rest of the arguments. */
export function takeFirmArg(argv: string[]): { slug: string; rest: string[] } {
  const rest: string[] = [];
  let slug = process.env.PLATFORM_FIRM_SLUG ?? "arbitrator-law";

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--firm") {
      const value = argv[i + 1];
      if (!value) throw new Error("--firm needs a chamber slug after it.");
      slug = value;
      i += 1;
    } else if (arg?.startsWith("--firm=")) {
      slug = arg.slice("--firm=".length);
    } else if (arg !== undefined) {
      rest.push(arg);
    }
  }

  return { slug, rest };
}

export async function resolveChamber(slug: string): Promise<Chamber> {
  const firm = await prisma.firm.findUnique({
    where: { slug },
    select: { id: true, name: true, slug: true },
  });

  if (!firm) {
    const known = await prisma.firm.findMany({ select: { slug: true }, orderBy: { id: "asc" } });
    throw new Error(
      `No chamber has the slug "${slug}". Known: ${known.map((f) => f.slug).join(", ") || "none"}`
    );
  }

  return firm;
}

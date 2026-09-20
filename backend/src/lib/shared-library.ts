import { ApiError } from "../middleware/errorHandler.js";
import { prisma } from "./prisma.js";

/**
 * The shared library: what every chamber contributes, and every chamber
 * can read.
 *
 * This is the part of the platform with the sharpest edge. An entry that
 * appears here is a legal citation another advocate may carry into court.
 * A wrong one — a misremembered number, a principle stated too widely, a
 * judgment that was later overruled — does damage that a wrong telephone
 * number on a website does not. So the gate is real:
 *
 *  - Nothing is shared by default. A chamber's library is its own.
 *  - Offering an entry is deliberate, and the chamber can withdraw it.
 *  - Only the platform admin can approve, and only for a chamber somebody
 *    has verified is really an advocate.
 *  - Approval is reversible, and a rejection has to say why.
 *
 * The states, and the only moves between them:
 *
 *      private  --submit-->  pending  --approve-->  approved
 *         ^                     |                      |
 *         |                     +---reject---> rejected|
 *         +----------withdraw / unapprove---------------+
 */

export type ShareState = "private" | "pending" | "approved" | "rejected";

export const SHARE_STATES: ShareState[] = ["private", "pending", "approved", "rejected"];

/** The three kinds of entry a chamber can contribute. */
export const SHARED_KINDS = ["judgment", "research", "media"] as const;
export type SharedKind = (typeof SHARED_KINDS)[number];

export function isSharedKind(value: string): value is SharedKind {
  return (SHARED_KINDS as readonly string[]).includes(value);
}

/**
 * What must be filled in before an entry may be *offered* to every other
 * advocate on the platform.
 *
 * Stricter than the chamber's own publish rule, deliberately. A chamber
 * publishing on its own website answers for it under its own name. An
 * entry in the shared library carries the platform's name to advocates who
 * have no way to check who wrote it, so it has to stand on its own: what
 * the case is, where it is reported, and what it decides.
 */
export function assertFitToShare(kind: SharedKind, entry: Record<string, unknown>): void {
  const text = (key: string): string => String(entry[key] ?? "").trim();

  if (!text("title")) throw new ApiError(400, "It needs a title before it can be shared.");

  if (kind === "judgment") {
    if (!text("citation")) {
      throw new ApiError(
        400,
        "A judgment needs its citation before it can be shared. Another advocate has to be able to look it up."
      );
    }
    if (!text("court")) {
      throw new ApiError(400, "A judgment needs the court that decided it before it can be shared.");
    }
    if (!text("principle") && !text("summary")) {
      throw new ApiError(
        400,
        "Say what the judgment decides — a citation with nothing beside it is of no use to anybody."
      );
    }
  }

  if (kind === "research" && !text("summary") && !text("body")) {
    throw new ApiError(400, "There is nothing in this to share yet.");
  }

  if (kind === "media" && !text("url") && !text("storedName")) {
    throw new ApiError(400, "A recording needs a link before it can be shared.");
  }
}

/**
 * Whether a chamber may have its work approved into the shared library.
 *
 * Verification is what this is for. A chamber's own private work needs
 * nothing from anybody — that is the product. Putting a legal citation in
 * front of every advocate on the platform, under a name they cannot check,
 * needs somebody to have confirmed that the name is real.
 */
export async function assertChamberMayShare(firmId: number): Promise<void> {
  const firm = await prisma.firm.findUnique({
    where: { id: firmId },
    select: { verified: true, status: true, name: true },
  });
  if (!firm) throw new ApiError(404, "No such chamber.");

  if (firm.status !== "active") {
    throw new ApiError(400, `${firm.name} is suspended, so its work cannot be approved.`);
  }
  if (!firm.verified) {
    throw new ApiError(
      400,
      `${firm.name} is not verified yet. Verify the chamber before putting its work in front of other advocates.`
    );
  }
}

/**
 * The filter that decides what the public and other chambers actually see.
 *
 * Approval alone is not enough: the chamber must still be verified and
 * still be active. Both are re-checked here at read time rather than
 * unapproving entries when a chamber is suspended — so a suspension takes
 * a chamber's contributions down with it, and restoring the chamber brings
 * them back whole, without a sweep over its rows either way.
 */
export const APPROVED_AND_STANDING = {
  shareState: "approved",
  firm: { verified: true, status: "active" },
} as const;

/** How an approved entry is credited. Never a person — the chamber. */
export const CONTRIBUTOR_SELECT = {
  select: { name: true, slug: true, verified: true },
} as const;

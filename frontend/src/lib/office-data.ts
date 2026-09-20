import { cookies } from "next/headers";
import "server-only";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

/**
 * Office data, fetched on the server with the staff cookie forwarded.
 *
 * Returns null on any refusal — including a 403 where the signed-in role
 * lacks the capability — so a screen renders what its reader may see rather
 * than failing whole. What may be *done* is still decided by the API on
 * every write.
 */
export async function officeFetch<T>(path: string): Promise<T | null> {
  const jar = await cookies();
  const cookieHeader = jar.toString();
  if (!cookieHeader) return null;

  try {
    const res = await fetch(`${API_URL}${path}`, {
      headers: { Cookie: cookieHeader },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export type DiaryHearing = {
  id: number;
  purpose: string;
  recorded: boolean;
  caseId: number;
  caseTitle: string;
  court: string;
  status: string;
  clientName: string;
  clientPhone: string;
};
export type DiaryDay = { date: string; hearings: DiaryHearing[] };

export type ClientRow = {
  id: number;
  name: string;
  phone: string;
  email: string;
  portalEnabled: boolean;
  portalUsername: string | null;
  caseCount: number;
};

export type ClientDetail = {
  id: number;
  name: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
  portalEnabled: boolean;
  portalUsername: string | null;
  portalShowFees: boolean;
  portalMustChangePassword: boolean;
  createdAt: string;
  cases: { id: number; title: string; court: string; status: string; nextHearing: string | null }[];
};

export type OfficeCaseRow = {
  id: number;
  title: string;
  court: string;
  caseType: string;
  status: string;
  nextHearing: string | null;
  client: { id: number; name: string };
};

export type OfficeHearing = { id: number; hearingDate: string; purpose: string; outcome: string };
export type OfficeDocument = {
  id: number;
  title: string;
  origName: string;
  sizeBytes: number;
  clientVisible: boolean;
  createdAt: string;
};
export type OfficeMessage = {
  id: number;
  authorType: "client" | "office";
  authorName: string;
  body: string;
  hasVoiceNote: boolean;
  answered: boolean;
  createdAt: string;
};

export type OfficeCaseFile = {
  id: number;
  title: string;
  court: string;
  caseType: string;
  status: string;
  nextHearing: string | null;
  notes: string;
  createdAt: string;
  client: { id: number; name: string; phone: string; email: string; portalEnabled: boolean };
  hearings: OfficeHearing[];
  updates: { id: number; updateDate: string; message: string; author: string }[];
  documents: OfficeDocument[];
  messages: OfficeMessage[];
  fees:
    | { shown: false }
    | {
        shown: true;
        agreed: number;
        received: number;
        entries: { id: number; kind: string; amount: number; entryDate: string; note: string }[];
      };
};

export type Enquiry = {
  id: number;
  name: string;
  phone: string;
  email: string;
  subject: string;
  message: string;
  read: boolean;
  createdAt: string;
};

/** "Today", "Tomorrow", or "Mon 5 Oct" — how a cause list is read. */
export function dayHeading(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return isoDate;

  const startOfDay = (x: Date) => Date.UTC(x.getUTCFullYear(), x.getUTCMonth(), x.getUTCDate());
  const days = Math.round((startOfDay(d) - startOfDay(new Date())) / 86_400_000);

  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

/** Shapes the client portal reads, shared by its server and client pieces. */

export type CaseSummary = {
  id: number;
  title: string;
  court: string;
  caseType: string;
  status: string;
  nextHearing: string | null;
  messageCount: number;
  documentCount: number;
};

export type Hearing = { id: number; hearingDate: string; purpose: string };
export type CaseUpdate = { id: number; updateDate: string; message: string; author: string };
export type CaseDocument = {
  id: number;
  title: string;
  origName: string;
  sizeBytes: number;
  createdAt: string;
};

export type Fees =
  | { shown: false }
  | {
      shown: true;
      agreed: number;
      received: number;
      entries: { id: number; kind: string; amount: number; entryDate: string; note: string }[];
    };

export type CaseDetail = Omit<CaseSummary, "messageCount" | "documentCount"> & {
  createdAt: string;
  hearings: Hearing[];
  updates: CaseUpdate[];
  documents: CaseDocument[];
  fees: Fees;
};

export type CaseMessage = {
  id: number;
  authorType: "client" | "office";
  authorName: string;
  body: string;
  hasVoiceNote: boolean;
  answered: boolean;
  createdAt: string;
};

/** 14 March 2026 — written out, for a page that is read rather than scanned. */
export function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

/** "in 11 days" / "today" / "24 days ago". */
export function relativeDay(iso: string | null): string | null {
  if (!iso) return null;
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return null;

  const startOfDay = (d: Date) => Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  const days = Math.round((startOfDay(then) - startOfDay(new Date())) / 86_400_000);

  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days === -1) return "yesterday";
  return days > 0 ? `in ${days} days` : `${-days} days ago`;
}

export function formatRupees(amount: number): string {
  return `Rs ${amount.toLocaleString("en-PK")}`;
}

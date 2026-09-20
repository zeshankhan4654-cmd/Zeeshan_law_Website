import { CalendarDays, FileText, FolderOpen, MessageSquare } from "lucide-react";
import Link from "next/link";
import { portalFetch } from "@/lib/portal-session";
import { formatDate, relativeDay, type CaseSummary } from "@/lib/portal-types";

export const metadata = { title: "Your matters — The Arbitrator & Law Associates" };

function statusTone(status: string): string {
  const s = status.toLowerCase();
  if (s === "active") return "bg-success-wash text-success";
  if (s === "closed" || s === "decided") return "bg-rule text-ink-soft";
  return "bg-gold-wash text-gold";
}

export default async function PortalHome() {
  const data = await portalFetch<{ items: CaseSummary[] }>("/api/portal/cases");
  const cases = data?.items ?? [];

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="font-display text-2xl text-ink">Your matters</h1>
        <p className="text-sm text-ink-soft">
          {cases.length === 0
            ? "Nothing is on your file yet."
            : `${cases.length} matter${cases.length === 1 ? "" : "s"} with the chamber.`}
        </p>
      </div>

      {cases.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-card border border-rule bg-surface px-8 py-16 text-center">
          <FolderOpen className="size-7 text-rule" />
          <p className="max-w-sm text-sm leading-6 text-ink-soft">
            When the chamber opens a matter for you it will appear here, with
            its hearing dates and whatever has been posted on it.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {cases.map((c) => {
            const when = relativeDay(c.nextHearing);
            return (
              <li key={c.id}>
                <Link
                  href={`/client/cases/${c.id}`}
                  className="block space-y-2 rounded-card border border-rule bg-surface p-5 transition hover:border-gold/50 hover:shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <h2 className="font-display text-lg leading-7 text-ink">{c.title}</h2>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusTone(c.status)}`}
                    >
                      {c.status}
                    </span>
                  </div>

                  {c.court && <p className="text-sm text-ink-soft">{c.court}</p>}

                  {c.nextHearing && (
                    <p className="flex items-center gap-2 text-sm text-ink">
                      <CalendarDays className="size-4 text-gold" />
                      Next hearing {formatDate(c.nextHearing)}
                      {when && <span className="text-ink-soft">· {when}</span>}
                    </p>
                  )}

                  <p className="flex gap-4 pt-1 text-xs text-ink-soft">
                    <span className="flex items-center gap-1.5">
                      <FileText className="size-3.5" />
                      {c.documentCount} document{c.documentCount === 1 ? "" : "s"}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <MessageSquare className="size-3.5" />
                      {c.messageCount} message{c.messageCount === 1 ? "" : "s"}
                    </span>
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

import { ArrowLeft, Banknote, CalendarDays, FileText, Gavel, NotebookPen } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CaseThread } from "@/components/site/CaseThread";
import { portalFetch } from "@/lib/portal-session";
import { formatDate, formatRupees, relativeDay, type CaseDetail } from "@/lib/portal-types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="flex items-center gap-2 text-xs font-semibold tracking-[0.16em] text-gold uppercase">
        {icon}
        {title}
      </h2>
      {children}
    </section>
  );
}

function fileSize(bytes: number): string {
  if (bytes <= 0) return "";
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function PortalCase({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const caseId = Number(id);
  if (!Number.isInteger(caseId) || caseId < 1) notFound();

  // Null covers both "no such case" and "not yours" — the API answers 404
  // to either, deliberately, so one cannot be told from the other.
  const matter = await portalFetch<CaseDetail>(`/api/portal/cases/${caseId}`);
  if (!matter) notFound();

  const when = relativeDay(matter.nextHearing);

  return (
    <div className="space-y-8">
      <Link
        href="/client"
        className="inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-gold"
      >
        <ArrowLeft className="size-4" /> Your matters
      </Link>

      <header className="space-y-3 rounded-card border border-rule bg-surface p-6">
        <h1 className="font-display text-2xl leading-8 text-ink">{matter.title}</h1>
        {matter.court && <p className="text-sm text-ink-soft">{matter.court}</p>}
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-gold-wash px-2.5 py-0.5 text-xs font-semibold text-gold">
            {matter.status}
          </span>
          {matter.caseType && (
            <span className="rounded-full bg-gold-wash px-2.5 py-0.5 text-xs font-semibold text-gold">
              {matter.caseType}
            </span>
          )}
        </div>
        {matter.nextHearing && (
          <p className="flex items-center gap-2 rounded-card bg-gold-wash px-4 py-3 text-sm font-semibold text-ink">
            <CalendarDays className="size-4 text-gold" />
            Next hearing {formatDate(matter.nextHearing)}
            {when && <span className="font-normal text-ink-soft">· {when}</span>}
          </p>
        )}
      </header>

      <Section icon={<NotebookPen className="size-4" />} title="What has happened">
        {matter.updates.length === 0 ? (
          <p className="rounded-card border border-rule bg-surface p-5 text-sm text-ink-soft">
            No progress has been posted on this matter yet.
          </p>
        ) : (
          <ol className="space-y-3">
            {matter.updates.map((u) => (
              <li key={u.id} className="space-y-1 rounded-card border border-rule bg-surface p-5">
                <p className="text-xs font-semibold text-gold">{formatDate(u.updateDate)}</p>
                <p className="leading-7 text-ink">{u.message}</p>
                {u.author && <p className="text-xs text-ink-soft">— {u.author}</p>}
              </li>
            ))}
          </ol>
        )}
      </Section>

      <Section icon={<Gavel className="size-4" />} title="Hearings">
        {matter.hearings.length === 0 ? (
          <p className="rounded-card border border-rule bg-surface p-5 text-sm text-ink-soft">
            No hearings have been recorded yet.
          </p>
        ) : (
          <ul className="divide-y divide-rule overflow-hidden rounded-card border border-rule bg-surface">
            {matter.hearings.map((h) => (
              <li key={h.id} className="flex flex-wrap gap-x-5 gap-y-1 px-5 py-3.5">
                <span className="w-40 text-sm font-semibold text-ink">
                  {formatDate(h.hearingDate)}
                </span>
                <span className="text-sm text-ink-soft">{h.purpose || "Hearing"}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section icon={<FileText className="size-4" />} title="Documents shared with you">
        {matter.documents.length === 0 ? (
          <p className="rounded-card border border-rule bg-surface p-5 text-sm text-ink-soft">
            The office has not shared any documents on this matter.
          </p>
        ) : (
          <ul className="space-y-2">
            {matter.documents.map((d) => (
              <li key={d.id}>
                <a
                  href={`${API_URL}/api/portal/documents/${d.id}`}
                  className="flex items-center gap-3 rounded-card border border-rule bg-surface px-5 py-4 transition hover:border-gold/50"
                >
                  <FileText className="size-5 shrink-0 text-gold" strokeWidth={1.6} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-ink">
                      {d.title}
                    </span>
                    <span className="block text-xs text-ink-soft">
                      {[d.origName, fileSize(d.sizeBytes), formatDate(d.createdAt)]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {matter.fees.shown && (
        <Section icon={<Banknote className="size-4" />} title="Fees">
          <dl className="space-y-3 rounded-card border border-rule bg-surface p-5 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink-soft">Agreed</dt>
              <dd className="font-semibold text-ink">{formatRupees(matter.fees.agreed)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-soft">Received</dt>
              <dd className="font-semibold text-ink">{formatRupees(matter.fees.received)}</dd>
            </div>
            <div className="flex justify-between border-t border-rule pt-3">
              <dt className="font-semibold text-ink">Outstanding</dt>
              <dd className="font-semibold text-ink">
                {formatRupees(matter.fees.agreed - matter.fees.received)}
              </dd>
            </div>
          </dl>
        </Section>
      )}

      <CaseThread caseId={caseId} />
    </div>
  );
}

import {
  ArrowLeft,
  Banknote,
  FileText,
  Gavel,
  Lock,
  MessageSquare,
  NotebookPen,
  Phone,
  User,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { NotPermitted } from "@/components/office/PageHeading";
import { officeFetch, type OfficeCaseFile } from "@/lib/office-data";
import { formatDate, formatRupees } from "@/lib/portal-types";
import { CaseForm } from "../CaseForm";
import { AddHearing, Composer, DocumentRow, FeeEntry, HearingOutcome, UploadDocument } from "./CaseActions";

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
    <section className="space-y-3 rounded-card border border-rule bg-surface p-6">
      <h2 className="flex items-center gap-2 font-display text-lg text-ink">
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

export default async function OfficeCase({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const caseId = Number(id);
  if (!Number.isInteger(caseId) || caseId < 1) notFound();

  const file = await officeFetch<OfficeCaseFile>(`/api/office/cases/${caseId}`);
  if (!file) return <NotPermitted />;

  const unanswered = file.messages.filter((m) => m.authorType === "client" && !m.answered).length;

  return (
    <>
      <Link
        href="/office/cases"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-gold"
      >
        <ArrowLeft className="size-4" /> Cases
      </Link>

      <header className="space-y-2 pb-6">
        <h1 className="font-display text-2xl text-ink">{file.title}</h1>
        <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-soft">
          <Link href={`/office/clients/${file.client.id}`} className="flex items-center gap-1.5 hover:text-gold">
            <User className="size-4" />
            {file.client.name}
          </Link>
          {file.client.phone && (
            <a href={`tel:${file.client.phone.replace(/\s/g, "")}`} className="flex items-center gap-1.5 text-gold hover:underline">
              <Phone className="size-4" />
              {file.client.phone}
            </a>
          )}
          {file.court && <span>{file.court}</span>}
          <span className="rounded-full bg-gold-wash px-2.5 py-0.5 text-xs font-semibold text-gold">
            {file.status}
          </span>
          {file.nextHearing && <span>Next hearing {formatDate(file.nextHearing)}</span>}
        </p>
      </header>

      <div className="space-y-6">
        {file.notes && (
          <div className="space-y-1.5 rounded-card border border-gold/40 bg-gold-wash p-5">
            <p className="flex items-center gap-2 text-xs font-semibold tracking-[0.1em] text-gold uppercase">
              <Lock className="size-3.5" /> Chamber note — never shared
            </p>
            <p className="leading-7 whitespace-pre-wrap text-ink">{file.notes}</p>
          </div>
        )}

        <Section icon={<Gavel className="size-5 text-gold" />} title="Hearings">
          {file.hearings.length > 0 && (
            <ul className="divide-y divide-rule">
              {file.hearings.map((h) => (
                <li key={h.id} className="space-y-1.5 py-3">
                  <p className="flex flex-wrap gap-x-4 text-sm">
                    <span className="w-36 font-medium text-ink">{formatDate(h.hearingDate)}</span>
                    <span className="text-ink-soft">{h.purpose || "Hearing"}</span>
                  </p>
                  {h.outcome ? (
                    <p className="text-sm leading-6 text-ink">{h.outcome}</p>
                  ) : (
                    <p className="text-xs text-ink-soft">No outcome recorded.</p>
                  )}
                  <HearingOutcome hearing={h} />
                </li>
              ))}
            </ul>
          )}
          <AddHearing caseId={caseId} />
        </Section>

        <Section icon={<NotebookPen className="size-5 text-gold" />} title="Posted to the client">
          {file.updates.length > 0 && (
            <ul className="divide-y divide-rule">
              {file.updates.map((u) => (
                <li key={u.id} className="space-y-1 py-3">
                  <p className="text-xs font-semibold text-gold">{formatDate(u.updateDate)}</p>
                  <p className="leading-6 text-ink">{u.message}</p>
                  {u.author && <p className="text-xs text-ink-soft">— {u.author}</p>}
                </li>
              ))}
            </ul>
          )}
          <Composer caseId={caseId} kind="update" />
        </Section>

        <Section
          icon={<MessageSquare className="size-5 text-gold" />}
          title={unanswered > 0 ? `Messages · ${unanswered} unanswered` : "Messages"}
        >
          {file.messages.length === 0 ? (
            <p className="text-sm text-ink-soft">Nothing has been sent on this matter.</p>
          ) : (
            <ul className="space-y-2">
              {file.messages.map((m) => (
                <li
                  key={m.id}
                  className={`space-y-1.5 rounded-card p-4 ${
                    m.authorType === "client" ? "border border-rule bg-ground" : "bg-gold-wash"
                  }`}
                >
                  <p className="text-xs font-semibold text-gold">
                    {m.authorType === "client" ? m.authorName || "The client" : "The office"}
                    {m.authorType === "client" && !m.answered && " · unanswered"}
                  </p>
                  {m.body && <p className="text-sm leading-6 text-ink">{m.body}</p>}
                  {m.hasVoiceNote && (
                    <audio
                      controls
                      preload="none"
                      crossOrigin="use-credentials"
                      src={`${API_URL}/api/portal/messages/${m.id}/audio`}
                      className="h-9 w-full max-w-xs"
                    />
                  )}
                </li>
              ))}
            </ul>
          )}
          <Composer caseId={caseId} kind="reply" />
        </Section>

        <Section icon={<FileText className="size-5 text-gold" />} title="Documents">
          {file.documents.length > 0 && (
            <ul className="divide-y divide-rule">
              {file.documents.map((d) => (
                <li key={d.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
                  <a
                    href={`${API_URL}/api/office/documents/${d.id}`}
                    className="min-w-48 flex-1 text-sm font-medium text-ink hover:text-gold"
                  >
                    {d.title}
                    <span className="block text-xs font-normal text-ink-soft">
                      {[d.origName, fileSize(d.sizeBytes)].filter(Boolean).join(" · ")}
                    </span>
                  </a>
                  <DocumentRow document={d} />
                </li>
              ))}
            </ul>
          )}
          <UploadDocument caseId={caseId} />
        </Section>

        {file.fees.shown && (
          <Section icon={<Banknote className="size-5 text-gold" />} title="Fees">
            <dl className="flex flex-wrap gap-x-10 gap-y-2 text-sm">
              <div>
                <dt className="text-ink-soft">Agreed</dt>
                <dd className="font-medium text-ink">{formatRupees(file.fees.agreed)}</dd>
              </div>
              <div>
                <dt className="text-ink-soft">Received</dt>
                <dd className="font-medium text-ink">{formatRupees(file.fees.received)}</dd>
              </div>
              <div>
                <dt className="text-ink-soft">Outstanding</dt>
                <dd className="font-medium text-ink">
                  {formatRupees(file.fees.agreed - file.fees.received)}
                </dd>
              </div>
            </dl>
            <FeeEntry caseId={caseId} entries={file.fees.entries} />
          </Section>
        )}

        <details className="rounded-card border border-rule bg-surface">
          <summary className="cursor-pointer px-6 py-4 text-sm font-medium text-ink">
            Edit the case details
          </summary>
          <div className="border-t border-rule p-2">
            <CaseForm id={caseId} initial={file} />
          </div>
        </details>
      </div>
    </>
  );
}

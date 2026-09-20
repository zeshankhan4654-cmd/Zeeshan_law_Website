import { CalendarDays, CheckCircle2, Phone, User } from "lucide-react";
import Link from "next/link";
import { Empty, NotPermitted, PageHeading } from "@/components/office/PageHeading";
import { dayHeading, officeFetch, type DiaryDay } from "@/lib/office-data";

export const metadata = { title: "Cause list — Office" };

export default async function CauseList() {
  const diary = await officeFetch<{ days: DiaryDay[] }>("/api/office/diary?days=21");
  if (!diary) return <NotPermitted />;

  const total = diary.days.reduce((n, d) => n + d.hearings.length, 0);

  return (
    <>
      <PageHeading
        title="Cause list"
        subtitle={`${total} matter${total === 1 ? "" : "s"} listed in the next three weeks`}
      />

      {diary.days.length === 0 ? (
        <Empty>Nothing is listed in the next three weeks.</Empty>
      ) : (
        <div className="space-y-7">
          {diary.days.map((day) => (
            <section key={day.date} className="space-y-2">
              <h2 className="flex items-center gap-2 text-xs font-semibold tracking-[0.14em] text-gold uppercase">
                <CalendarDays className="size-4" />
                {dayHeading(day.date)} · {day.hearings.length} matter
                {day.hearings.length === 1 ? "" : "s"}
              </h2>

              <ul className="space-y-2">
                {day.hearings.map((h) => (
                  <li key={h.id}>
                    <Link
                      href={`/office/cases/${h.caseId}`}
                      className="block space-y-1 rounded-card border border-rule bg-surface p-4 transition hover:border-gold/50"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="font-medium text-ink">{h.caseTitle}</p>
                        {h.recorded && (
                          <span title="Outcome recorded">
                            <CheckCircle2 className="size-4 shrink-0 text-success" />
                          </span>
                        )}
                      </div>
                      {h.court && <p className="text-sm text-ink-soft">{h.court}</p>}
                      {h.purpose && <p className="text-sm text-ink">{h.purpose}</p>}
                      <p className="flex flex-wrap items-center gap-4 pt-1 text-xs text-ink-soft">
                        <span className="flex items-center gap-1.5">
                          <User className="size-3.5" />
                          {h.clientName}
                        </span>
                        {h.clientPhone && (
                          <span className="flex items-center gap-1.5 text-gold">
                            <Phone className="size-3.5" />
                            {h.clientPhone}
                          </span>
                        )}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </>
  );
}

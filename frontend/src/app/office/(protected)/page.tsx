import { CalendarDays, FolderOpen, Inbox, MessageSquare, Users } from "lucide-react";
import Link from "next/link";
import { dayHeading, officeFetch, type DiaryDay, type Enquiry } from "@/lib/office-data";
import { getSessionUser } from "@/lib/session";

/**
 * What the chamber wants on opening the office: what is listed today, who
 * is waiting for an answer, and what has come in from the website.
 *
 * Every panel resolves to null when the signed-in role may not see it, so
 * a colleague gets a shorter dashboard rather than an error.
 */
export default async function DashboardPage() {
  const [user, diary, unanswered, enquiries] = await Promise.all([
    getSessionUser(), // the layout above already guarantees this is non-null
    officeFetch<{ days: DiaryDay[] }>("/api/office/diary?days=7"),
    officeFetch<{ items: { id: number; caseId: number; caseTitle: string; clientName: string }[] }>(
      "/api/office/messages/unanswered"
    ),
    officeFetch<{ items: Enquiry[]; unread: number }>("/api/office/enquiries?unreadOnly=true&limit=5"),
  ]);

  const today = diary?.days[0];
  const todayIsToday = today ? dayHeading(today.date) === "Today" : false;
  const listedToday = todayIsToday ? today!.hearings.length : 0;
  const thisWeek = diary?.days.reduce((n, d) => n + d.hearings.length, 0) ?? 0;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="font-display text-2xl text-ink">Good to see you, {user?.fullName}.</h1>
        <p className="text-sm text-ink-soft">
          {listedToday > 0
            ? `${listedToday} matter${listedToday === 1 ? "" : "s"} listed today.`
            : "Nothing is listed today."}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          {
            show: diary !== null,
            href: "/office/causelist",
            icon: CalendarDays,
            value: thisWeek,
            label: "listed this week",
          },
          {
            show: unanswered !== null,
            href: "/office/cases",
            icon: MessageSquare,
            value: unanswered?.items.length ?? 0,
            label: "clients awaiting an answer",
          },
          {
            show: enquiries !== null,
            href: "/office/enquiries",
            icon: Inbox,
            value: enquiries?.unread ?? 0,
            label: "unread enquiries",
          },
        ]
          .filter((tile) => tile.show)
          .map((tile) => (
            <Link
              key={tile.href + tile.label}
              href={tile.href}
              className="space-y-2 rounded-card border border-rule bg-surface p-5 transition hover:border-gold/50"
            >
              <tile.icon className="size-5 text-gold" strokeWidth={1.6} />
              <p className="font-display text-3xl text-ink">{tile.value}</p>
              <p className="text-sm text-ink-soft">{tile.label}</p>
            </Link>
          ))}
      </div>

      {todayIsToday && today && today.hearings.length > 0 && (
        <section className="space-y-3 rounded-card border border-rule bg-surface p-6">
          <h2 className="font-display text-lg text-ink">Today at court</h2>
          <ul className="divide-y divide-rule">
            {today.hearings.map((h) => (
              <li key={h.id}>
                <Link href={`/office/cases/${h.caseId}`} className="block space-y-0.5 py-3 hover:text-gold">
                  <p className="text-sm font-medium text-ink">{h.caseTitle}</p>
                  <p className="text-xs text-ink-soft">
                    {[h.court, h.purpose, h.clientName].filter(Boolean).join(" · ")}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {unanswered && unanswered.items.length > 0 && (
        <section className="space-y-3 rounded-card border border-rule bg-surface p-6">
          <h2 className="font-display text-lg text-ink">Clients waiting for an answer</h2>
          <ul className="divide-y divide-rule">
            {unanswered.items.slice(0, 6).map((m) => (
              <li key={m.id}>
                <Link href={`/office/cases/${m.caseId}`} className="block py-3 text-sm hover:text-gold">
                  <span className="font-medium text-ink">{m.clientName}</span>
                  <span className="text-ink-soft"> · {m.caseTitle}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="flex flex-wrap gap-3">
        <Link
          href="/office/clients/new"
          className="flex items-center gap-2 rounded-card border border-rule bg-surface px-4 py-3 text-sm font-medium text-ink hover:border-gold/50"
        >
          <Users className="size-4 text-gold" /> Add a client
        </Link>
        <Link
          href="/office/cases/new"
          className="flex items-center gap-2 rounded-card border border-rule bg-surface px-4 py-3 text-sm font-medium text-ink hover:border-gold/50"
        >
          <FolderOpen className="size-4 text-gold" /> Open a case
        </Link>
      </div>
    </div>
  );
}

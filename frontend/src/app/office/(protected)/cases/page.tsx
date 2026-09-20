import Link from "next/link";
import { Empty, NotPermitted, PageHeading } from "@/components/office/PageHeading";
import { officeFetch, type OfficeCaseRow } from "@/lib/office-data";
import { formatDate } from "@/lib/portal-types";

export const metadata = { title: "Cases — Office" };

export default async function Cases({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const data = await officeFetch<{ items: OfficeCaseRow[]; total: number }>(
    `/api/office/cases?q=${encodeURIComponent(q)}`
  );
  if (!data) return <NotPermitted />;

  return (
    <>
      <PageHeading
        title="Cases"
        subtitle={`${data.total} on the books`}
        action={{ href: "/office/cases/new", label: "Open a case" }}
      />

      <form method="get" className="flex gap-3 pb-5">
        <input
          name="q"
          defaultValue={q}
          placeholder="Case, court or client"
          className="w-full max-w-sm rounded-md border border-rule bg-surface px-3 py-2 text-sm text-ink focus:border-gold focus:outline-none"
        />
        <button type="submit" className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-white">
          Search
        </button>
      </form>

      {data.items.length === 0 ? (
        <Empty>{q ? `Nothing matches “${q}”.` : "No cases yet."}</Empty>
      ) : (
        <ul className="space-y-2">
          {data.items.map((c) => (
            <li key={c.id}>
              <Link
                href={`/office/cases/${c.id}`}
                className="block space-y-1 rounded-card border border-rule bg-surface px-5 py-3.5 transition hover:border-gold/50"
              >
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                  <span className="min-w-56 flex-1 font-medium text-ink">{c.title}</span>
                  <span className="rounded-full bg-gold-wash px-2.5 py-0.5 text-xs font-semibold text-gold">
                    {c.status}
                  </span>
                  {c.nextHearing && (
                    <span className="text-xs text-ink-soft">{formatDate(c.nextHearing)}</span>
                  )}
                </div>
                <p className="text-sm text-ink-soft">
                  {[c.client.name, c.court].filter(Boolean).join(" · ")}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

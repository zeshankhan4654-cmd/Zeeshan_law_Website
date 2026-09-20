import { CheckCircle2, Mail, Phone } from "lucide-react";
import Link from "next/link";
import { Empty, NotPermitted, PageHeading } from "@/components/office/PageHeading";
import { officeFetch, type ClientRow } from "@/lib/office-data";

export const metadata = { title: "Clients — Office" };

export default async function Clients({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const data = await officeFetch<{ items: ClientRow[]; total: number }>(
    `/api/office/clients?q=${encodeURIComponent(q)}`
  );
  if (!data) return <NotPermitted />;

  return (
    <>
      <PageHeading
        title="Clients"
        subtitle={`${data.total} on the books`}
        action={{ href: "/office/clients/new", label: "Add a client" }}
      />

      <form method="get" className="flex gap-3 pb-5">
        <input
          name="q"
          defaultValue={q}
          placeholder="Name, telephone or email"
          className="w-full max-w-sm rounded-md border border-rule bg-surface px-3 py-2 text-sm text-ink focus:border-gold focus:outline-none"
        />
        <button type="submit" className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-white">
          Search
        </button>
      </form>

      {data.items.length === 0 ? (
        <Empty>{q ? `Nobody matches “${q}”.` : "No clients yet."}</Empty>
      ) : (
        <ul className="space-y-2">
          {data.items.map((c) => (
            <li key={c.id}>
              <Link
                href={`/office/clients/${c.id}`}
                className="flex flex-wrap items-center gap-x-6 gap-y-1 rounded-card border border-rule bg-surface px-5 py-3.5 transition hover:border-gold/50"
              >
                <span className="min-w-48 flex-1 font-medium text-ink">{c.name}</span>
                {c.phone && (
                  <span className="flex items-center gap-1.5 text-sm text-ink-soft">
                    <Phone className="size-3.5" />
                    {c.phone}
                  </span>
                )}
                {c.email && (
                  <span className="flex items-center gap-1.5 text-sm text-ink-soft">
                    <Mail className="size-3.5" />
                    {c.email}
                  </span>
                )}
                <span className="text-sm text-ink-soft">
                  {c.caseCount} case{c.caseCount === 1 ? "" : "s"}
                </span>
                {c.portalEnabled && (
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-success">
                    <CheckCircle2 className="size-3.5" />
                    portal
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

import Link from "next/link";
import { Empty, NotPermitted, PageHeading } from "@/components/office/PageHeading";
import { Totals } from "@/components/office/Ledger";
import { officeFetch } from "@/lib/office-data";
import { formatDate, formatRupees } from "@/lib/portal-types";

export const metadata = { title: "Professional fees — Office" };

type Row = {
  id: number;
  kind: string;
  amount: number;
  entryDate: string;
  note: string;
  caseId: number;
  caseTitle: string;
  clientName: string;
};

/**
 * Professional fees across every case. Read only, deliberately: a fee
 * belongs to a matter, and is recorded and removed on that matter's file
 * where the context is. This is the "what is outstanding" view.
 */
export default async function Fees() {
  const data = await officeFetch<{ items: Row[]; agreed: number; received: number }>(
    "/api/office/fees"
  );
  if (!data) return <NotPermitted />;

  return (
    <>
      <PageHeading title="Professional fees" subtitle="Across every matter." />

      <div className="space-y-4">
        <Totals
          figures={[
            { label: "Agreed", amount: data.agreed },
            { label: "Received", amount: data.received },
            { label: "Outstanding", amount: data.agreed - data.received },
          ]}
        />

        {data.items.length === 0 ? (
          <Empty>No fees recorded yet. They are entered on a case&rsquo;s own file.</Empty>
        ) : (
          <ul className="divide-y divide-rule rounded-card border border-rule bg-surface">
            {data.items.map((f) => (
              <li key={f.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 text-sm">
                <span className="w-32 text-ink-soft">{formatDate(f.entryDate)}</span>
                <span className="w-24 text-xs font-semibold text-gold uppercase">{f.kind}</span>
                <span className="w-32 font-medium text-ink">{formatRupees(f.amount)}</span>
                <Link href={`/office/cases/${f.caseId}`} className="min-w-48 flex-1 text-ink hover:text-gold">
                  {f.caseTitle}
                  <span className="block text-xs text-ink-soft">{f.clientName}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

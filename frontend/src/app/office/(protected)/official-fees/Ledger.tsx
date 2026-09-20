"use client";

import Link from "next/link";
import { AddRow, DeleteRow, Totals } from "@/components/office/Ledger";
import { formatDate, formatRupees } from "@/lib/portal-types";
import { useAddOfficialFee, useDeleteOfficialFee } from "@/lib/use-office-diary";

export type OfficialFeeRow = {
  id: number;
  caseId: number | null;
  caseTitle: string | null;
  kind: string;
  amount: number;
  entryDate: string;
  note: string;
};

export function OfficialFees({
  items,
  total,
  canEdit,
}: {
  items: OfficialFeeRow[];
  total: number;
  canEdit: boolean;
}) {
  const add = useAddOfficialFee();
  const remove = useDeleteOfficialFee();

  return (
    <div className="space-y-4">
      <Totals figures={[{ label: "Paid out", amount: total }]} />

      <AddRow
        canEdit={canEdit}
        busy={add.isPending}
        fields={[
          { id: "of-kind", label: "What for", placeholder: "Court fee, stamp duty…" },
          { id: "of-amount", label: "Amount", type: "number", width: "w-36" },
          { id: "of-date", label: "Date", type: "date", width: "w-44" },
          { id: "of-case", label: "Case number", type: "number", width: "w-32", placeholder: "optional" },
          { id: "of-note", label: "Note" },
        ]}
        onAdd={async (v) => {
          await add.mutateAsync({
            kind: v["of-kind"] ?? "",
            amount: Number(v["of-amount"] ?? 0),
            entryDate: v["of-date"] || new Date().toISOString().slice(0, 10),
            caseId: v["of-case"] ? Number(v["of-case"]) : null,
            note: v["of-note"] ?? "",
          });
        }}
      />

      {items.length === 0 ? (
        <p className="rounded-card border border-rule bg-surface px-6 py-12 text-center text-sm text-ink-soft">
          Nothing recorded yet.
        </p>
      ) : (
        <ul className="divide-y divide-rule rounded-card border border-rule bg-surface">
          {items.map((f) => (
            <li key={f.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 text-sm">
              <span className="w-32 text-ink-soft">{formatDate(f.entryDate)}</span>
              <span className="w-40 font-medium text-ink">{f.kind}</span>
              <span className="w-32 font-medium text-ink">{formatRupees(f.amount)}</span>
              <span className="min-w-40 flex-1 text-ink-soft">
                {f.caseId && f.caseTitle ? (
                  <Link href={`/office/cases/${f.caseId}`} className="hover:text-gold">
                    {f.caseTitle}
                  </Link>
                ) : (
                  f.note
                )}
              </span>
              {canEdit && (
                <DeleteRow
                  onDelete={() => remove.mutate(f.id)}
                  busy={remove.isPending}
                  label="Remove this entry"
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

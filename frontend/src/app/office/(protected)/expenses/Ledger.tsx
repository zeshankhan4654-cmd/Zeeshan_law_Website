"use client";

import { AddRow, DeleteRow, Totals } from "@/components/office/Ledger";
import { formatDate, formatRupees } from "@/lib/portal-types";
import { useAddExpense, useDeleteExpense } from "@/lib/use-office-diary";

export type ExpenseRow = {
  id: number;
  category: string;
  amount: number;
  expenseDate: string;
  description: string;
};

export function Expenses({
  items,
  total,
  byCategory,
  canEdit,
}: {
  items: ExpenseRow[];
  total: number;
  byCategory: { category: string; total: number }[];
  canEdit: boolean;
}) {
  const add = useAddExpense();
  const remove = useDeleteExpense();

  return (
    <div className="space-y-4">
      <Totals figures={[{ label: "Spent", amount: total }]} />

      {byCategory.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {byCategory.map((c) => (
            <span
              key={c.category}
              className="rounded-full bg-gold-wash px-3 py-1 text-xs font-semibold text-gold"
            >
              {c.category} · {formatRupees(c.total)}
            </span>
          ))}
        </div>
      )}

      <AddRow
        canEdit={canEdit}
        busy={add.isPending}
        fields={[
          { id: "ex-category", label: "Category", placeholder: "Stationery, travel, rent…" },
          { id: "ex-amount", label: "Amount", type: "number", width: "w-36" },
          { id: "ex-date", label: "Date", type: "date", width: "w-44" },
          { id: "ex-description", label: "Description" },
        ]}
        onAdd={async (v) => {
          await add.mutateAsync({
            category: v["ex-category"] ?? "",
            amount: Number(v["ex-amount"] ?? 0),
            expenseDate: v["ex-date"] || new Date().toISOString().slice(0, 10),
            description: v["ex-description"] ?? "",
          });
        }}
      />

      {items.length === 0 ? (
        <p className="rounded-card border border-rule bg-surface px-6 py-12 text-center text-sm text-ink-soft">
          Nothing recorded yet.
        </p>
      ) : (
        <ul className="divide-y divide-rule rounded-card border border-rule bg-surface">
          {items.map((e) => (
            <li key={e.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 text-sm">
              <span className="w-32 text-ink-soft">{formatDate(e.expenseDate)}</span>
              <span className="w-40 font-medium text-ink">{e.category}</span>
              <span className="w-32 font-medium text-ink">{formatRupees(e.amount)}</span>
              <span className="min-w-40 flex-1 text-ink-soft">{e.description}</span>
              {canEdit && (
                <DeleteRow
                  onDelete={() => remove.mutate(e.id)}
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

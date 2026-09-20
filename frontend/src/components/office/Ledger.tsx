"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { formatRupees } from "@/lib/portal-types";

export const ledgerInput =
  "w-full rounded-md border border-rule bg-ground px-3 py-2 text-sm text-ink focus:border-gold focus:outline-none";

/** The totals strip every money screen carries. */
export function Totals({ figures }: { figures: { label: string; amount: number }[] }) {
  return (
    <dl className="flex flex-wrap gap-x-10 gap-y-3 rounded-card border border-rule bg-surface p-5">
      {figures.map((f) => (
        <div key={f.label}>
          <dt className="text-sm text-ink-soft">{f.label}</dt>
          <dd className="font-display text-2xl text-ink">{formatRupees(f.amount)}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * The add-a-row form and the delete button, shared by the two ledgers.
 * `canEdit` comes from the server, which has already checked the same
 * capability the API will check on the write itself.
 */
export function AddRow({
  fields,
  onAdd,
  busy,
  canEdit,
}: {
  fields: { id: string; label: string; type?: string; placeholder?: string; width?: string }[];
  onAdd: (values: Record<string, string>) => Promise<void> | void;
  busy: boolean;
  canEdit: boolean;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState("");

  if (!canEdit) return null;

  return (
    <div className="space-y-2 rounded-card border border-dashed border-rule p-4">
      <div className="flex flex-wrap items-end gap-3">
        {fields.map((f) => (
          <div key={f.id} className={`space-y-1 ${f.width ?? "min-w-40 flex-1"}`}>
            <label htmlFor={f.id} className="block text-xs font-medium text-ink-soft">
              {f.label}
            </label>
            <input
              id={f.id}
              type={f.type ?? "text"}
              placeholder={f.placeholder}
              value={values[f.id] ?? ""}
              onChange={(e) => setValues((v) => ({ ...v, [f.id]: e.target.value }))}
              className={ledgerInput}
            />
          </div>
        ))}
        <Button
          type="button"
          size="sm"
          disabled={busy}
          onClick={async () => {
            setError("");
            try {
              await onAdd(values);
              setValues({});
            } catch (err) {
              setError(err instanceof Error ? err.message : "That did not save.");
            }
          }}
        >
          <Plus className="size-4" /> Add
        </Button>
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}

export function DeleteRow({
  onDelete,
  busy,
  label,
}: {
  onDelete: () => void;
  busy: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onDelete}
      disabled={busy}
      aria-label={label}
      className="text-danger hover:opacity-70 disabled:opacity-40"
    >
      <Trash2 className="size-4" />
    </button>
  );
}

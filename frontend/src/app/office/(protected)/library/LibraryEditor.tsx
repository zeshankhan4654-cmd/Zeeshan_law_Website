"use client";

import { Eye, EyeOff, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import {
  useDeleteLibraryEntry,
  useSaveLibraryEntry,
  type LibraryKind,
} from "@/lib/use-office-diary";

const input =
  "w-full rounded-md border border-rule bg-ground px-3 py-2 text-sm text-ink focus:border-gold focus:outline-none";

export type FieldSpec = {
  key: string;
  label: string;
  type?: "text" | "date" | "textarea" | "url";
  hint?: string;
  rows?: number;
  full?: boolean;
};

/**
 * `subtitle` is computed on the server and sent as a plain string.
 *
 * It began life as a `subtitleOf` function prop, which React refuses to
 * serialise across the Server/Client boundary — a runtime error no
 * typecheck catches, and one only found by opening the page.
 */
export type Entry = Record<string, unknown> & {
  id: number;
  title: string;
  published: boolean;
  subtitle: string;
};

function Form({
  kind,
  fields,
  entry,
  canPublish,
  onDone,
}: {
  kind: LibraryKind;
  fields: FieldSpec[];
  entry?: Entry;
  canPublish: boolean;
  onDone?: () => void;
}) {
  const save = useSaveLibraryEntry(kind, entry?.id);
  const [values, setValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const f of fields) {
      const raw = entry?.[f.key];
      initial[f.key] =
        raw == null ? "" : f.type === "date" ? String(raw).slice(0, 10) : String(raw);
    }
    return initial;
  });
  const [published, setPublished] = useState(entry?.published ?? false);
  const [error, setError] = useState("");

  return (
    <div className="space-y-3 rounded-card border border-dashed border-rule p-5">
      <div className="grid gap-3 sm:grid-cols-2">
        {fields.map((f) => (
          <div key={f.key} className={`space-y-1 ${f.full ? "sm:col-span-2" : ""}`}>
            <label htmlFor={`${kind}-${f.key}-${entry?.id ?? "new"}`} className="block text-xs font-medium text-ink-soft">
              {f.label}
            </label>
            {f.type === "textarea" ? (
              <textarea
                id={`${kind}-${f.key}-${entry?.id ?? "new"}`}
                rows={f.rows ?? 3}
                value={values[f.key] ?? ""}
                onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                className={input}
              />
            ) : (
              <input
                id={`${kind}-${f.key}-${entry?.id ?? "new"}`}
                type={f.type === "date" ? "date" : "text"}
                value={values[f.key] ?? ""}
                onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                className={input}
              />
            )}
            {f.hint && <p className="text-xs leading-5 text-ink-soft">{f.hint}</p>}
          </div>
        ))}
      </div>

      <label className="flex items-center gap-2 text-sm text-ink">
        <input
          type="checkbox"
          checked={published}
          disabled={!canPublish}
          onChange={(e) => setPublished(e.target.checked)}
          className="size-4 accent-[var(--color-gold)] disabled:opacity-40"
        />
        On the public website
        {!canPublish && (
          <span className="text-xs text-ink-soft">
            — your role may write entries but not publish them
          </span>
        )}
      </label>

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          disabled={save.isPending || (values.title ?? "").trim().length < 3}
          onClick={() => {
            setError("");
            const payload: Record<string, unknown> = { ...values, published };
            // Empty date fields mean "not set", not the epoch.
            for (const f of fields) {
              if (f.type === "date" && !values[f.key]) payload[f.key] = null;
            }
            save.mutate(payload, {
              onSuccess: () => onDone?.(),
              onError: (err) => setError(err instanceof Error ? err.message : "That did not save."),
            });
          }}
        >
          {save.isPending ? "Saving…" : entry ? "Save" : "Add it"}
        </Button>
        {onDone && (
          <Button type="button" size="sm" variant="ghost" onClick={onDone}>
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
}

export function LibraryEditor({
  kind,
  fields,
  entries,
  canEdit,
  canPublish,
  canDelete,
  addLabel,
  emptyNote,
}: {
  kind: LibraryKind;
  fields: FieldSpec[];
  entries: Entry[];
  canEdit: boolean;
  canPublish: boolean;
  canDelete: boolean;
  addLabel: string;
  emptyNote: string;
}) {
  const remove = useDeleteLibraryEntry(kind);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);

  return (
    <div className="space-y-4">
      {canEdit &&
        (adding ? (
          <Form kind={kind} fields={fields} canPublish={canPublish} onDone={() => setAdding(false)} />
        ) : (
          <Button type="button" onClick={() => setAdding(true)}>
            <Plus className="size-4" /> {addLabel}
          </Button>
        ))}

      {entries.length === 0 ? (
        <p className="rounded-card border border-rule bg-surface px-6 py-12 text-center text-sm leading-6 text-ink-soft">
          {emptyNote}
        </p>
      ) : (
        <ul className="space-y-2">
          {entries.map((e) =>
            editing === e.id ? (
              <li key={e.id}>
                <Form
                  kind={kind}
                  fields={fields}
                  entry={e}
                  canPublish={canPublish}
                  onDone={() => setEditing(null)}
                />
              </li>
            ) : (
              <li
                key={e.id}
                className={`flex flex-wrap items-center gap-x-4 gap-y-2 rounded-card border p-4 ${
                  e.published ? "border-rule bg-surface" : "border-dashed border-rule bg-ground"
                }`}
              >
                <span className="min-w-56 flex-1">
                  <span className="block font-medium text-ink">{e.title}</span>
                  <span className="block text-xs text-ink-soft">{e.subtitle}</span>
                </span>

                <span
                  className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                    e.published ? "bg-success-wash text-success" : "bg-rule/60 text-ink-soft"
                  }`}
                >
                  {e.published ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
                  {e.published ? "on the website" : "draft"}
                </span>

                {canEdit && (
                  <button
                    type="button"
                    onClick={() => setEditing(e.id)}
                    className="text-xs font-semibold text-gold hover:underline"
                  >
                    Edit
                  </button>
                )}
                {canDelete && (
                  <button
                    type="button"
                    onClick={() => remove.mutate(e.id)}
                    disabled={remove.isPending}
                    aria-label={`Remove ${e.title}`}
                    className="text-danger hover:opacity-70"
                  >
                    <Trash2 className="size-4" />
                  </button>
                )}
              </li>
            )
          )}
        </ul>
      )}
    </div>
  );
}

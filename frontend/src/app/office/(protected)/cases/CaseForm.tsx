"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { useSaveCase, type CaseFields } from "@/lib/use-office";

const STATUSES = ["Active", "Reserved", "Decided", "Closed", "Withdrawn"];

export function CaseForm({
  id,
  clients,
  initial,
}: {
  id?: number;
  /** Omitted when editing: a case does not move between clients. */
  clients?: { id: number; name: string }[];
  initial?: Partial<CaseFields> & { clientId?: number };
}) {
  const router = useRouter();
  const save = useSaveCase(id);
  const [fields, setFields] = useState<CaseFields>({
    clientId: initial?.clientId,
    title: initial?.title ?? "",
    court: initial?.court ?? "",
    caseType: initial?.caseType ?? "",
    status: initial?.status ?? "Active",
    nextHearing: initial?.nextHearing ? String(initial.nextHearing).slice(0, 10) : "",
    notes: initial?.notes ?? "",
  });
  const [error, setError] = useState("");

  const set =
    (key: keyof CaseFields) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setFields((f) => ({ ...f, [key]: e.target.value }));

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (!id && !fields.clientId) {
      setError("Choose whose case this is.");
      return;
    }

    save.mutate(
      {
        ...fields,
        // An empty date field means "no date set", not the epoch.
        nextHearing: fields.nextHearing ? fields.nextHearing : null,
        // Editing must not send clientId: the API forbids it.
        ...(id ? { clientId: undefined } : { clientId: Number(fields.clientId) }),
      },
      {
        onSuccess: (created) => router.push(`/office/cases/${id ?? created.id}`),
        onError: (err) => setError(err instanceof Error ? err.message : "That did not save."),
      }
    );
  }

  const input =
    "w-full rounded-md border border-rule bg-ground px-3 py-2 text-sm text-ink focus:border-gold focus:outline-none";

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-card border border-rule bg-surface p-6" noValidate>
      {clients && (
        <div className="space-y-1.5">
          <label htmlFor="clientId" className="block text-sm font-medium text-ink">
            Whose case is it?
          </label>
          <select
            id="clientId"
            value={fields.clientId ?? ""}
            onChange={(e) => setFields((f) => ({ ...f, clientId: Number(e.target.value) }))}
            className={input}
            required
          >
            <option value="">Choose a client…</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <Field label="Title" value={fields.title} onChange={set("title")} required />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Court" value={fields.court} onChange={set("court")} />
        <Field label="Kind of matter" value={fields.caseType} onChange={set("caseType")} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="status" className="block text-sm font-medium text-ink">
            Status
          </label>
          <select id="status" value={fields.status} onChange={set("status")} className={input}>
            {STATUSES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
        <Field
          label="Next hearing"
          type="date"
          value={fields.nextHearing ?? ""}
          onChange={set("nextHearing")}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="notes" className="block text-sm font-medium text-ink">
          Chamber note
        </label>
        <textarea id="notes" rows={4} value={fields.notes} onChange={set("notes")} className={input} />
        <p className="text-xs text-ink-soft">
          Internal. This never appears in the client portal.
        </p>
      </div>

      {error && (
        <p role="alert" className="rounded-md bg-danger-wash px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={save.isPending}>
          {save.isPending ? "Saving…" : id ? "Save changes" : "Open the case"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

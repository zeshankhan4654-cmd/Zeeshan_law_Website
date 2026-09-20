"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { useSaveClient, type ClientFields } from "@/lib/use-office";

export function ClientForm({
  id,
  initial,
}: {
  id?: number;
  initial?: Partial<ClientFields>;
}) {
  const router = useRouter();
  const save = useSaveClient(id);
  const [fields, setFields] = useState<ClientFields>({
    name: initial?.name ?? "",
    phone: initial?.phone ?? "",
    email: initial?.email ?? "",
    address: initial?.address ?? "",
    notes: initial?.notes ?? "",
  });
  const [error, setError] = useState("");

  const set = (key: keyof ClientFields) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setFields((f) => ({ ...f, [key]: e.target.value }));

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    save.mutate(fields, {
      onSuccess: (created) => {
        router.push(id ? `/office/clients/${id}` : `/office/clients/${created.id}`);
      },
      onError: (err) => setError(err instanceof Error ? err.message : "That did not save."),
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-card border border-rule bg-surface p-6" noValidate>
      <Field label="Name" value={fields.name} onChange={set("name")} required />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Telephone" value={fields.phone} onChange={set("phone")} />
        <Field label="Email" type="email" value={fields.email} onChange={set("email")} />
      </div>
      <Field label="Address" value={fields.address} onChange={set("address")} />

      <div className="space-y-1.5">
        <label htmlFor="notes" className="block text-sm font-medium text-ink">
          Notes
        </label>
        <textarea
          id="notes"
          rows={4}
          value={fields.notes}
          onChange={set("notes")}
          placeholder="Anything the chamber should remember about this client."
          className="w-full rounded-md border border-rule bg-ground px-3 py-2 text-sm text-ink focus:border-gold focus:outline-none"
        />
        <p className="text-xs text-ink-soft">Internal. The client never sees this.</p>
      </div>

      {error && (
        <p role="alert" className="rounded-md bg-danger-wash px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={save.isPending}>
          {save.isPending ? "Saving…" : id ? "Save changes" : "Create the client"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

"use client";

import { Mail, MessageCircle, Phone, Plus, Send, Users } from "lucide-react";
import { useState } from "react";
import { DeleteRow, ledgerInput } from "@/components/office/Ledger";
import { Button } from "@/components/ui/Button";
import { formatDate } from "@/lib/portal-types";
import { useDeleteCommunication, useSaveCommunication } from "@/lib/use-office-diary";

export type Entry = {
  id: number;
  method: string;
  summary: string;
  commDate: string;
  followUpDue: string | null;
  client: { id: number; name: string } | null;
};

const METHODS = [
  { value: "call", label: "Telephone call", icon: Phone },
  { value: "whatsapp", label: "WhatsApp", icon: MessageCircle },
  { value: "email", label: "Email", icon: Mail },
  { value: "in_person", label: "In person", icon: Users },
  { value: "letter", label: "Letter", icon: Send },
] as const;

function methodOf(value: string) {
  return METHODS.find((m) => m.value === value) ?? METHODS[0];
}

/** Overdue follow-ups are the reason to open this screen at all. */
function isOverdue(due: string | null): boolean {
  if (!due) return false;
  const d = new Date(due);
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  return d <= today;
}

export function Diary({
  entries,
  clients,
  canEdit,
}: {
  entries: Entry[];
  clients: { id: number; name: string }[];
  canEdit: boolean;
}) {
  const save = useSaveCommunication();
  const remove = useDeleteCommunication();

  const [adding, setAdding] = useState(false);
  const [clientId, setClientId] = useState("");
  const [method, setMethod] = useState("call");
  const [summary, setSummary] = useState("");
  const [commDate, setCommDate] = useState(new Date().toISOString().slice(0, 10));
  const [followUpDue, setFollowUpDue] = useState("");
  const [error, setError] = useState("");

  return (
    <div className="space-y-4">
      {canEdit &&
        (adding ? (
          <div className="space-y-3 rounded-card border border-dashed border-rule p-5">
            <div className="grid gap-3 sm:grid-cols-4">
              <div className="space-y-1">
                <label htmlFor="comm-client" className="block text-xs font-medium text-ink-soft">
                  Client
                </label>
                <select
                  id="comm-client"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className={ledgerInput}
                >
                  <option value="">Not about a client</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label htmlFor="comm-method" className="block text-xs font-medium text-ink-soft">
                  How
                </label>
                <select
                  id="comm-method"
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                  className={ledgerInput}
                >
                  {METHODS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label htmlFor="comm-date" className="block text-xs font-medium text-ink-soft">
                  When
                </label>
                <input
                  id="comm-date"
                  type="date"
                  value={commDate}
                  onChange={(e) => setCommDate(e.target.value)}
                  className={ledgerInput}
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="comm-follow" className="block text-xs font-medium text-ink-soft">
                  Follow up by
                </label>
                <input
                  id="comm-follow"
                  type="date"
                  value={followUpDue}
                  onChange={(e) => setFollowUpDue(e.target.value)}
                  className={ledgerInput}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor="comm-summary" className="block text-xs font-medium text-ink-soft">
                What was said
              </label>
              <textarea
                id="comm-summary"
                rows={2}
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                className={ledgerInput}
              />
            </div>

            {error && <p className="text-xs text-danger">{error}</p>}

            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                disabled={save.isPending || summary.trim().length < 2}
                onClick={() => {
                  setError("");
                  save.mutate(
                    {
                      clientId: clientId ? Number(clientId) : null,
                      method,
                      summary,
                      commDate,
                      followUpDue: followUpDue || null,
                    },
                    {
                      onSuccess: () => {
                        setSummary("");
                        setFollowUpDue("");
                        setAdding(false);
                      },
                      onError: (err) =>
                        setError(err instanceof Error ? err.message : "That did not save."),
                    }
                  );
                }}
              >
                Log it
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setAdding(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button type="button" onClick={() => setAdding(true)}>
            <Plus className="size-4" /> Log a communication
          </Button>
        ))}

      {entries.length === 0 ? (
        <p className="rounded-card border border-rule bg-surface px-6 py-12 text-center text-sm text-ink-soft">
          Nothing logged yet.
        </p>
      ) : (
        <ul className="space-y-2">
          {entries.map((e) => {
            const m = methodOf(e.method);
            const overdue = isOverdue(e.followUpDue);
            return (
              <li
                key={e.id}
                className={`flex gap-4 rounded-card border p-4 ${
                  overdue ? "border-gold/50 bg-gold-wash/40" : "border-rule bg-surface"
                }`}
              >
                <m.icon className="mt-0.5 size-5 shrink-0 text-gold" strokeWidth={1.6} />
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="flex flex-wrap items-center gap-x-3 text-xs text-ink-soft">
                    <span className="font-semibold text-ink">{formatDate(e.commDate)}</span>
                    <span>{m.label}</span>
                    {e.client && <span>· {e.client.name}</span>}
                    {e.followUpDue && (
                      <span className={overdue ? "font-semibold text-gold" : ""}>
                        · follow up by {formatDate(e.followUpDue)}
                        {overdue ? " (due)" : ""}
                      </span>
                    )}
                  </p>
                  <p className="text-sm leading-6 whitespace-pre-wrap text-ink">{e.summary}</p>
                </div>
                {canEdit && (
                  <DeleteRow
                    onDelete={() => remove.mutate(e.id)}
                    busy={remove.isPending}
                    label="Remove this entry"
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

"use client";

import { Eye, EyeOff, Plus, Send, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import type { OfficeDocument, OfficeHearing } from "@/lib/office-data";
import { formatRupees } from "@/lib/portal-types";
import {
  useAddFee,
  useAddHearing,
  usePostUpdate,
  useRecordOutcome,
  useRemoveFee,
  useReplyToClient,
  useShareDocument,
  useUploadDocument,
} from "@/lib/use-office";

const input =
  "w-full rounded-md border border-rule bg-ground px-3 py-2 text-sm text-ink focus:border-gold focus:outline-none";

/** A one-line composer, used for an update and for a reply. */
export function Composer({
  caseId,
  kind,
}: {
  caseId: number;
  kind: "update" | "reply";
}) {
  const post = usePostUpdate(caseId);
  const reply = useReplyToClient(caseId);
  const action = kind === "update" ? post : reply;
  const [text, setText] = useState("");
  const [error, setError] = useState("");

  function send() {
    if (!text.trim()) return;
    setError("");
    action.mutate(text.trim(), {
      onSuccess: () => setText(""),
      onError: (err) => setError(err instanceof Error ? err.message : "That did not save."),
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex items-end gap-2">
        <textarea
          rows={2}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={
            kind === "update" ? "Post an update the client will see" : "Answer the client"
          }
          className={`${input} resize-y`}
        />
        <button
          type="button"
          onClick={send}
          disabled={action.isPending || !text.trim()}
          aria-label={kind === "update" ? "Post the update" : "Send the reply"}
          className="grid size-10 shrink-0 place-items-center rounded-md bg-ink text-white disabled:bg-rule disabled:text-ink-soft"
        >
          <Send className="size-4" />
        </button>
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}

export function HearingOutcome({ hearing }: { hearing: OfficeHearing }) {
  const record = useRecordOutcome(hearing.id);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(hearing.outcome);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs font-semibold text-gold hover:underline"
      >
        {hearing.outcome ? "Change the outcome" : "Record the outcome"}
      </button>
    );
  }

  return (
    <div className="flex items-end gap-2">
      <textarea
        rows={2}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="What happened?"
        className={`${input} resize-y`}
      />
      <Button
        type="button"
        size="sm"
        disabled={record.isPending}
        onClick={() => record.mutate(text, { onSuccess: () => setOpen(false) })}
      >
        Save
      </Button>
    </div>
  );
}

export function AddHearing({ caseId }: { caseId: number }) {
  const add = useAddHearing(caseId);
  const [date, setDate] = useState("");
  const [purpose, setPurpose] = useState("");
  const [error, setError] = useState("");

  return (
    <div className="space-y-2 rounded-card border border-dashed border-rule p-4">
      <div className="flex flex-wrap items-end gap-2">
        <div className="space-y-1">
          <label htmlFor="hearing-date" className="block text-xs font-medium text-ink-soft">
            Date
          </label>
          <input
            id="hearing-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={input}
          />
        </div>
        <div className="min-w-48 flex-1 space-y-1">
          <label htmlFor="hearing-purpose" className="block text-xs font-medium text-ink-soft">
            For what
          </label>
          <input
            id="hearing-purpose"
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            placeholder="Framing of issues"
            className={input}
          />
        </div>
        <Button
          type="button"
          size="sm"
          disabled={add.isPending || !date}
          onClick={() => {
            setError("");
            add.mutate(
              { hearingDate: date, purpose },
              {
                onSuccess: () => {
                  setDate("");
                  setPurpose("");
                },
                onError: (err) =>
                  setError(err instanceof Error ? err.message : "That did not save."),
              }
            );
          }}
        >
          <Plus className="size-4" /> Add
        </Button>
      </div>
      <p className="text-xs text-ink-soft">
        A future date also becomes the case&rsquo;s next hearing, and appears on the cause list.
      </p>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}

export function FeeEntry({
  caseId,
  entries,
}: {
  caseId: number;
  entries: { id: number; kind: string; amount: number; entryDate: string; note: string }[];
}) {
  const add = useAddFee(caseId);
  const remove = useRemoveFee();
  const [kind, setKind] = useState("agreed");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  return (
    <div className="space-y-3">
      {entries.length > 0 && (
        <ul className="divide-y divide-rule">
          {entries.map((f) => (
            <li key={f.id} className="flex items-center gap-3 py-2 text-sm">
              <span className="w-20 text-xs font-semibold text-gold uppercase">{f.kind}</span>
              <span className="w-32 font-medium text-ink">{formatRupees(f.amount)}</span>
              <span className="flex-1 text-ink-soft">{f.note}</span>
              <button
                type="button"
                onClick={() => remove.mutate(f.id)}
                disabled={remove.isPending}
                aria-label="Remove this entry"
                className="text-danger hover:opacity-70"
              >
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-end gap-2 rounded-card border border-dashed border-rule p-4">
        <div className="space-y-1">
          <label htmlFor="fee-kind" className="block text-xs font-medium text-ink-soft">
            Kind
          </label>
          <select id="fee-kind" value={kind} onChange={(e) => setKind(e.target.value)} className={input}>
            <option value="agreed">Agreed</option>
            <option value="received">Received</option>
          </select>
        </div>
        <div className="space-y-1">
          <label htmlFor="fee-amount" className="block text-xs font-medium text-ink-soft">
            Amount
          </label>
          <input
            id="fee-amount"
            type="number"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className={input}
          />
        </div>
        <div className="min-w-40 flex-1 space-y-1">
          <label htmlFor="fee-note" className="block text-xs font-medium text-ink-soft">
            Note
          </label>
          <input id="fee-note" value={note} onChange={(e) => setNote(e.target.value)} className={input} />
        </div>
        <Button
          type="button"
          size="sm"
          disabled={add.isPending || !amount}
          onClick={() => {
            setError("");
            add.mutate(
              { kind, amount: Number(amount), note },
              {
                onSuccess: () => {
                  setAmount("");
                  setNote("");
                },
                onError: (err) =>
                  setError(err instanceof Error ? err.message : "That did not save."),
              }
            );
          }}
        >
          <Plus className="size-4" /> Add
        </Button>
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}

export function DocumentRow({ document }: { document: OfficeDocument }) {
  const share = useShareDocument();
  const shared = document.clientVisible;

  return (
    <button
      type="button"
      onClick={() => share.mutate({ id: document.id, clientVisible: !shared })}
      disabled={share.isPending}
      className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition ${
        shared ? "bg-success-wash text-success" : "bg-rule/60 text-ink-soft hover:bg-gold-wash"
      }`}
    >
      {shared ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
      {shared ? "Shared with the client" : "Not shared"}
    </button>
  );
}

export function UploadDocument({ caseId }: { caseId: number }) {
  const upload = useUploadDocument(caseId);
  const fileRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [shareNow, setShareNow] = useState(false);
  const [error, setError] = useState("");

  return (
    <div className="space-y-2 rounded-card border border-dashed border-rule p-4">
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-44 flex-1 space-y-1">
          <label htmlFor="doc-title" className="block text-xs font-medium text-ink-soft">
            Title
          </label>
          <input
            id="doc-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Plaint as filed"
            className={input}
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="doc-file" className="block text-xs font-medium text-ink-soft">
            File
          </label>
          <input id="doc-file" ref={fileRef} type="file" className="text-sm text-ink-soft" />
        </div>
        <Button
          type="button"
          size="sm"
          disabled={upload.isPending}
          onClick={() => {
            setError("");
            const file = fileRef.current?.files?.[0];
            if (!file) {
              setError("Choose a file first.");
              return;
            }
            upload.mutate(
              { file, title: title.trim() || file.name, clientVisible: shareNow },
              {
                onSuccess: () => {
                  setTitle("");
                  if (fileRef.current) fileRef.current.value = "";
                },
                onError: (err) =>
                  setError(err instanceof Error ? err.message : "That did not upload."),
              }
            );
          }}
        >
          <Upload className="size-4" />
          {upload.isPending ? "Uploading…" : "Upload"}
        </Button>
      </div>

      <label className="flex items-center gap-2 text-xs text-ink-soft">
        <input
          type="checkbox"
          checked={shareNow}
          onChange={(e) => setShareNow(e.target.checked)}
          className="size-3.5 accent-[var(--color-gold)]"
        />
        Share it with the client straight away
      </label>
      <p className="text-xs text-ink-soft">
        Documents are private unless deliberately shared.
      </p>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}

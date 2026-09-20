"use client";

import { AlertTriangle, BookOpen, ExternalLink, PlayCircle, Search } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { useModerate, useSubmissions, useWithdrawShared, type Submission } from "@/lib/use-platform";

const input =
  "w-full rounded-md border border-rule bg-surface px-3 py-2 text-sm text-ink focus:border-gold focus:outline-none";

const ICON = { judgment: BookOpen, research: Search, media: PlayCircle } as const;
const NOUN = { judgment: "Judgment", research: "Research", media: "Recording" } as const;

/**
 * What chambers have offered to the shared library.
 *
 * The one screen in the console that shows another chamber's content, and
 * only content that chamber asked to put in front of every advocate on the
 * platform. Reading it is the point of being asked.
 */
export function Queue() {
  const [state, setState] = useState<"pending" | "approved" | "rejected">("pending");
  const submissions = useSubmissions(state);
  const items = submissions.data?.items ?? [];

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div className="space-y-1">
          <h2 className="font-display text-xl text-ink">The shared library</h2>
          <p className="max-w-2xl text-sm leading-6 text-ink-soft">
            What chambers have offered to every other advocate. An entry you approve is a
            citation somebody may carry into court on the strength of its being here — so
            read each one against the report before you do.
          </p>
        </div>

        <div className="flex gap-1 rounded-md border border-rule p-1">
          {(["pending", "approved", "rejected"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setState(s)}
              className={`rounded px-3 py-1 text-sm ${
                state === s ? "bg-gold text-white" : "text-ink-soft hover:bg-gold-wash"
              }`}
            >
              {s === "pending" ? "Waiting" : s === "approved" ? "In the library" : "Sent back"}
            </button>
          ))}
        </div>
      </div>

      {submissions.isPending && <p className="text-sm text-ink-soft">Loading…</p>}

      {items.length === 0 && !submissions.isPending && (
        <p className="rounded-card border border-dashed border-rule p-8 text-center text-sm text-ink-soft">
          {state === "pending"
            ? "Nothing is waiting to be read."
            : state === "approved"
              ? "Nothing is in the shared library yet."
              : "Nothing has been sent back."}
        </p>
      )}

      <ul className="space-y-3">
        {items.map((entry) => (
          <SubmissionRow key={`${entry.kind}-${entry.id}`} entry={entry} state={state} />
        ))}
      </ul>
    </section>
  );
}

function SubmissionRow({ entry, state }: { entry: Submission; state: string }) {
  const moderate = useModerate(entry.kind, entry.id);
  const withdraw = useWithdrawShared(entry.kind, entry.id);
  const [note, setNote] = useState("");
  const [rejecting, setRejecting] = useState(false);
  const [error, setError] = useState("");

  const Icon = ICON[entry.kind];
  const busy = moderate.isPending || withdraw.isPending;
  const fail = (err: unknown) =>
    setError(err instanceof Error ? err.message : "That did not save.");

  return (
    <li className="space-y-3 rounded-card border border-rule bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-64 flex-1 space-y-1">
          <p className="flex items-center gap-2 text-xs text-ink-soft">
            <Icon className="size-4 text-gold" strokeWidth={1.6} />
            {NOUN[entry.kind]} · offered by{" "}
            <span className="font-medium text-ink">{entry.chamber.name}</span>
            {!entry.chamber.verified && (
              <span className="rounded-full bg-danger-wash px-2 py-0.5 font-semibold text-danger">
                not verified
              </span>
            )}
          </p>
          <h3 className="font-display text-lg text-ink">{entry.title}</h3>
          {entry.citation && (
            <p className="font-mono text-sm text-ink">
              {entry.citation}
              {entry.court && ` · ${entry.court}`}
            </p>
          )}
        </div>

        {entry.sourceUrl && (
          <a
            href={entry.sourceUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="flex items-center gap-1 text-xs font-semibold text-gold hover:underline"
          >
            <ExternalLink className="size-3.5" /> The source
          </a>
        )}
      </div>

      {entry.principle && <p className="text-sm leading-6 text-ink">{entry.principle}</p>}
      {entry.summary && <p className="text-sm leading-6 text-ink-soft">{entry.summary}</p>}

      {state === "pending" && entry.kind === "judgment" && (
        <p className="flex items-start gap-2 rounded-md bg-gold-wash px-3 py-2 text-xs leading-5 text-ink">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-gold" />
          Check the citation against the report before approving. An advocate who finds this
          here has no other way to know whether it is right.
        </p>
      )}

      {!entry.chamber.verified && state === "pending" && (
        <p className="rounded-md bg-danger-wash px-3 py-2 text-xs leading-5 text-danger">
          This chamber is not verified, so its work cannot be approved. Verify the chamber
          first if it really is an advocate&rsquo;s.
        </p>
      )}

      {entry.shareNote && state !== "pending" && (
        <p className="text-xs text-ink-soft">Note: {entry.shareNote}</p>
      )}

      {error && <p className="rounded-md bg-danger-wash px-3 py-2 text-sm text-danger">{error}</p>}

      {rejecting ? (
        <div className="space-y-2 rounded-md border border-dashed border-rule p-4">
          <label htmlFor={`note-${entry.kind}-${entry.id}`} className="block text-sm font-medium text-ink">
            Why is it being sent back?
          </label>
          <p className="text-xs text-ink-soft">
            The chamber is shown this. One that is told only &ldquo;no&rdquo; cannot put it
            right, and will either give up or send the same thing again.
          </p>
          <input
            id={`note-${entry.kind}-${entry.id}`}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className={input}
          />
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="destructive"
              disabled={busy || note.trim().length < 5}
              onClick={() => {
                setError("");
                const done = { onSuccess: () => setRejecting(false), onError: fail };
                // Taking an approved entry out and turning a waiting one
                // down are different endpoints. Both return it to its
                // chamber with the reason; neither deletes anything.
                if (state === "approved") withdraw.mutate({ note }, done);
                else moderate.mutate({ approve: false, note }, done);
              }}
            >
              {state === "approved"
                ? "Take it out of the library"
                : "Send it back to the chamber"}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setRejecting(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {state === "pending" && (
            <Button
              type="button"
              size="sm"
              disabled={busy || !entry.chamber.verified}
              onClick={() => {
                setError("");
                moderate.mutate({ approve: true, note: "" }, { onError: fail });
              }}
            >
              {moderate.isPending ? "Approving…" : "Approve into the library"}
            </Button>
          )}
          {(state === "pending" || state === "approved") && (
            <Button
              type="button"
              size="sm"
              variant="destructive"
              disabled={busy}
              onClick={() => setRejecting(true)}
            >
              {state === "approved" ? "Take it out" : "Send it back"}
            </Button>
          )}
        </div>
      )}
    </li>
  );
}

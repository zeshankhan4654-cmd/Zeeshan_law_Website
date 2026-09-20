"use client";

import { AlertTriangle, Check, KeyRound, Copy } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { useSetPortalAccess } from "@/lib/use-office";

/**
 * Switching a client's portal on, and issuing the password.
 *
 * The password appears once, here, and is never retrievable again — only a
 * hash is stored. That is deliberate, and the screen says so, because a
 * clerk who expects to look it up later will otherwise write it somewhere
 * worse.
 */
export function PortalAccess({
  clientId,
  enabled,
  username,
  showFees,
  mustChangePassword,
}: {
  clientId: number;
  enabled: boolean;
  username: string | null;
  showFees: boolean;
  mustChangePassword: boolean;
}) {
  const set = useSetPortalAccess(clientId);
  const [issued, setIssued] = useState<{ username: string; password: string } | null>(null);
  const [fees, setFees] = useState(showFees);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  function run(body: { enabled: boolean; showFees: boolean; resetPassword?: boolean }) {
    setError("");
    setIssued(null);
    set.mutate(body, {
      onSuccess: (result) => {
        if (result.username && result.password) {
          setIssued({ username: result.username, password: result.password });
        }
      },
      onError: (err) => setError(err instanceof Error ? err.message : "That did not save."),
    });
  }

  return (
    <section className="space-y-4 rounded-card border border-rule bg-surface p-6">
      <div className="flex items-center gap-2">
        <KeyRound className="size-5 text-gold" strokeWidth={1.6} />
        <h2 className="font-display text-lg text-ink">Portal access</h2>
      </div>

      <p className="text-sm leading-6 text-ink-soft">
        {enabled
          ? `Switched on${username ? ` as ${username}` : ""}. The client can see their own matters, hearings and shared documents.`
          : "Switched off. The client cannot sign in."}
        {enabled && mustChangePassword && " They have not yet chosen their own password."}
      </p>

      <label className="flex items-center gap-2.5 text-sm text-ink">
        <input
          type="checkbox"
          checked={fees}
          onChange={(e) => setFees(e.target.checked)}
          className="size-4 accent-[var(--color-gold)]"
        />
        Let this client see the fees on their matters
      </label>

      {issued && (
        <div className="space-y-3 rounded-card border border-gold/40 bg-gold-wash p-4">
          <p className="flex items-start gap-2 text-sm font-semibold text-ink">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-gold" />
            Give these to the client now. The password cannot be shown again.
          </p>
          <dl className="space-y-1 font-mono text-sm text-ink">
            <div className="flex gap-3">
              <dt className="w-20 text-ink-soft">username</dt>
              <dd>{issued.username}</dd>
            </div>
            <div className="flex gap-3">
              <dt className="w-20 text-ink-soft">password</dt>
              <dd>{issued.password}</dd>
            </div>
          </dl>
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard
                ?.writeText(`Username: ${issued.username}\nPassword: ${issued.password}`)
                .then(() => setCopied(true))
                .catch(() => undefined);
            }}
            className="flex items-center gap-1.5 text-xs font-semibold text-gold hover:underline"
          >
            {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
            {copied ? "Copied" : "Copy both"}
          </button>
          <p className="text-xs leading-5 text-ink-soft">
            Only a scrambled form is stored, so nobody in the office — or
            anyone who takes a copy of the database — can read it back. The
            client is made to choose their own on first sign-in.
          </p>
        </div>
      )}

      {error && <p className="rounded-md bg-danger-wash px-3 py-2 text-sm text-danger">{error}</p>}

      <div className="flex flex-wrap gap-3">
        {enabled ? (
          <>
            <Button
              type="button"
              variant="outline"
              disabled={set.isPending}
              onClick={() => run({ enabled: true, showFees: fees, resetPassword: true })}
            >
              Issue a new password
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={set.isPending}
              onClick={() => run({ enabled: false, showFees: fees })}
            >
              Switch access off
            </Button>
          </>
        ) : (
          <Button
            type="button"
            disabled={set.isPending}
            onClick={() => run({ enabled: true, showFees: fees })}
          >
            {set.isPending ? "Working…" : "Switch access on"}
          </Button>
        )}
        {enabled && (
          <Button
            type="button"
            variant="ghost"
            disabled={set.isPending || fees === showFees}
            onClick={() => run({ enabled: true, showFees: fees })}
          >
            Save the fees setting
          </Button>
        )}
      </div>
    </section>
  );
}

"use client";

import { Building2, CheckCircle2, Library, PauseCircle, Search, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { ApiError } from "@/lib/api";
import { PLATFORM_NAME } from "@/lib/platform-brand";
import {
  useOverview,
  useRestoreChamber,
  useSetVerified,
  useSuspendChamber,
  type ChamberSummary,
  type PlatformAction,
  type PlatformTotals,
} from "@/lib/use-platform";
import { Queue } from "./Queue";

const input =
  "rounded-md border border-rule bg-surface px-3 py-2 text-sm text-ink focus:border-gold focus:outline-none";

function when(iso: string | null): string {
  if (!iso) return "never";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function Console() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [verified, setVerified] = useState("");
  const overview = useOverview({ q, status, verified });

  if (overview.isError) {
    const err = overview.error;
    // The API answers a non-platform-admin with 404, so the console's
    // existence is not confirmed to anybody poking at the address.
    const notYours = err instanceof ApiError && (err.status === 404 || err.status === 403);
    return (
      <main className="mx-auto max-w-2xl px-6 py-24 text-center">
        <h1 className="font-display text-2xl text-ink">
          {notYours ? "Nothing here" : "That did not load"}
        </h1>
        <p className="mt-2 text-sm text-ink-soft">
          {notYours
            ? "This address is not part of your office."
            : err instanceof Error
              ? err.message
              : "Try again."}
        </p>
        <Link href="/office" className="mt-6 inline-block text-sm font-semibold text-gold hover:underline">
          Back to the office
        </Link>
      </main>
    );
  }

  const data = overview.data;

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-6 py-10">
      <header className="space-y-1">
        <p className="text-xs font-semibold tracking-[0.14em] text-gold uppercase">
          {PLATFORM_NAME}
        </p>
        <h1 className="font-display text-2xl text-ink">Chambers</h1>
        <p className="max-w-2xl text-sm leading-6 text-ink-soft">
          Every chamber on {PLATFORM_NAME}, how large it is, and whether it is active. What
          is inside a chamber — its clients, its files, its messages — is not shown here and
          is not reachable from here.
        </p>
      </header>

      {data && <Totals totals={data.totals} />}

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-56">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-soft" />
          <input
            aria-label="Search chambers"
            placeholder="Chamber name, address or enrolment number"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className={`${input} w-full pl-9`}
          />
        </div>
        <select aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value)} className={input}>
          <option value="">Any status</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>
        <select aria-label="Verified" value={verified} onChange={(e) => setVerified(e.target.value)} className={input}>
          <option value="">Verified or not</option>
          <option value="yes">Verified</option>
          <option value="no">Not verified</option>
        </select>
      </div>

      {overview.isPending && <p className="text-sm text-ink-soft">Loading…</p>}

      {data && (
        <>
          <ul className="space-y-3">
            {data.items.map((chamber) => (
              <ChamberRow key={chamber.id} chamber={chamber} />
            ))}
          </ul>
          {data.items.length === 0 && (
            <p className="rounded-card border border-dashed border-rule p-8 text-center text-sm text-ink-soft">
              No chamber matches that.
            </p>
          )}
          <Queue />
          <Trail actions={data.actions} />
        </>
      )}
    </main>
  );
}

function Totals({ totals }: { totals: PlatformTotals }) {
  const tiles = [
    { icon: Building2, label: "Chambers", value: totals.chambers },
    { icon: ShieldCheck, label: "Verified", value: totals.verified },
    { icon: PauseCircle, label: "Suspended", value: totals.suspended },
    { icon: Library, label: "Waiting to be read", value: totals.pending },
  ];

  return (
    <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {tiles.map((t) => (
        <div key={t.label} className="rounded-card border border-rule bg-surface p-4">
          <dt className="flex items-center gap-2 text-xs text-ink-soft">
            <t.icon className="size-4 text-gold" strokeWidth={1.6} />
            {t.label}
          </dt>
          <dd className="mt-1 font-display text-2xl text-ink">{t.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function ChamberRow({ chamber }: { chamber: ChamberSummary }) {
  const setVerified = useSetVerified(chamber.id);
  const suspend = useSuspendChamber(chamber.id);
  const restore = useRestoreChamber(chamber.id);

  const [suspending, setSuspending] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  const busy = setVerified.isPending || suspend.isPending || restore.isPending;
  const fail = (err: unknown) =>
    setError(err instanceof Error ? err.message : "That did not save.");

  return (
    <li className="space-y-3 rounded-card border border-rule bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-lg text-ink">{chamber.name}</h2>
            {chamber.verified ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-gold-wash px-2 py-0.5 text-xs font-semibold text-gold">
                <CheckCircle2 className="size-3" /> Verified
              </span>
            ) : (
              <span className="rounded-full bg-ground px-2 py-0.5 text-xs text-ink-soft">
                Not verified
              </span>
            )}
            {chamber.status === "suspended" && (
              <span className="rounded-full bg-danger-wash px-2 py-0.5 text-xs font-semibold text-danger">
                Suspended
              </span>
            )}
          </div>
          <p className="font-mono text-xs text-ink-soft">
            /{chamber.slug}
            {chamber.enrolmentNo && ` · enrolment ${chamber.enrolmentNo}`}
          </p>
        </div>

        <dl className="flex gap-6 text-sm">
          {[
            ["Staff", chamber.counts.staff],
            ["Clients", chamber.counts.clients],
            ["Cases", chamber.counts.cases],
          ].map(([label, value]) => (
            <div key={label as string}>
              <dt className="text-xs text-ink-soft">{label}</dt>
              <dd className="font-display text-lg text-ink">{value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <p className="text-xs text-ink-soft">
        Registered {when(chamber.createdAt)} · last case activity {when(chamber.lastActivityAt)}
      </p>

      {chamber.status === "suspended" && chamber.suspendedReason && (
        <p className="rounded-md bg-danger-wash px-3 py-2 text-sm text-danger">
          Shown to them at sign-in: {chamber.suspendedReason}
        </p>
      )}

      {error && <p className="rounded-md bg-danger-wash px-3 py-2 text-sm text-danger">{error}</p>}

      {suspending ? (
        <div className="space-y-2 rounded-md border border-dashed border-rule p-4">
          <label htmlFor={`reason-${chamber.id}`} className="block text-sm font-medium text-ink">
            Why is this chamber being suspended?
          </label>
          <p className="text-xs leading-5 text-ink-soft">
            Everybody in it stops being able to sign in — the advocate, their colleagues and
            their clients — and this is the message they are shown. Their work is untouched
            and comes back whole when you restore it.
          </p>
          <input
            id={`reason-${chamber.id}`}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className={`${input} w-full`}
          />
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="destructive"
              disabled={busy || reason.trim().length < 5}
              onClick={() => {
                setError("");
                suspend.mutate(
                  { reason },
                  {
                    onSuccess: () => {
                      setSuspending(false);
                      setReason("");
                    },
                    onError: fail,
                  }
                );
              }}
            >
              {suspend.isPending ? "Suspending…" : "Suspend this chamber"}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setSuspending(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => {
              setError("");
              setVerified.mutate(
                { verified: !chamber.verified, note: "" },
                { onError: fail }
              );
            }}
          >
            {chamber.verified ? "Withdraw verification" : "Mark verified"}
          </Button>

          {chamber.status === "suspended" ? (
            <Button
              type="button"
              size="sm"
              disabled={busy}
              onClick={() => {
                setError("");
                restore.mutate(undefined, { onError: fail });
              }}
            >
              {restore.isPending ? "Restoring…" : "Restore"}
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              variant="destructive"
              disabled={busy}
              onClick={() => setSuspending(true)}
            >
              Suspend
            </Button>
          )}
        </div>
      )}
    </li>
  );
}

/**
 * What has been done, and by whom.
 *
 * The counterpart of holding this much power over other people's practices:
 * none of it happens quietly.
 */
function Trail({ actions }: { actions: PlatformAction[] }) {
  if (actions.length === 0) return null;

  const verb: Record<PlatformAction["action"], string> = {
    verify: "marked verified",
    unverify: "withdrew verification from",
    suspend: "suspended",
    restore: "restored",
  };

  return (
    <section className="space-y-3">
      <h2 className="font-display text-lg text-ink">What has been done</h2>
      <ul className="divide-y divide-rule rounded-card border border-rule bg-surface">
        {actions.map((a) => (
          <li key={a.id} className="flex flex-wrap gap-x-2 px-4 py-2.5 text-sm text-ink-soft">
            <span className="text-ink">{a.actorEmail}</span>
            <span>{verb[a.action]}</span>
            <span className="font-mono text-xs">/{a.firmSlug}</span>
            <span>· {when(a.createdAt)}</span>
            {a.reason && <span className="w-full text-xs">“{a.reason}”</span>}
          </li>
        ))}
      </ul>
    </section>
  );
}

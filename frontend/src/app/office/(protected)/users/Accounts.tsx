"use client";

import { AlertTriangle, KeyRound, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import {
  useCreateUser,
  useDeleteUser,
  useEditUser,
  useResetUserPassword,
} from "@/lib/use-office-content";

export type Account = {
  id: number;
  username: string;
  fullName: string;
  role: string;
  mustChangePassword: boolean;
};

const input =
  "w-full rounded-md border border-rule bg-ground px-3 py-2 text-sm text-ink focus:border-gold focus:outline-none";

/** A password, shown once. The same treatment as a client's. */
function IssuedPassword({ username, password }: { username: string; password: string }) {
  return (
    <div className="space-y-2 rounded-card border border-gold/40 bg-gold-wash p-4">
      <p className="flex items-start gap-2 text-sm font-semibold text-ink">
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-gold" />
        Give these to them now. The password cannot be shown again.
      </p>
      <dl className="space-y-1 font-mono text-sm text-ink">
        <div className="flex gap-3">
          <dt className="w-20 text-ink-soft">username</dt>
          <dd>{username}</dd>
        </div>
        <div className="flex gap-3">
          <dt className="w-20 text-ink-soft">password</dt>
          <dd>{password}</dd>
        </div>
      </dl>
      <p className="text-xs leading-5 text-ink-soft">
        Only a scrambled form is stored. They must choose their own on first sign-in.
      </p>
    </div>
  );
}

function Row({ account, roles }: { account: Account; roles: { roleKey: string; label: string }[] }) {
  const edit = useEditUser(account.id);
  const reset = useResetUserPassword(account.id);
  const remove = useDeleteUser(account.id);

  const [role, setRole] = useState(account.role);
  const [issued, setIssued] = useState<string | null>(null);
  const [error, setError] = useState("");

  return (
    <li className="space-y-3 rounded-card border border-rule bg-surface p-5">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="min-w-40 flex-1">
          <span className="block font-medium text-ink">{account.fullName}</span>
          <span className="block text-xs text-ink-soft">{account.username}</span>
        </span>

        <select
          aria-label={`Role for ${account.fullName}`}
          value={role}
          onChange={(e) => {
            const next = e.target.value;
            setRole(next);
            setError("");
            edit.mutate(
              { fullName: account.fullName, role: next },
              {
                onError: (err) => {
                  setRole(account.role);
                  setError(err instanceof Error ? err.message : "That did not save.");
                },
              }
            );
          }}
          className={`${input} w-44`}
        >
          {roles.map((r) => (
            <option key={r.roleKey} value={r.roleKey}>
              {r.label}
            </option>
          ))}
        </select>

        {account.mustChangePassword && (
          <span className="rounded-full bg-gold-wash px-2.5 py-0.5 text-xs font-semibold text-gold">
            password not yet chosen
          </span>
        )}

        <button
          type="button"
          onClick={() => {
            setError("");
            reset.mutate(undefined, {
              onSuccess: (r) => setIssued(r.password),
              onError: (err) => setError(err instanceof Error ? err.message : "That did not work."),
            });
          }}
          disabled={reset.isPending}
          className="flex items-center gap-1.5 text-xs font-semibold text-gold hover:underline"
        >
          <KeyRound className="size-3.5" /> New password
        </button>

        <button
          type="button"
          onClick={() => {
            setError("");
            remove.mutate(undefined, {
              onError: (err) => setError(err instanceof Error ? err.message : "That did not work."),
            });
          }}
          disabled={remove.isPending}
          aria-label={`Remove ${account.fullName}`}
          className="text-danger hover:opacity-70"
        >
          <Trash2 className="size-4" />
        </button>
      </div>

      {issued && <IssuedPassword username={account.username} password={issued} />}
      {error && <p className="text-sm text-danger">{error}</p>}
    </li>
  );
}

export function Accounts({
  accounts,
  roles,
}: {
  accounts: Account[];
  roles: { roleKey: string; label: string }[];
}) {
  const create = useCreateUser();
  const [adding, setAdding] = useState(false);
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  /**
   * Deliberately unset.
   *
   * Defaulting to the first role in the list made the Principal the
   * default, so a clerk clicking briskly through this form would create an
   * administrator without ever choosing to. Nothing here is a safe default
   * — sortOrder is presentation, not a ranking of privilege — so the
   * choice has to be made.
   */
  const [role, setRole] = useState("");
  const [issued, setIssued] = useState<{ username: string; password: string } | null>(null);
  const [error, setError] = useState("");

  return (
    <div className="space-y-4">
      {adding ? (
        <div className="space-y-3 rounded-card border border-dashed border-rule p-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <label htmlFor="new-name" className="block text-sm font-medium text-ink">
                Name
              </label>
              <input
                id="new-name"
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                  // A sensible default the clerk can overwrite.
                  const parts = e.target.value.toLowerCase().replace(/[^a-z\s]/g, " ").split(/\s+/).filter(Boolean);
                  setUsername(parts.length > 1 ? `${parts[0]}.${parts[parts.length - 1]}` : (parts[0] ?? ""));
                }}
                className={input}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="new-username" className="block text-sm font-medium text-ink">
                Username
              </label>
              <input id="new-username" value={username} onChange={(e) => setUsername(e.target.value)} className={input} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="new-role" className="block text-sm font-medium text-ink">
                Role
              </label>
              <select id="new-role" value={role} onChange={(e) => setRole(e.target.value)} className={input}>
                <option value="">Choose a role…</option>
                {roles.map((r) => (
                  <option key={r.roleKey} value={r.roleKey}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}

          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              disabled={
                create.isPending ||
                fullName.trim().length < 2 ||
                username.trim().length < 3 ||
                role === ""
              }
              onClick={() => {
                setError("");
                create.mutate(
                  { fullName, username, role },
                  {
                    onSuccess: (r) => {
                      setIssued({ username: r.username, password: r.password });
                      setAdding(false);
                      setFullName("");
                      setUsername("");
                      setRole("");
                    },
                    onError: (err) =>
                      setError(err instanceof Error ? err.message : "That did not save."),
                  }
                );
              }}
            >
              {create.isPending ? "Creating…" : "Create the account"}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setAdding(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button type="button" onClick={() => setAdding(true)}>
          <Plus className="size-4" /> Add an account
        </Button>
      )}

      {issued && <IssuedPassword username={issued.username} password={issued.password} />}

      <ul className="space-y-2">
        {accounts.map((a) => (
          <Row key={a.id} account={a} roles={roles} />
        ))}
      </ul>
    </div>
  );
}

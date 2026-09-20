"use client";

import { Lock, Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { useCreateRole, useSaveRoleCaps } from "@/lib/use-office-content";

export type Role = {
  roleKey: string;
  label: string;
  description: string;
  isSystem: boolean;
  isRoot: boolean;
  caps: string[];
  userCount: number;
};

const input =
  "w-full rounded-md border border-rule bg-ground px-3 py-2 text-sm text-ink focus:border-gold focus:outline-none";

function RoleCard({ role, allCaps }: { role: Role; allCaps: Record<string, string> }) {
  const save = useSaveRoleCaps(role.roleKey);
  const [caps, setCaps] = useState<string[]>(role.caps);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const dirty =
    caps.length !== role.caps.length || caps.some((c) => !role.caps.includes(c));

  return (
    <section className="space-y-4 rounded-card border border-rule bg-surface p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg text-ink">{role.label}</h2>
          <p className="text-sm text-ink-soft">
            {role.description || role.roleKey} · {role.userCount} account
            {role.userCount === 1 ? "" : "s"}
          </p>
        </div>
        {role.isRoot && (
          <span className="flex items-center gap-1.5 rounded-full bg-gold-wash px-3 py-1 text-xs font-semibold text-gold">
            <Lock className="size-3.5" /> holds everything
          </span>
        )}
      </div>

      {role.isRoot ? (
        <p className="text-sm leading-6 text-ink-soft">
          The Principal always holds every capability, including any added
          later. That is fixed in the application, not in this table, so
          there is no way to lock the one account that grants access out of
          granting it.
        </p>
      ) : (
        <>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(allCaps).map(([cap, label]) => (
              <label key={cap} className="flex items-start gap-2 text-sm text-ink">
                <input
                  type="checkbox"
                  checked={caps.includes(cap)}
                  onChange={(e) =>
                    setCaps((current) =>
                      e.target.checked ? [...current, cap] : current.filter((c) => c !== cap)
                    )
                  }
                  className="mt-0.5 size-4 accent-[var(--color-gold)]"
                />
                <span>
                  {label}
                  <span className="block text-xs text-ink-soft">{cap}</span>
                </span>
              </label>
            ))}
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}
          {saved && !dirty && <p className="text-sm text-success">Saved.</p>}

          <Button
            type="button"
            size="sm"
            disabled={save.isPending || !dirty}
            onClick={() => {
              setError("");
              setSaved(false);
              save.mutate(caps, {
                onSuccess: () => setSaved(true),
                onError: (err) =>
                  setError(err instanceof Error ? err.message : "That did not save."),
              });
            }}
          >
            {save.isPending ? "Saving…" : "Save what this role may do"}
          </Button>
        </>
      )}
    </section>
  );
}

export function RoleEditor({
  roles,
  allCaps,
}: {
  roles: Role[];
  allCaps: Record<string, string>;
}) {
  const create = useCreateRole();
  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState("");
  const [roleKey, setRoleKey] = useState("");
  const [error, setError] = useState("");

  return (
    <div className="space-y-4">
      {adding ? (
        <div className="space-y-3 rounded-card border border-dashed border-rule p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="role-label" className="block text-sm font-medium text-ink">
                What it is called
              </label>
              <input
                id="role-label"
                value={label}
                onChange={(e) => {
                  setLabel(e.target.value);
                  setRoleKey(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""));
                }}
                placeholder="Junior Associate"
                className={input}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="role-key" className="block text-sm font-medium text-ink">
                Key
              </label>
              <input id="role-key" value={roleKey} onChange={(e) => setRoleKey(e.target.value)} className={input} />
              <p className="text-xs text-ink-soft">Used in the database. It cannot be changed later.</p>
            </div>
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}

          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              disabled={create.isPending || label.trim().length < 2 || roleKey.length < 2}
              onClick={() => {
                setError("");
                create.mutate(
                  { roleKey, label, description: "" },
                  {
                    onSuccess: () => {
                      setAdding(false);
                      setLabel("");
                      setRoleKey("");
                    },
                    onError: (err) =>
                      setError(err instanceof Error ? err.message : "That did not save."),
                  }
                );
              }}
            >
              Create the role
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setAdding(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button type="button" onClick={() => setAdding(true)}>
          <Plus className="size-4" /> Add a role
        </Button>
      )}

      {roles.map((r) => (
        <RoleCard key={r.roleKey} role={r} allCaps={allCaps} />
      ))}
    </div>
  );
}

"use client";

import { Check } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { useSaveSettings } from "@/lib/use-office-content";

type Group = { heading: string; note?: string; keys: { key: string; label: string; hint?: string }[] };

/**
 * Site Settings.
 *
 * Grouped as the chamber thinks about them rather than as they are stored,
 * and every field says what it does to the website — because someone
 * filling this in for the first time is deciding what a stranger in
 * difficulty will see.
 */
const GROUPS: Group[] = [
  {
    heading: "The chamber",
    keys: [
      { key: "firm.name", label: "Name" },
      { key: "firm.tagline", label: "Tagline", hint: "Shown under the name in the footer and on the hero." },
      { key: "firm.address", label: "Address", hint: "Also used for the Directions link on the contact page." },
      { key: "firm.hours", label: "Opening hours" },
    ],
  },
  {
    heading: "How people reach you",
    note: "Left empty, each of these is simply absent from the site — no placeholder is shown. A wrong number is worse than none.",
    keys: [
      { key: "contact.phone", label: "Telephone" },
      { key: "contact.phone2", label: "Second telephone" },
      { key: "contact.email", label: "Email" },
      { key: "contact.whatsapp", label: "WhatsApp number", hint: "International form, e.g. +92 300 1234567. This drives the floating button." },
      { key: "contact.whatsappMessage", label: "WhatsApp opening line", hint: "Filled in for the sender when they tap the button." },
    ],
  },
  {
    heading: "The map",
    keys: [
      { key: "contact.mapUrl", label: "Directions link", hint: "A Google Maps link. Left empty, directions are worked out from the address." },
      { key: "contact.mapEmbed", label: "Embedded map", hint: "The src of a Google Maps embed. Left empty, no map is shown." },
    ],
  },
  {
    heading: "Accounts",
    note: "Only the ones filled in appear, in the footer and on the contact page.",
    keys: [
      { key: "social.facebook", label: "Facebook" },
      { key: "social.linkedin", label: "LinkedIn" },
      { key: "social.youtube", label: "YouTube" },
      { key: "social.instagram", label: "Instagram" },
      { key: "social.x", label: "X" },
    ],
  },
];

export function SettingsForm({ settings }: { settings: Record<string, string> }) {
  const save = useSaveSettings();
  const [values, setValues] = useState<Record<string, string>>(settings);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaved(false);
    save.mutate(values, {
      onSuccess: () => setSaved(true),
      onError: (err) => setError(err instanceof Error ? err.message : "That did not save."),
    });
  }

  const input =
    "w-full rounded-md border border-rule bg-ground px-3 py-2 text-sm text-ink focus:border-gold focus:outline-none";

  return (
    <form onSubmit={submit} className="space-y-6">
      {GROUPS.map((group) => (
        <section key={group.heading} className="space-y-4 rounded-card border border-rule bg-surface p-6">
          <div className="space-y-1">
            <h2 className="font-display text-lg text-ink">{group.heading}</h2>
            {group.note && <p className="text-sm leading-6 text-ink-soft">{group.note}</p>}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {group.keys.map(({ key, label, hint }) => (
              <div key={key} className="space-y-1.5">
                <label htmlFor={key} className="block text-sm font-medium text-ink">
                  {label}
                </label>
                <input
                  id={key}
                  value={values[key] ?? ""}
                  onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))}
                  className={input}
                />
                {hint && <p className="text-xs leading-5 text-ink-soft">{hint}</p>}
              </div>
            ))}
          </div>
        </section>
      ))}

      {error && (
        <p role="alert" className="rounded-md bg-danger-wash px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}
      {saved && (
        <p className="flex items-center gap-2 rounded-md bg-success-wash px-3 py-2 text-sm text-success">
          <Check className="size-4" /> Saved. The website shows this within five minutes.
        </p>
      )}

      <Button type="submit" disabled={save.isPending}>
        {save.isPending ? "Saving…" : "Save the settings"}
      </Button>
    </form>
  );
}

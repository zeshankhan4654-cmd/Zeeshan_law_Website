"use client";

import { CheckCircle2, Send } from "lucide-react";
import { useState } from "react";
import { apiFetch } from "@/lib/api";
import { buttonClasses } from "@/components/ui/Button";

type Field = "name" | "phone" | "email" | "subject" | "message";

const EMPTY: Record<Field | "website", string> = {
  name: "",
  phone: "",
  email: "",
  subject: "",
  message: "",
  website: "",
};

/**
 * The enquiry form.
 *
 * The server validates everything again — Joi is the authority, and these
 * checks are a courtesy so a person is told before the round trip rather
 * than after it. `website` is a honeypot: hidden from people, filled in by
 * naive bots, and answered exactly like a real submission so a script
 * learns nothing.
 */
export function EnquiryForm() {
  const [values, setValues] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (field: Field | "website") => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setValues((v) => ({ ...v, [field]: event.target.value }));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;

    setError(null);

    if (!values.phone.trim() && !values.email.trim()) {
      setError("Please leave a telephone number or an email address, so the chamber can reply.");
      return;
    }

    setBusy(true);
    try {
      await apiFetch("/api/site/enquiries", {
        method: "POST",
        body: JSON.stringify(values),
      });
      setSent(true);
      setValues(EMPTY);
    } catch (err) {
      setError(err instanceof Error ? err.message : "That did not send. Please telephone instead.");
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-card border border-rule bg-success-wash p-8 text-center">
        <CheckCircle2 className="size-8 text-success" strokeWidth={1.6} />
        <h2 className="font-display text-xl font-medium text-ink">Your enquiry has been sent</h2>
        <p className="max-w-md text-sm leading-6 text-ink-soft">
          The chamber will be in touch. If your matter carries a deadline in
          the next few days, please telephone rather than wait for a reply.
        </p>
        <button
          type="button"
          onClick={() => setSent(false)}
          className="text-sm font-semibold text-gold hover:underline"
        >
          Send another
        </button>
      </div>
    );
  }

  const field =
    "w-full rounded-card border border-rule bg-surface px-4 py-2.5 text-sm text-ink placeholder:text-ink-soft/60 focus:border-gold focus:outline-none";
  const label = "block text-xs font-semibold tracking-[0.1em] text-ink-soft uppercase";

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="name" className={label}>
            Your name
          </label>
          <input id="name" required maxLength={120} value={values.name} onChange={set("name")} className={field} />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="subject" className={label}>
            Subject
          </label>
          <input
            id="subject"
            maxLength={200}
            value={values.subject}
            onChange={set("subject")}
            placeholder="Arbitration, bail, family…"
            className={field}
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="phone" className={label}>
            Telephone
          </label>
          <input id="phone" type="tel" maxLength={40} value={values.phone} onChange={set("phone")} className={field} />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="email" className={label}>
            Email
          </label>
          <input id="email" type="email" maxLength={160} value={values.email} onChange={set("email")} className={field} />
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="message" className={label}>
          What has happened
        </label>
        <textarea
          id="message"
          required
          rows={6}
          maxLength={4000}
          value={values.message}
          onChange={set("message")}
          placeholder="Tell the chamber briefly what the matter is, and any date that is running."
          className={`${field} resize-y`}
        />
      </div>

      {/* Honeypot. Hidden from people and from screen readers; only a bot
          fills it in. Not `display:none`, which some bots skip. */}
      <div aria-hidden className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="website">Leave this field empty</label>
        <input id="website" name="website" tabIndex={-1} autoComplete="off" value={values.website} onChange={set("website")} />
      </div>

      {error && (
        <p role="alert" className="rounded-card bg-danger-wash px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-4 pt-1">
        <button type="submit" disabled={busy} className={buttonClasses("primary")}>
          <Send className="size-4" />
          {busy ? "Sending…" : "Send the enquiry"}
        </button>
        <p className="text-xs leading-5 text-ink-soft">
          Sending an enquiry does not make the chamber your advocate, and
          nothing here is confidential until it is instructed.
        </p>
      </div>
    </form>
  );
}

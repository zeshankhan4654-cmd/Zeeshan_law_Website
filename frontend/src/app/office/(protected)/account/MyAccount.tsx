"use client";

import { AtSign, KeyRound } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { ApiError } from "@/lib/api";
import { useChangeEmail, useChangePassword, useMe } from "@/lib/use-auth";

export function MyAccount() {
  const me = useMe();

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <EmailCard current={me.data?.email ?? ""} isPlaceholder={me.data?.emailIsPlaceholder ?? false} />
      <PasswordCard />
    </div>
  );
}

function Card({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof AtSign;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4 rounded-card border border-rule bg-surface p-6">
      <div className="flex items-center gap-2">
        <Icon className="size-5 text-gold" strokeWidth={1.6} />
        <h2 className="font-display text-lg text-ink">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function EmailCard({ current, isPlaceholder }: { current: string; isPlaceholder: boolean }) {
  const change = useChangeEmail();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setDone(false);
    change.mutate(
      { password, email },
      {
        onSuccess: () => {
          setDone(true);
          setEmail("");
          setPassword("");
        },
        onError: (err) =>
          setError(err instanceof ApiError ? err.message : "That did not save."),
      }
    );
  }

  return (
    <Card icon={AtSign} title="The address you sign in with">
      <p className="text-sm leading-6 text-ink-soft">
        Currently <span className="font-medium break-all text-ink">{current}</span>.
      </p>

      {isPlaceholder && (
        <p className="rounded-md bg-gold-wash px-3 py-2 text-sm leading-6 text-ink">
          This address was written for you when sign-in moved to email, and nothing can
          be sent to it. It signs you in perfectly well — but put your real address here
          so a password can be recovered later.
        </p>
      )}

      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <Field
          label="New email"
          type="email"
          autoCapitalize="none"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Field
          label="Your password"
          type="password"
          hint="Asked for so that an unattended signed-in screen is not enough to move your sign-in elsewhere."
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && (
          <p role="alert" className="rounded-md bg-danger-wash px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}
        {done && <p className="text-sm text-ink">Saved. Use the new address next time.</p>}
        <Button type="submit" disabled={change.isPending || !email || !password}>
          {change.isPending ? "Saving…" : "Change my address"}
        </Button>
      </form>
    </Card>
  );
}

function PasswordCard() {
  const change = useChangePassword();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setDone(false);

    if (newPassword.length < 10) {
      setError("Choose a password of at least 10 characters.");
      return;
    }

    change.mutate(
      { currentPassword, newPassword },
      {
        onSuccess: () => {
          setDone(true);
          setCurrentPassword("");
          setNewPassword("");
        },
        onError: (err) =>
          setError(err instanceof ApiError ? err.message : "That did not save."),
      }
    );
  }

  return (
    <Card icon={KeyRound} title="Your password">
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <Field
          label="Current password"
          type="password"
          autoComplete="current-password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          required
        />
        <Field
          label="New password"
          type="password"
          hint="At least 10 characters. Three unrelated words beat one word with digits on the end."
          autoComplete="new-password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
        />
        {error && (
          <p role="alert" className="rounded-md bg-danger-wash px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}
        {done && <p className="text-sm text-ink">Saved.</p>}
        <Button type="submit" disabled={change.isPending || !currentPassword || !newPassword}>
          {change.isPending ? "Saving…" : "Change my password"}
        </Button>
      </form>
    </Card>
  );
}

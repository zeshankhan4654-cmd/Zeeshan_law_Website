"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { ApiError } from "@/lib/api";
import { usePortalChangePassword } from "@/lib/use-portal";

const MIN_LENGTH = 10;

export function PortalChangePasswordForm() {
  const router = useRouter();
  const change = usePortalChangePassword();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");

  const mismatch = confirm.length > 0 && confirm !== newPassword;
  const tooShort = newPassword.length > 0 && newPassword.length < MIN_LENGTH;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (newPassword.length < MIN_LENGTH) {
      setError(`Your new password needs at least ${MIN_LENGTH} characters.`);
      return;
    }
    if (newPassword !== confirm) {
      setError("The two passwords do not match.");
      return;
    }

    change.mutate(
      { currentPassword, newPassword },
      {
        onSuccess: () => {
          router.push("/client");
          router.refresh();
        },
        onError: (err) => {
          setError(err instanceof ApiError ? err.message : "Something went wrong. Try again.");
        },
      }
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      <Field
        label="The password you were given"
        type="password"
        autoComplete="current-password"
        value={currentPassword}
        onChange={(e) => setCurrentPassword(e.target.value)}
        required
      />
      <div className="space-y-1.5">
        <Field
          label="Your new password"
          type="password"
          autoComplete="new-password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
        />
        <p className={`text-xs leading-5 ${tooShort ? "text-danger" : "text-ink-soft"}`}>
          At least {MIN_LENGTH} characters. Three unrelated words are easier
          to remember and harder to guess than one word with digits on the end.
        </p>
      </div>
      <div className="space-y-1.5">
        <Field
          label="Type it again"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
        />
        {mismatch && <p className="text-xs text-danger">The two do not match.</p>}
      </div>

      {error && (
        <p role="alert" className="rounded-md bg-danger-wash px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      <Button type="submit" disabled={change.isPending} className="w-full">
        {change.isPending ? "Saving…" : "Save the new password"}
      </Button>
    </form>
  );
}

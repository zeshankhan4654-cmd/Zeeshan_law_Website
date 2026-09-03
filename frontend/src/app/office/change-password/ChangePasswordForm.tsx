"use client";

import { KeyRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { ApiError } from "@/lib/api";
import { useChangePassword } from "@/lib/use-auth";

export function ChangePasswordForm({ forced }: { forced: boolean }) {
  const router = useRouter();
  const changePassword = useChangePassword();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (newPassword !== confirm) {
      setError("Both new passwords must match.");
      return;
    }

    changePassword.mutate(
      { currentPassword, newPassword },
      {
        onSuccess: () => {
          router.push("/office");
          router.refresh();
        },
        onError: (err) => {
          setError(err instanceof ApiError ? err.message : "Something went wrong. Try again.");
        },
      }
    );
  }

  return (
    <Card className="w-full max-w-sm border-t-4 border-t-gold">
      <CardBody className="flex flex-col gap-5">
        <div className="flex flex-col items-center gap-2 text-center">
          <span className="grid size-11 place-items-center rounded-md bg-gold-wash">
            <KeyRound className="size-5 text-gold" strokeWidth={1.5} />
          </span>
          <h1 className="font-display text-xl text-ink">Change password</h1>
          {forced && (
            <p className="text-sm text-ink-soft">
              Choose your own password — nobody else, including whoever created this account,
              will ever see it.
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
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
            autoComplete="new-password"
            hint="At least 10 characters. Three unrelated words beat one word with digits on the end."
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            minLength={10}
            required
          />
          <Field
            label="New password again"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />
          {error && (
            <p role="alert" className="rounded-md bg-danger-wash px-3 py-2 text-sm text-danger">
              {error}
            </p>
          )}
          <Button type="submit" disabled={changePassword.isPending} className="w-full">
            {changePassword.isPending ? "Saving…" : "Save the new password"}
          </Button>
        </form>
      </CardBody>
    </Card>
  );
}

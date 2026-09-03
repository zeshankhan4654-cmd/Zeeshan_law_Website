"use client";

import { Scale } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { ApiError } from "@/lib/api";
import { useLogin } from "@/lib/use-auth";

export function LoginForm() {
  const router = useRouter();
  const login = useLogin();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    login.mutate(
      { username, password },
      {
        onSuccess: (user) => {
          router.push(user.mustChangePassword ? "/office/change-password" : "/office");
          router.refresh(); // re-runs the server-side session check on the destination
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
            <Scale className="size-5 text-gold" strokeWidth={1.5} />
          </span>
          <p className="text-xs font-semibold tracking-[0.14em] text-gold uppercase">Staff only</p>
          <h1 className="font-display text-xl text-ink">Office sign-in</h1>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          <Field
            label="Username"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <Field
            label="Password"
            type="password"
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
          <Button type="submit" disabled={login.isPending} className="w-full">
            {login.isPending ? "Signing in…" : "Sign in"}
          </Button>
        </form>

        <p className="text-center text-xs text-ink-soft">
          Usernames are all small letters. Clients sign in at the client portal instead.
        </p>
      </CardBody>
    </Card>
  );
}

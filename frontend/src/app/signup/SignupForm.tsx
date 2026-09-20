"use client";

import { Check, Copy } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { ApiError } from "@/lib/api";
import { useSignup, type NewChamber } from "@/lib/use-auth";

/** Long enough to be worth having; the server enforces the same floor. */
const MIN_PASSWORD = 10;

export function SignupForm() {
  const router = useRouter();
  const signup = useSignup();

  const [fullName, setFullName] = useState("");
  const [chamberName, setChamberName] = useState("");
  const [email, setEmail] = useState("");
  const [enrolmentNo, setEnrolmentNo] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [created, setCreated] = useState<NewChamber | null>(null);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < MIN_PASSWORD) {
      setError(`Choose a password of at least ${MIN_PASSWORD} characters.`);
      return;
    }

    signup.mutate(
      { fullName, chamberName, email, password, enrolmentNo },
      {
        onSuccess: setCreated,
        onError: (err) =>
          setError(err instanceof ApiError ? err.message : "Something went wrong. Try again."),
      }
    );
  }

  if (created) return <Welcome chamber={created} onEnter={() => router.push("/office")} />;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      <Field
        label="Your name"
        autoComplete="name"
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        required
      />
      <Field
        label="Chamber name"
        hint="As you would write it on a letterhead. It appears on the link you give your clients."
        autoComplete="organization"
        value={chamberName}
        onChange={(e) => setChamberName(e.target.value)}
        required
      />
      <Field
        label="Email"
        type="email"
        hint="This is what you will sign in with."
        autoComplete="email"
        autoCapitalize="none"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <Field
        label="Enrolment number"
        hint="Optional. Helps us verify the chamber; nothing waits on it."
        value={enrolmentNo}
        onChange={(e) => setEnrolmentNo(e.target.value)}
      />
      <Field
        label="Password"
        type="password"
        hint={`At least ${MIN_PASSWORD} characters. Three unrelated words beat one word with digits on the end.`}
        autoComplete="new-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />

      {error && (
        <p role="alert" className="rounded-md bg-danger-wash px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      <Button type="submit" disabled={signup.isPending} className="w-full">
        {signup.isPending ? "Creating your chamber…" : "Create my chamber"}
      </Button>

      <p className="text-center text-xs text-ink-soft">
        Already have one?{" "}
        <Link href="/office/login" className="font-semibold text-gold hover:underline">
          Sign in
        </Link>
        .
      </p>
    </form>
  );
}

/**
 * What an advocate needs in the first minute: the link for their clients,
 * and the fact that nobody else can see what they put in.
 */
function Welcome({ chamber, onEnter }: { chamber: NewChamber; onEnter: () => void }) {
  const [copied, setCopied] = useState(false);
  const link =
    typeof window === "undefined"
      ? chamber.chamber.clientLoginPath
      : `${window.location.origin}${chamber.chamber.clientLoginPath}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // A browser that refuses the clipboard is not an error worth showing;
      // the link is on the screen and can be selected by hand.
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="space-y-1.5">
        <h2 className="font-display text-xl text-ink">{chamber.chamber.name} is ready</h2>
        <p className="text-sm leading-6 text-ink-soft">
          Signed in as <span className="font-medium text-ink">{chamber.email}</span>. Your
          chamber is yours alone — no other chamber on this platform can see your clients,
          your files or your diary.
        </p>
      </div>

      <div className="space-y-2 rounded-md border border-rule bg-ground p-4">
        <p className="text-sm font-medium text-ink">The link for your clients</p>
        <p className="text-xs leading-5 text-ink-soft">
          Give this to a client after you switch their portal access on. Signing in needs
          this link as well as their username, which is why a client of another chamber
          cannot reach yours.
        </p>
        <div className="flex items-center gap-2">
          <code className="flex-1 truncate rounded border border-rule bg-surface px-2.5 py-1.5 text-xs text-ink">
            {link}
          </code>
          <Button type="button" variant="outline" onClick={copy} className="shrink-0">
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            <span className="sr-only">Copy the client link</span>
          </Button>
        </div>
      </div>

      <p className="text-xs leading-5 text-ink-soft">
        Your chamber is not yet verified. That restricts nothing you do inside it — it
        only matters for anything published in your chamber&rsquo;s name later.
      </p>

      <Button type="button" onClick={onEnter} className="w-full">
        Go to my office
      </Button>
    </div>
  );
}

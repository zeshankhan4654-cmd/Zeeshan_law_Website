import { Mic, Smartphone, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/site/Logo";
import { getPortalClient } from "@/lib/portal-session";
import { PortalLoginForm } from "./PortalLoginForm";

export const metadata = {
  title: "Client sign-in — The Arbitrator & Law Associates",
  description: "Clients of the chamber can follow their own matters here.",
};

/**
 * Sign-in, and — for the visitor who arrived here from the header without an
 * account — what the portal is and how access is obtained. The two belong on
 * one page: a separate marketing page would send anyone who actually has an
 * account through a pointless extra click.
 */
export default async function ClientLogin() {
  // Already signed in: no reason to show a sign-in form.
  const client = await getPortalClient();
  if (client) redirect(client.mustChangePassword ? "/client/change-password" : "/client");

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <div className="flex items-center justify-center bg-ground px-6 py-16">
        <div className="w-full max-w-sm space-y-7">
          <Link href="/" className="flex items-center gap-2.5 text-ink">
            <span className="grid size-10 place-items-center rounded-md bg-gold-wash text-gold">
              <Logo className="size-6" />
            </span>
            <span className="text-sm leading-tight font-semibold">
              The Arbitrator &amp; Law Associates
            </span>
          </Link>

          <div className="space-y-1.5">
            <p className="text-xs font-semibold tracking-[0.14em] text-gold uppercase">
              Clients of the chamber
            </p>
            <h1 className="font-display text-2xl text-ink">Sign in to your matter</h1>
          </div>

          <PortalLoginForm />

          <p className="text-sm leading-6 text-ink-soft">
            Forgotten your password? Telephone the chamber and a new one will
            be issued. The office cannot read your old one — only a
            scrambled form of it is stored.
          </p>

          <p className="border-t border-rule pt-5 text-xs text-ink-soft">
            Chamber staff sign in{" "}
            <Link href="/office/login" className="font-semibold text-gold hover:underline">
              here
            </Link>
            .
          </p>
        </div>
      </div>

      {/* What the portal is, for whoever arrived without an account. */}
      <aside className="hidden flex-col justify-center gap-8 bg-ink px-12 py-16 lg:flex">
        <div className="space-y-3">
          <h2 className="font-display text-2xl text-white">
            Your matter, without telephoning to ask
          </h2>
          <p className="max-w-md leading-7 text-white/70">
            Hearing dates, the progress posted on your file, the documents the
            chamber has shared with you, and a way to put a question to the
            office.
          </p>
        </div>

        <ul className="space-y-5">
          {[
            {
              icon: ShieldCheck,
              title: "There is no public sign-up",
              body: "Accounts are issued by the office to clients of the chamber. A page that hands out access to real case files would be a liability, not a feature.",
            },
            {
              icon: Mic,
              title: "Speak, rather than type",
              body: "Send the office a spoken note about your case when writing one out is more trouble than it is worth.",
            },
            {
              icon: Smartphone,
              title: "Or on your phone",
              body: "The same portal is in the chamber's app, which will also tell you the evening before a hearing.",
            },
          ].map((f) => (
            <li key={f.title} className="flex gap-4">
              <span className="grid size-10 shrink-0 place-items-center rounded-md bg-gold/15 text-gold-bright">
                <f.icon className="size-5" strokeWidth={1.6} />
              </span>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-white">{f.title}</h3>
                <p className="max-w-sm text-sm leading-6 text-white/60">{f.body}</p>
              </div>
            </li>
          ))}
        </ul>

        <p className="text-sm text-white/60">
          Not a client yet?{" "}
          <Link href="/contact" className="font-semibold text-gold-bright hover:underline">
            Speak to the chamber
          </Link>
          .
        </p>
      </aside>
    </main>
  );
}

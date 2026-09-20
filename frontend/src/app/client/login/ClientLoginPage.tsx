import { Mic, Smartphone, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/site/Logo";
import { getPortalClient } from "@/lib/portal-session";
import { PortalLoginForm } from "./PortalLoginForm";

/**
 * Sign-in, and — for the visitor who arrived here from the header without an
 * account — what the portal is and how access is obtained. The two belong on
 * one page: a separate marketing page would send anyone who actually has an
 * account through a pointless extra click.
 *
 * The chamber is part of signing in. A client's username is unique within
 * their advocate's chamber, not across the platform, so the chamber comes
 * from the link they were sent and this page carries its name — a sign-in
 * page with nobody's name on it is what a phishing copy of one looks like.
 */
export async function ClientLoginPage({
  chamber,
}: {
  chamber: { slug: string; name: string; status: string };
}) {
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
            <span className="text-sm leading-tight font-semibold">{chamber.name}</span>
          </Link>

          <div className="space-y-1.5">
            <p className="text-xs font-semibold tracking-[0.14em] text-gold uppercase">
              Clients of {chamber.name}
            </p>
            <h1 className="font-display text-2xl text-ink">Sign in to your matter</h1>
          </div>

          {chamber.status === "active" ? (
            <PortalLoginForm chamber={chamber.slug} />
          ) : (
            /* The link is right; the chamber is not currently active. Why
               that is, is between the chamber and the platform, and it is
               the advocate's to explain — so this says only that they
               should be spoken to. */
            <p className="rounded-card border border-rule bg-ground p-4 text-sm leading-6 text-ink">
              {chamber.name} is not currently signing clients in. Your link is correct —
              please telephone the chamber directly.
            </p>
          )}

          <p className="text-sm leading-6 text-ink-soft">
            Forgotten your password? Telephone {chamber.name} and a new one
            will be issued. The office cannot read your old one — only a
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
              body: "Accounts are issued by your advocate's office to its own clients. A page that hands out access to real case files would be a liability, not a feature.",
            },
            {
              icon: Mic,
              title: "Speak, rather than type",
              body: "Send the office a spoken note about your case when writing one out is more trouble than it is worth.",
            },
            {
              icon: Smartphone,
              title: "Or on your phone",
              body: "The same portal is in the app, which will also tell you the evening before a hearing.",
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

import { Apple, Mic, Smartphone } from "lucide-react";
import Link from "next/link";
import { buttonClasses } from "@/components/ui/Button";
import { Reveal } from "@/components/site/Reveal";

export const metadata = {
  title: "Client portal — The Arbitrator & Law Associates",
  description:
    "Clients of the chamber can follow their own matters, read what has been shared with them, and ask the office a question.",
};

/**
 * The portal as it stands today: it exists, on the phone. The browser
 * version arrives in Phase 4, and this page says so plainly rather than
 * promising a sign-in that is not there yet.
 */
export default function ClientPortal() {
  return (
    <>
      <header className="border-b border-rule bg-ink px-6 py-16">
        <div className="mx-auto max-w-6xl space-y-4">
          <p className="text-xs font-semibold tracking-[0.18em] text-gold uppercase">
            Client portal
          </p>
          <h1 className="font-display text-4xl font-medium text-white">
            Your matter, without telephoning to ask
          </h1>
          <p className="max-w-2xl leading-7 text-white/70">
            Clients of the chamber can see their hearing dates, read the
            progress posted on their file, open the documents shared with
            them, and put a question to the office — in writing, or by
            speaking it.
          </p>
        </div>
      </header>

      <section className="mx-auto max-w-4xl px-6 py-16">
        <Reveal className="grid gap-4 sm:grid-cols-3">
          {[
            { icon: Smartphone, title: "On your phone", body: "Hearing dates and progress, wherever you are." },
            { icon: Mic, title: "Speak, don't type", body: "Send the office a spoken note about your case." },
            { icon: Apple, title: "Notified", body: "Told the evening before a hearing, and when the chamber replies." },
          ].map((f) => (
            <div key={f.title} className="space-y-3 rounded-card border border-rule bg-surface p-6">
              <span className="grid size-11 place-items-center rounded-card bg-gold-wash text-gold">
                <f.icon className="size-5" strokeWidth={1.6} />
              </span>
              <h2 className="font-display text-lg font-medium text-ink">{f.title}</h2>
              <p className="text-sm leading-6 text-ink-soft">{f.body}</p>
            </div>
          ))}
        </Reveal>

        <Reveal className="mt-10 space-y-4 rounded-card border border-rule bg-gold-wash/50 p-7">
          <h2 className="font-display text-xl font-medium text-ink">How to get access</h2>
          <p className="leading-7 text-ink-soft">
            There is no public sign-up, by design: a page that hands out
            access to real case files is a liability rather than a feature.
            Accounts are issued by the office to clients of the chamber, and
            you choose your own password the first time you sign in.
          </p>
          <p className="leading-7 text-ink-soft">
            Telephone the chamber, or send an enquiry, and ask for portal
            access on your matter.
          </p>
          <div className="flex flex-wrap gap-3 pt-1">
            <Link href="/contact" className={buttonClasses("primary")}>
              Ask for access
            </Link>
          </div>
          <p className="pt-2 text-sm text-ink-soft">
            Signing in from a browser is being built now. Until it is
            finished, the portal is on the chamber&rsquo;s app — ask the
            office for the link.
          </p>
        </Reveal>
      </section>
    </>
  );
}

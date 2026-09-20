import { Building2, Scale, ShieldCheck } from "lucide-react";
import { Reveal } from "@/components/site/Reveal";
import { Verse } from "@/components/site/Verse";
import { getSettings } from "@/lib/site";

export const metadata = {
  title: "The chamber — The Arbitrator & Law Associates",
  description:
    "A chamber of advocates, arbitrators and legal consultants practising at the Peshawar High Court.",
};

const PRINCIPLES = [
  {
    icon: Scale,
    title: "The deadline first",
    body: "Most matters are decided by a date rather than an argument. The first thing the chamber establishes on any new file is what time is running, and from when.",
  },
  {
    icon: ShieldCheck,
    title: "Told plainly",
    body: "A client is entitled to know what their case is worth and what it is not. Where a matter is weak, the chamber says so at the outset rather than at the end.",
  },
  {
    icon: Building2,
    title: "Written down",
    body: "Advice that matters is recorded on the file, and progress is posted where the client can read it without telephoning to ask.",
  },
];

export default async function About() {
  const settings = await getSettings();

  return (
    <>
      <header className="border-b border-rule bg-ink px-6 py-16">
        <div className="mx-auto max-w-6xl space-y-4">
          <p className="text-xs font-semibold tracking-[0.18em] text-gold uppercase">
            The chamber
          </p>
          <h1 className="font-display text-4xl font-medium text-white">
            {settings["firm.name"] ?? "The Arbitrator & Law Associates"}
          </h1>
          <p className="max-w-2xl leading-7 text-white/70">{settings["firm.tagline"]}</p>
        </div>
      </header>

      <section className="mx-auto max-w-3xl space-y-6 px-6 py-16">
        <Reveal className="space-y-6 text-lg leading-8 text-ink-soft">
          <p>
            The chamber practises at the Peshawar High Court and the courts
            below it, in arbitration and in litigation. Its work runs from
            commercial arbitration and corporate advice through to family
            matters and criminal appeals — a range that is unusual in larger
            firms, and ordinary in a chamber where the same counsel carries a
            file from the first conference to the last order.
          </p>
          <p>
            Much of what the chamber does turns on procedure: whether an
            appeal was filed in time, whether an application under the
            arbitration clause was made before the first statement on the
            substance of the dispute, whether a notice was answered by the
            date printed on it. These are not technicalities. They are
            usually the case.
          </p>
        </Reveal>
      </section>

      <section className="px-6 pb-16">
        <Reveal>
          <Verse />
        </Reveal>
      </section>

      <section className="border-t border-rule bg-surface px-6 py-16">
        <div className="mx-auto grid max-w-6xl gap-4 md:grid-cols-3">
          {PRINCIPLES.map((p) => (
            <Reveal key={p.title}>
              <div className="h-full space-y-3 rounded-card border border-rule bg-ground p-6">
                <span className="grid size-11 place-items-center rounded-card bg-gold-wash text-gold">
                  <p.icon className="size-5" strokeWidth={1.6} />
                </span>
                <h2 className="font-display text-lg font-medium text-ink">{p.title}</h2>
                <p className="text-sm leading-6 text-ink-soft">{p.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>
    </>
  );
}

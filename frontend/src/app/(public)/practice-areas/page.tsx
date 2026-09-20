import { Check } from "lucide-react";
import Link from "next/link";
import { Reveal } from "@/components/site/Reveal";
import { PRACTICE_AREAS } from "@/lib/practice-areas";

export const metadata = {
  title: "Practice areas — The Arbitrator & Law Associates",
  description:
    "Arbitration and ADR, civil and criminal litigation, family law, corporate work, company registration, taxation, and limitation and appeals.",
};

export default function PracticeAreas() {
  return (
    <>
      <header className="border-b border-rule bg-ink px-6 py-16">
        <div className="mx-auto max-w-6xl space-y-4">
          <p className="text-xs font-semibold tracking-[0.18em] text-gold uppercase">
            Practice areas
          </p>
          <h1 className="font-display text-4xl font-medium text-white">
            What the chamber is instructed to do
          </h1>
          <p className="max-w-2xl leading-7 text-white/70">
            Seven areas, and the work within each that comes up most often.
            Where the chamber has written about a subject, the writing is
            linked — it will usually answer the first question before you ask
            it.
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-4 px-6 py-16">
        {PRACTICE_AREAS.map((area) => (
          <Reveal key={area.slug}>
            {/* scroll-mt so the header does not cover the heading when
                arriving from an anchor link. */}
            <section
              id={area.slug}
              className="scroll-mt-24 rounded-card border border-rule bg-surface p-7 md:p-9"
            >
              <div className="grid gap-7 md:grid-cols-[1fr_1fr]">
                <div className="space-y-4">
                  <span className="grid size-12 place-items-center rounded-card bg-gold-wash text-gold">
                    <area.icon className="size-6" strokeWidth={1.6} />
                  </span>
                  <h2 className="font-display text-2xl font-medium text-ink">{area.title}</h2>
                  <p className="leading-7 text-ink-soft">{area.summary}</p>
                  <Link
                    href={`/resources?q=${encodeURIComponent(area.topic)}`}
                    className="inline-block text-sm font-semibold text-gold hover:underline"
                  >
                    What we have written on this →
                  </Link>
                </div>

                <ul className="space-y-2.5 self-center">
                  {area.work.map((item) => (
                    <li key={item} className="flex gap-3 text-sm leading-6 text-ink-soft">
                      <Check className="mt-1 size-4 shrink-0 text-gold" strokeWidth={2} />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          </Reveal>
        ))}
      </div>
    </>
  );
}

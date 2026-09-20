import { JUSTICE_VERSE } from "@/lib/scripture";

/**
 * Set as a quotation, Arabic first, because that is the text and the
 * English is the rendering of it.
 */
export function Verse() {
  return (
    <figure className="mx-auto max-w-3xl rounded-card border-y border-rule bg-gold-wash/50 px-6 py-8 text-center sm:rounded-card sm:border-x">
      <blockquote className="space-y-5">
        <p
          dir="rtl"
          lang="ar"
          className="font-arabic text-2xl leading-[2.1] text-ink sm:text-[1.7rem]"
        >
          {JUSTICE_VERSE.arabic}
        </p>
        <p className="font-display text-lg leading-8 text-ink-soft italic">
          “{JUSTICE_VERSE.english}”
        </p>
      </blockquote>
      <figcaption className="mt-5 text-xs font-semibold tracking-[0.18em] text-gold uppercase">
        {JUSTICE_VERSE.reference}
      </figcaption>
    </figure>
  );
}

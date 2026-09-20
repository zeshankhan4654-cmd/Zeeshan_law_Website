import { ArrowRight, BookOpen, Gavel, Quote, Star } from "lucide-react";
import Link from "next/link";
import { Reveal } from "@/components/site/Reveal";
import { Verse } from "@/components/site/Verse";
import { buttonClasses } from "@/components/ui/Button";
import { PRACTICE_AREAS } from "@/lib/practice-areas";
import { formatLongDate, getLibraryCounts, getPosts, getSettings, getTestimonials } from "@/lib/site";

export const metadata = {
  title: "The Arbitrator & Law Associates — Advocates at the Peshawar High Court",
  description:
    "A chamber practising at the Peshawar High Court: arbitration, civil and criminal litigation, family law, corporate and tax matters.",
};

export default async function Home() {
  const [settings, testimonials, posts, counts] = await Promise.all([
    getSettings(),
    getTestimonials(),
    getPosts({ limit: 3 }),
    getLibraryCounts(),
  ]);

  const phone = settings["contact.phone"];

  return (
    <>
      {/* Hero */}
      <section className="border-b border-rule bg-ink">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 py-20 md:grid-cols-[1.15fr_1fr] md:items-center md:py-28">
          <Reveal className="space-y-6">
            <p className="text-xs font-semibold tracking-[0.2em] text-gold uppercase">
              {settings["firm.tagline"]}
            </p>
            <h1 className="font-display text-4xl leading-tight font-medium text-white sm:text-5xl">
              Counsel that prepares the case, not just the hearing.
            </h1>
            <p className="max-w-xl text-lg leading-8 text-white/70">
              A chamber practising at the Peshawar High Court, in arbitration,
              civil and criminal litigation, family law, corporate and tax
              matters. Every file is worked on the understanding that the
              deadline, not the argument, is what usually decides a case.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link href="/contact" className={buttonClasses("primary")}>
                Speak to the chamber
              </Link>
              <Link
                href="/practice-areas"
                className="inline-flex items-center gap-1.5 rounded-card px-4 py-2.5 text-sm font-semibold text-white/85 ring-1 ring-white/20 transition hover:ring-white/50"
              >
                What we do <ArrowRight className="size-4" />
              </Link>
            </div>
          </Reveal>

          {/* The library, which is the thing on this site other lawyers use. */}
          <Reveal>
            <div className="rounded-card border border-white/10 bg-white/[0.04] p-6">
              <h2 className="text-xs font-semibold tracking-[0.18em] text-gold uppercase">
                Open to everyone
              </h2>
              <p className="mt-3 text-sm leading-6 text-white/70">
                The chamber keeps a library of its own research and the
                judgments it relies on. It is free to read, and it is meant
                for other practitioners as much as for clients.
              </p>
              <dl className="mt-6 grid grid-cols-2 gap-4">
                <div className="rounded-card bg-white/[0.04] p-4">
                  <dt className="flex items-center gap-2 text-xs text-white/60">
                    <BookOpen className="size-4 text-gold" /> Research
                  </dt>
                  <dd className="mt-1 font-display text-2xl text-white">{counts.research}</dd>
                </div>
                <div className="rounded-card bg-white/[0.04] p-4">
                  <dt className="flex items-center gap-2 text-xs text-white/60">
                    <Gavel className="size-4 text-gold" /> Judgments
                  </dt>
                  <dd className="mt-1 font-display text-2xl text-white">{counts.judgments}</dd>
                </div>
              </dl>
              <Link
                href="/resources"
                className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-gold-bright hover:underline"
              >
                Read the library <ArrowRight className="size-4" />
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* The verse, below the introduction, as the chamber asked. */}
      <section className="px-6 py-16">
        <Reveal>
          <Verse />
        </Reveal>
      </section>

      {/* Practice areas */}
      <section className="border-t border-rule bg-surface px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <Reveal className="max-w-2xl space-y-3">
            <p className="text-xs font-semibold tracking-[0.18em] text-gold uppercase">
              Practice areas
            </p>
            <h2 className="font-display text-3xl font-medium text-ink">
              Where the chamber is instructed
            </h2>
          </Reveal>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {PRACTICE_AREAS.map((area) => (
              <Reveal key={area.slug}>
                <Link
                  href={`/practice-areas#${area.slug}`}
                  className="flex h-full flex-col gap-3 rounded-card border border-rule bg-ground p-6 transition hover:border-gold/50 hover:shadow-sm motion-safe:hover:-translate-y-0.5"
                >
                  <span className="grid size-11 place-items-center rounded-card bg-gold-wash text-gold">
                    <area.icon className="size-5" strokeWidth={1.6} />
                  </span>
                  <h3 className="font-display text-lg font-medium text-ink">{area.title}</h3>
                  <p className="text-sm leading-6 text-ink-soft">{area.summary}</p>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* What clients say */}
      {testimonials.length > 0 && (
        <section className="border-t border-rule px-6 py-20">
          <div className="mx-auto max-w-6xl">
            <Reveal className="max-w-2xl space-y-3">
              <p className="text-xs font-semibold tracking-[0.18em] text-gold uppercase">
                Reviews
              </p>
              <h2 className="font-display text-3xl font-medium text-ink">
                What clients have said
              </h2>
            </Reveal>

            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {testimonials.slice(0, 6).map((t) => (
                <Reveal key={t.id}>
                  <figure className="flex h-full flex-col gap-4 rounded-card border border-rule bg-surface p-6">
                    <Quote className="size-6 text-gold/40" />
                    <blockquote className="flex-1 text-sm leading-6 text-ink-soft">
                      {t.body}
                    </blockquote>
                    <div className="flex" aria-label={`${t.rating} out of 5`}>
                      {Array.from({ length: 5 }, (_, n) => (
                        <Star
                          key={n}
                          className={`size-4 ${n < t.rating ? "fill-gold text-gold" : "text-rule"}`}
                        />
                      ))}
                    </div>
                    <figcaption className="text-sm">
                      <span className="font-semibold text-ink">{t.author}</span>
                      {t.role && <span className="text-ink-soft"> · {t.role}</span>}
                      {t.source && (
                        <span className="block text-xs text-ink-soft">via {t.source}</span>
                      )}
                    </figcaption>
                  </figure>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Recent writing */}
      {posts.items.length > 0 && (
        <section className="border-t border-rule bg-surface px-6 py-20">
          <div className="mx-auto max-w-6xl">
            <Reveal className="flex flex-wrap items-end justify-between gap-4">
              <div className="space-y-3">
                <p className="text-xs font-semibold tracking-[0.18em] text-gold uppercase">
                  Writing
                </p>
                <h2 className="font-display text-3xl font-medium text-ink">From the chamber</h2>
              </div>
              <Link
                href="/blog"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-gold hover:underline"
              >
                Everything we have written <ArrowRight className="size-4" />
              </Link>
            </Reveal>

            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {posts.items.map((post) => (
                <Reveal key={post.id}>
                  <Link
                    href={`/blog/${post.slug}`}
                    className="flex h-full flex-col gap-2 rounded-card border border-rule bg-ground p-6 transition hover:border-gold/50 motion-safe:hover:-translate-y-0.5"
                  >
                    {post.category && (
                      <span className="text-xs font-semibold text-gold">{post.category}</span>
                    )}
                    <h3 className="font-display text-lg leading-7 font-medium text-ink">
                      {post.title}
                    </h3>
                    {post.summary && (
                      <p className="text-sm leading-6 text-ink-soft">{post.summary}</p>
                    )}
                    {post.publishedOn && (
                      <span className="mt-auto pt-3 text-xs text-ink-soft">
                        {formatLongDate(post.publishedOn)}
                      </span>
                    )}
                  </Link>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Closing call */}
      <section className="border-t border-rule bg-ink px-6 py-20">
        <Reveal className="mx-auto flex max-w-3xl flex-col items-center gap-5 text-center">
          <h2 className="font-display text-3xl font-medium text-white">
            Tell us what has happened, and by when.
          </h2>
          <p className="max-w-xl leading-7 text-white/70">
            Most matters turn on a date. Bring the papers you have, including
            anything with a deadline printed on it, and the chamber will tell
            you plainly what can be done.
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-1">
            <Link href="/contact" className={buttonClasses("primary")}>
              Send an enquiry
            </Link>
            {phone && (
              <a
                href={`tel:${phone.replace(/\s/g, "")}`}
                className="inline-flex items-center rounded-card px-4 py-2.5 text-sm font-semibold text-white/85 ring-1 ring-white/20 transition hover:ring-white/50"
              >
                {phone}
              </a>
            )}
          </div>
        </Reveal>
      </section>
    </>
  );
}

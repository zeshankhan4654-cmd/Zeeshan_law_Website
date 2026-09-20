import { BookOpen, Gavel } from "lucide-react";
import Link from "next/link";
import { Reveal } from "@/components/site/Reveal";
import { getLibraryCounts, getResearch } from "@/lib/site";

export const metadata = {
  title: "Library — The Arbitrator & Law Associates",
  description:
    "The chamber's research on limitation, arbitration, bail, family law, company filings and taxation. Free to read.",
};

export default async function Resources({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const [research, counts] = await Promise.all([getResearch({ q, limit: 24 }), getLibraryCounts()]);

  return (
    <>
      <header className="border-b border-rule bg-ink px-6 py-16">
        <div className="mx-auto max-w-6xl space-y-4">
          <p className="text-xs font-semibold tracking-[0.18em] text-gold uppercase">Library</p>
          <h1 className="font-display text-4xl font-medium text-white">
            What the chamber has written
          </h1>
          <p className="max-w-2xl leading-7 text-white/70">
            Free to read, and meant for other practitioners as much as for
            clients. Each piece is written about a point that comes up often
            enough to be worth setting down properly.
          </p>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-12">
        {/* A plain GET form: search that works with JavaScript switched off,
            and a URL that can be sent to somebody. */}
        <form method="get" className="flex flex-wrap items-center gap-3">
          <label htmlFor="q" className="sr-only">
            Search the library
          </label>
          <input
            id="q"
            name="q"
            defaultValue={q}
            placeholder="limitation, arbitration, bail…"
            className="min-w-64 flex-1 rounded-card border border-rule bg-surface px-4 py-2.5 text-sm text-ink placeholder:text-ink-soft/60 focus:border-gold focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-card bg-ink px-5 py-2.5 text-sm font-semibold text-white hover:bg-ink-soft"
          >
            Search
          </button>
          {q && (
            <Link href="/resources" className="text-sm text-ink-soft hover:text-gold">
              Clear
            </Link>
          )}
        </form>

        <p className="mt-6 flex items-center gap-2 text-xs tracking-[0.1em] text-ink-soft uppercase">
          <BookOpen className="size-4 text-gold" />
          {research.total} article{research.total === 1 ? "" : "s"}
          {q ? ` matching “${q}”` : ""}
        </p>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {research.items.map((item) => (
            <Reveal key={item.id}>
              <article className="flex h-full flex-col gap-2 rounded-card border border-rule bg-surface p-6">
                {item.topic && (
                  <span className="self-start rounded-full bg-gold-wash px-2.5 py-0.5 text-xs font-semibold text-gold">
                    {item.topic}
                  </span>
                )}
                <h2 className="font-display text-lg leading-7 font-medium text-ink">
                  {item.title}
                </h2>
                {item.summary && (
                  <p className="text-sm leading-6 text-ink-soft">{item.summary}</p>
                )}
              </article>
            </Reveal>
          ))}
        </div>

        {research.items.length === 0 && (
          <p className="py-16 text-center text-sm text-ink-soft">
            {q ? `Nothing in the library matches “${q}”.` : "The library is empty."}
          </p>
        )}

        <div className="mt-10 flex items-start gap-3 rounded-card border border-rule bg-gold-wash/50 p-6">
          <Gavel className="mt-0.5 size-5 shrink-0 text-gold" strokeWidth={1.6} />
          <p className="text-sm leading-6 text-ink-soft">
            <span className="font-semibold text-ink">
              Judgments: {counts.judgments} published.
            </span>{" "}
            The chamber only publishes a citation it has checked against the
            report itself, so this section fills slowly and deliberately.
          </p>
        </div>
      </section>
    </>
  );
}

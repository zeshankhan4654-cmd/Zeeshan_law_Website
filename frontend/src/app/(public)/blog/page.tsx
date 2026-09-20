import Link from "next/link";
import { Reveal } from "@/components/site/Reveal";
import { formatLongDate, getPosts } from "@/lib/site";

export const metadata = {
  title: "Writing — The Arbitrator & Law Associates",
  description: "Notes from the chamber on the law as it is actually practised.",
};

export default async function Blog({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string }>;
}) {
  const { q = "", category = "" } = await searchParams;
  const posts = await getPosts({ q, category, limit: 24 });

  return (
    <>
      <header className="border-b border-rule bg-ink px-6 py-16">
        <div className="mx-auto max-w-6xl space-y-4">
          <p className="text-xs font-semibold tracking-[0.18em] text-gold uppercase">Writing</p>
          <h1 className="font-display text-4xl font-medium text-white">From the chamber</h1>
          <p className="max-w-2xl leading-7 text-white/70">
            Notes on the law as it is actually practised — what a notice
            means, what a deadline does, and what usually happens next.
          </p>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-12">
        {posts.categories.length > 0 && (
          <nav className="flex flex-wrap gap-2 pb-8">
            <Link
              href="/blog"
              className={`rounded-full px-3.5 py-1.5 text-sm ring-1 transition ${
                category === ""
                  ? "bg-ink text-white ring-ink"
                  : "text-ink-soft ring-rule hover:ring-gold"
              }`}
            >
              Everything
            </Link>
            {posts.categories.map((c) => (
              <Link
                key={c}
                href={`/blog?category=${encodeURIComponent(c)}`}
                className={`rounded-full px-3.5 py-1.5 text-sm ring-1 transition ${
                  category === c
                    ? "bg-ink text-white ring-ink"
                    : "text-ink-soft ring-rule hover:ring-gold"
                }`}
              >
                {c}
              </Link>
            ))}
          </nav>
        )}

        {posts.items.length === 0 ? (
          <p className="py-20 text-center text-sm text-ink-soft">
            {q || category
              ? "Nothing here matches that."
              : "The chamber has not published anything yet."}
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {posts.items.map((post) => (
              <Reveal key={post.id}>
                <Link
                  href={`/blog/${post.slug}`}
                  className="flex h-full flex-col overflow-hidden rounded-card border border-rule bg-surface transition hover:border-gold/50 motion-safe:hover:-translate-y-0.5"
                >
                  {/* A cover is optional; without one the card keeps its
                      shape rather than collapsing. Served by slug, not by
                      the stored filename. */}
                  <div className="aspect-[16/9] bg-gold-wash">
                    {post.coverName && (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={`${process.env.NEXT_PUBLIC_API_URL ?? ""}/api/site/posts/${post.slug}/cover`}
                        alt=""
                        className="size-full object-cover"
                        loading="lazy"
                      />
                    )}
                  </div>
                  <div className="flex flex-1 flex-col gap-2 p-6">
                    {post.category && (
                      <span className="text-xs font-semibold text-gold">{post.category}</span>
                    )}
                    <h2 className="font-display text-lg leading-7 font-medium text-ink">
                      {post.title}
                    </h2>
                    {post.summary && (
                      <p className="text-sm leading-6 text-ink-soft">{post.summary}</p>
                    )}
                    <span className="mt-auto pt-3 text-xs text-ink-soft">
                      {[post.author, formatLongDate(post.publishedOn)].filter(Boolean).join(" · ")}
                    </span>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

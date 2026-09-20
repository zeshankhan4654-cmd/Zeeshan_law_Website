import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ApiError } from "@/lib/api";
import { formatLongDate, getPost, type Post } from "@/lib/site";

/** The article body, in the same plain notation the mobile app renders. */
function ArticleBody({ body }: { body: string }) {
  const blocks = body.split(/\n{2,}/).filter((b) => b.trim());

  return (
    <div className="space-y-5">
      {blocks.map((block, i) => {
        const text = block.trim();

        if (text.startsWith("## ")) {
          return (
            <h2 key={i} className="pt-4 font-display text-2xl font-medium text-ink">
              {text.slice(3)}
            </h2>
          );
        }

        if (text.startsWith("> ")) {
          return (
            <blockquote
              key={i}
              className="border-l-2 border-gold bg-gold-wash/40 py-3 pl-5 text-ink italic"
            >
              {text.replace(/^> ?/gm, "")}
            </blockquote>
          );
        }

        if (text.startsWith("- ")) {
          return (
            <ul key={i} className="ml-1 space-y-2">
              {text.split("\n").map((line, n) => (
                <li key={n} className="flex gap-3 leading-8">
                  <span className="mt-3 size-1.5 shrink-0 rounded-full bg-gold" />
                  <span>{line.replace(/^- ?/, "")}</span>
                </li>
              ))}
            </ul>
          );
        }

        return (
          <p key={i} className="leading-8">
            {text}
          </p>
        );
      })}
    </div>
  );
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try {
    const post = await getPost(slug);
    return { title: `${post.title} — The Arbitrator & Law Associates`, description: post.summary };
  } catch {
    return { title: "Article not found" };
  }
}

export default async function BlogPost({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  let post: Post;
  try {
    post = await getPost(slug);
  } catch (err) {
    // A slug that is not published is indistinguishable from one that does
    // not exist, which is the point.
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }

  return (
    <article className="mx-auto max-w-3xl px-6 py-14">
      <Link
        href="/blog"
        className="inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-gold"
      >
        <ArrowLeft className="size-4" /> All writing
      </Link>

      <header className="mt-8 space-y-4 border-b border-rule pb-8">
        {post.category && (
          <span className="inline-block rounded-full bg-gold-wash px-3 py-1 text-xs font-semibold text-gold">
            {post.category}
          </span>
        )}
        <h1 className="font-display text-4xl leading-tight font-medium text-ink">{post.title}</h1>
        {post.summary && <p className="text-lg leading-8 text-ink-soft">{post.summary}</p>}
        <p className="text-sm text-ink-soft">
          {[post.author, formatLongDate(post.publishedOn)].filter(Boolean).join(" · ")}
        </p>
      </header>

      <div className="mt-8 text-ink-soft">
        <ArticleBody body={post.body} />
      </div>

      <footer className="mt-12 rounded-card border border-rule bg-gold-wash/40 p-6 text-sm leading-6 text-ink-soft">
        This article is general information about the law, not advice on your
        matter. Whether any of it applies to you depends on facts and dates
        that are not set out here.{" "}
        <Link href="/contact" className="font-semibold text-gold hover:underline">
          Speak to the chamber
        </Link>{" "}
        before acting on it.
      </footer>
    </article>
  );
}

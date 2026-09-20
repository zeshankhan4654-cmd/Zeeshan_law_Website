import Link from "next/link";
import { Empty, NotPermitted, PageHeading } from "@/components/office/PageHeading";
import { officeFetch } from "@/lib/office-data";
import { formatDate } from "@/lib/portal-types";

export const metadata = { title: "Writing — Office" };

type Row = {
  id: number;
  slug: string;
  title: string;
  category: string;
  published: boolean;
  publishedOn: string | null;
  views: number;
  coverName: string;
};

export default async function Blog() {
  const data = await officeFetch<{ items: Row[] }>("/api/office/posts");
  if (!data) return <NotPermitted />;

  const live = data.items.filter((p) => p.published).length;

  return (
    <>
      <PageHeading
        title="Writing"
        subtitle={`${live} on the website, ${data.items.length - live} in draft`}
        action={{ href: "/office/blog/new", label: "Write an article" }}
      />

      {data.items.length === 0 ? (
        <Empty>Nothing written yet.</Empty>
      ) : (
        <ul className="space-y-2">
          {data.items.map((p) => (
            <li key={p.id}>
              <Link
                href={`/office/blog/${p.id}`}
                className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-card border border-rule bg-surface px-5 py-3.5 transition hover:border-gold/50"
              >
                <span className="min-w-56 flex-1 font-medium text-ink">{p.title}</span>
                {p.category && <span className="text-sm text-ink-soft">{p.category}</span>}
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    p.published ? "bg-success-wash text-success" : "bg-rule/60 text-ink-soft"
                  }`}
                >
                  {p.published ? "on the website" : "draft"}
                </span>
                {p.publishedOn && (
                  <span className="text-xs text-ink-soft">{formatDate(p.publishedOn)}</span>
                )}
                <span className="text-xs text-ink-soft">{p.views} views</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

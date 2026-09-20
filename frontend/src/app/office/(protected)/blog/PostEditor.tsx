"use client";

import { ExternalLink, Image as ImageIcon, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { useDeletePost, useSavePost, useUploadCover, type PostFields } from "@/lib/use-office-content";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

const input =
  "w-full rounded-md border border-rule bg-ground px-3 py-2 text-sm text-ink focus:border-gold focus:outline-none";

export function PostEditor({
  id,
  initial,
  coverName,
}: {
  id?: number;
  initial?: Partial<PostFields>;
  coverName?: string;
}) {
  const router = useRouter();
  const save = useSavePost(id);
  const remove = useDeletePost();
  const upload = useUploadCover(id ?? 0);
  const fileRef = useRef<HTMLInputElement>(null);

  const [fields, setFields] = useState<PostFields>({
    title: initial?.title ?? "",
    slug: initial?.slug ?? "",
    summary: initial?.summary ?? "",
    body: initial?.body ?? "",
    category: initial?.category ?? "",
    tags: initial?.tags ?? "",
    published: initial?.published ?? false,
  });
  const [error, setError] = useState("");

  const set =
    (key: keyof PostFields) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setFields((f) => ({ ...f, [key]: e.target.value }));

  return (
    <div className="space-y-5">
      <div className="space-y-4 rounded-card border border-rule bg-surface p-6">
        <div className="space-y-1.5">
          <label htmlFor="post-title" className="block text-sm font-medium text-ink">
            Title
          </label>
          <input id="post-title" value={fields.title} onChange={set("title")} className={input} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="post-slug" className="block text-sm font-medium text-ink">
              Web address
            </label>
            <input
              id="post-slug"
              value={fields.slug}
              onChange={set("slug")}
              placeholder="left empty, one is made from the title"
              className={input}
            />
            <p className="text-xs text-ink-soft">
              Letters, numbers and hyphens. Changing it after publishing breaks any link
              already shared.
            </p>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="post-category" className="block text-sm font-medium text-ink">
              Category
            </label>
            <input id="post-category" value={fields.category} onChange={set("category")} className={input} />
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="post-summary" className="block text-sm font-medium text-ink">
            Summary
          </label>
          <textarea id="post-summary" rows={2} value={fields.summary} onChange={set("summary")} className={input} />
          <p className="text-xs text-ink-soft">Shown on the card and under the heading.</p>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="post-body" className="block text-sm font-medium text-ink">
            The article
          </label>
          <textarea
            id="post-body"
            rows={18}
            value={fields.body}
            onChange={set("body")}
            className={`${input} font-mono text-[13px] leading-6`}
          />
          <p className="text-xs leading-5 text-ink-soft">
            A blank line starts a paragraph. <code>## </code> makes a heading,{" "}
            <code>- </code> a bullet, <code>&gt; </code> a quotation. Nothing else is
            interpreted, so nothing can break the page.
          </p>
        </div>

        <label className="flex items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            checked={fields.published}
            onChange={(e) => setFields((f) => ({ ...f, published: e.target.checked }))}
            className="size-4 accent-[var(--color-gold)]"
          />
          Published — visible on the website
        </label>

        {error && (
          <p role="alert" className="rounded-md bg-danger-wash px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}

        <div className="flex flex-wrap gap-3">
          <Button
            type="button"
            disabled={save.isPending || fields.title.trim().length < 3}
            onClick={() => {
              setError("");
              save.mutate(fields, {
                onSuccess: (created) => {
                  if (!id) router.push(`/office/blog/${created.id}`);
                },
                onError: (err) => setError(err instanceof Error ? err.message : "That did not save."),
              });
            }}
          >
            {save.isPending ? "Saving…" : id ? "Save" : "Create the article"}
          </Button>

          {id && fields.published && fields.slug && (
            <Link
              href={`/blog/${fields.slug}`}
              target="_blank"
              className="inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium text-gold ring-1 ring-rule hover:bg-gold-wash"
            >
              <ExternalLink className="size-4" /> See it on the website
            </Link>
          )}

          {id && (
            <Button
              type="button"
              variant="destructive"
              disabled={remove.isPending}
              onClick={() =>
                remove.mutate(id, { onSuccess: () => router.push("/office/blog") })
              }
            >
              <Trash2 className="size-4" /> Delete
            </Button>
          )}
        </div>
      </div>

      {/* A cover needs an article to belong to, so it is offered only once
          the article exists. */}
      {id && (
        <div className="space-y-3 rounded-card border border-rule bg-surface p-6">
          <h2 className="flex items-center gap-2 font-display text-lg text-ink">
            <ImageIcon className="size-5 text-gold" strokeWidth={1.6} /> Cover photo
          </h2>

          {coverName && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={`${API_URL}/api/site/posts/${fields.slug}/cover`}
              alt=""
              className="aspect-[16/9] w-full max-w-md rounded-card border border-rule object-cover"
            />
          )}

          <div className="flex flex-wrap items-center gap-3">
            <input ref={fileRef} type="file" accept="image/*" className="text-sm text-ink-soft" />
            <Button
              type="button"
              size="sm"
              disabled={upload.isPending}
              onClick={() => {
                setError("");
                const file = fileRef.current?.files?.[0];
                if (!file) {
                  setError("Choose an image first.");
                  return;
                }
                upload.mutate(file, {
                  onSuccess: () => {
                    if (fileRef.current) fileRef.current.value = "";
                  },
                  onError: (err) =>
                    setError(err instanceof Error ? err.message : "That did not upload."),
                });
              }}
            >
              {upload.isPending ? "Uploading…" : coverName ? "Replace it" : "Upload"}
            </Button>
          </div>
          <p className="text-xs text-ink-soft">
            The cover is only served once the article is published.
          </p>
        </div>
      )}
    </div>
  );
}

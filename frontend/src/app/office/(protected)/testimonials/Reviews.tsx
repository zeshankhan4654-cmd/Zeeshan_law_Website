"use client";

import { Plus, Star, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import {
  useDeleteTestimonial,
  useSaveTestimonial,
  type TestimonialFields,
} from "@/lib/use-office-content";

export type Review = TestimonialFields & { id: number };

const EMPTY: TestimonialFields = {
  author: "",
  role: "",
  body: "",
  rating: 5,
  source: "Google",
  sourceUrl: "",
  published: true,
  sortOrder: 50,
};

const input =
  "w-full rounded-md border border-rule bg-ground px-3 py-2 text-sm text-ink focus:border-gold focus:outline-none";

function Stars({ rating }: { rating: number }) {
  return (
    <span className="flex" aria-label={`${rating} out of 5`}>
      {Array.from({ length: 5 }, (_, n) => (
        <Star key={n} className={`size-4 ${n < rating ? "fill-gold text-gold" : "text-rule"}`} />
      ))}
    </span>
  );
}

function ReviewForm({ review, onDone }: { review?: Review; onDone?: () => void }) {
  const save = useSaveTestimonial(review?.id);
  const [fields, setFields] = useState<TestimonialFields>(review ?? EMPTY);
  const [error, setError] = useState("");

  return (
    <div className="space-y-3 rounded-card border border-dashed border-rule p-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor={`author-${review?.id ?? "new"}`} className="block text-sm font-medium text-ink">
            Who said it
          </label>
          <input
            id={`author-${review?.id ?? "new"}`}
            value={fields.author}
            onChange={(e) => setFields((f) => ({ ...f, author: e.target.value }))}
            className={input}
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor={`role-${review?.id ?? "new"}`} className="block text-sm font-medium text-ink">
            What they do
          </label>
          <input
            id={`role-${review?.id ?? "new"}`}
            value={fields.role}
            onChange={(e) => setFields((f) => ({ ...f, role: e.target.value }))}
            className={input}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor={`body-${review?.id ?? "new"}`} className="block text-sm font-medium text-ink">
          What they said
        </label>
        <textarea
          id={`body-${review?.id ?? "new"}`}
          rows={3}
          value={fields.body}
          onChange={(e) => setFields((f) => ({ ...f, body: e.target.value }))}
          className={input}
        />
        <p className="text-xs leading-5 text-ink-soft">
          Their own words. A review the chamber wrote for them is not a review.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-1.5">
          <label htmlFor={`rating-${review?.id ?? "new"}`} className="block text-sm font-medium text-ink">
            Stars
          </label>
          <select
            id={`rating-${review?.id ?? "new"}`}
            value={fields.rating}
            onChange={(e) => setFields((f) => ({ ...f, rating: Number(e.target.value) }))}
            className={input}
          >
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor={`source-${review?.id ?? "new"}`} className="block text-sm font-medium text-ink">
            Where from
          </label>
          <input
            id={`source-${review?.id ?? "new"}`}
            value={fields.source}
            onChange={(e) => setFields((f) => ({ ...f, source: e.target.value }))}
            className={input}
          />
        </div>
        <label className="flex items-center gap-2 pb-2 text-sm text-ink">
          <input
            type="checkbox"
            checked={fields.published}
            onChange={(e) => setFields((f) => ({ ...f, published: e.target.checked }))}
            className="size-4 accent-[var(--color-gold)]"
          />
          Show it on the website
        </label>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          disabled={save.isPending || !fields.author.trim() || fields.body.trim().length < 5}
          onClick={() => {
            setError("");
            save.mutate(fields, {
              onSuccess: () => {
                if (!review) setFields(EMPTY);
                onDone?.();
              },
              onError: (err) => setError(err instanceof Error ? err.message : "That did not save."),
            });
          }}
        >
          {save.isPending ? "Saving…" : review ? "Save" : "Add the review"}
        </Button>
        {onDone && (
          <Button type="button" size="sm" variant="ghost" onClick={onDone}>
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
}

export function Reviews({ reviews }: { reviews: Review[] }) {
  const remove = useDeleteTestimonial();
  const [editing, setEditing] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);

  return (
    <div className="space-y-4">
      {adding ? (
        <ReviewForm onDone={() => setAdding(false)} />
      ) : (
        <Button type="button" onClick={() => setAdding(true)}>
          <Plus className="size-4" /> Add a review
        </Button>
      )}

      {reviews.length === 0 ? (
        <p className="rounded-card border border-rule bg-surface px-6 py-12 text-center text-sm leading-6 text-ink-soft">
          No reviews yet. Copy in what clients have actually written — on
          Google or anywhere else. Nothing here is seeded, because an
          invented review is not a placeholder.
        </p>
      ) : (
        <ul className="space-y-3">
          {reviews.map((r) =>
            editing === r.id ? (
              <li key={r.id}>
                <ReviewForm review={r} onDone={() => setEditing(null)} />
              </li>
            ) : (
              <li
                key={r.id}
                className={`space-y-2 rounded-card border p-5 ${
                  r.published ? "border-rule bg-surface" : "border-dashed border-rule bg-ground"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Stars rating={r.rating} />
                    <span className="text-sm font-medium text-ink">{r.author}</span>
                    {r.role && <span className="text-sm text-ink-soft">· {r.role}</span>}
                    {!r.published && (
                      <span className="rounded-full bg-rule px-2 py-0.5 text-xs text-ink-soft">
                        hidden
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setEditing(r.id)}
                      className="text-xs font-semibold text-gold hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => remove.mutate(r.id)}
                      disabled={remove.isPending}
                      aria-label={`Remove the review from ${r.author}`}
                      className="text-danger hover:opacity-70"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
                <p className="text-sm leading-6 text-ink-soft">{r.body}</p>
              </li>
            )
          )}
        </ul>
      )}
    </div>
  );
}

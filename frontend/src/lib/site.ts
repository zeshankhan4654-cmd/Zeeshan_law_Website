import "server-only";
import { apiFetch } from "./api";

/**
 * The public site's data, fetched on the server.
 *
 * These pages are Server Components: the marketing site has no reason to
 * ship a data-fetching library to a visitor's browser, and a page that is
 * rendered on the server is a page a search engine and a slow connection
 * both get whole. Only the two genuinely interactive pieces — the enquiry
 * form and the mobile menu — are client components.
 */

export type SiteSettings = Record<string, string>;

export type Testimonial = {
  id: number;
  author: string;
  role: string;
  body: string;
  rating: number;
  source: string;
  sourceUrl: string;
};

export type PostSummary = {
  id: number;
  slug: string;
  title: string;
  summary: string;
  category: string;
  coverName: string;
  author: string;
  publishedOn: string | null;
};

export type Post = PostSummary & { body: string; tags: string; views: number };

export type ResearchSummary = {
  id: number;
  title: string;
  topic: string;
  summary: string;
  tags: string;
  createdAt: string;
};

type Page<T> = { items: T[]; total: number };

/**
 * The marketing pages must render even when the API is down — a visitor
 * should meet the chamber's address and telephone number, not an error.
 * Anything optional therefore resolves to an empty result rather than
 * throwing.
 */
async function soft<T>(work: Promise<T>, fallback: T): Promise<T> {
  try {
    return await work;
  } catch {
    return fallback;
  }
}

export function getSettings(): Promise<SiteSettings> {
  return soft(apiFetch<SiteSettings>("/api/site/settings"), {});
}

export function getTestimonials(): Promise<Testimonial[]> {
  return soft(
    apiFetch<{ items: Testimonial[] }>("/api/site/testimonials").then((r) => r.items),
    []
  );
}

export function getPosts(params: { q?: string; category?: string; limit?: number } = {}) {
  const query = new URLSearchParams();
  if (params.q) query.set("q", params.q);
  if (params.category) query.set("category", params.category);
  if (params.limit) query.set("limit", String(params.limit));

  return soft(
    apiFetch<Page<PostSummary> & { categories: string[] }>(`/api/site/posts?${query}`),
    { items: [], total: 0, categories: [] }
  );
}

/** Throws on 404 so the page can call notFound(). */
export function getPost(slug: string): Promise<Post> {
  return apiFetch<Post>(`/api/site/posts/${encodeURIComponent(slug)}`);
}

export function getResearch(params: { q?: string; limit?: number } = {}) {
  const query = new URLSearchParams();
  if (params.q) query.set("q", params.q);
  if (params.limit) query.set("limit", String(params.limit));

  return soft(apiFetch<Page<ResearchSummary>>(`/api/library/research?${query}`), {
    items: [],
    total: 0,
  });
}

export function getLibraryCounts() {
  return soft(
    apiFetch<{ judgments: number; research: number; media: number }>("/api/library/counts"),
    { judgments: 0, research: 0, media: 0 }
  );
}

/** 14 March 2026 — the long form, for a page that is read rather than scanned. */
export function formatLongDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

/** A wa.me link, or null when no WhatsApp number has been set. */
export function whatsappHref(settings: SiteSettings): string | null {
  const raw = settings["contact.whatsapp"]?.trim();
  if (!raw) return null;

  // wa.me wants digits only, in international form.
  const digits = raw.replace(/[^\d]/g, "");
  if (digits.length < 8) return null;

  const message = settings["contact.whatsappMessage"]?.trim();
  return `https://wa.me/${digits}${message ? `?text=${encodeURIComponent(message)}` : ""}`;
}

export type PublicChamber = {
  slug: string;
  name: string;
  /** "active" | "suspended". Never why. */
  status: string;
};

/**
 * A chamber by the slug in its client sign-in link, or null if there is no
 * active chamber by that name.
 *
 * The page it brands is the one an advocate sends their clients to, so
 * getting the name onto it matters: a sign-in page carrying nobody's name
 * is exactly what a phishing copy of it would also look like.
 */
export async function getChamber(slug: string): Promise<PublicChamber | null> {
  try {
    return await apiFetch<PublicChamber>(`/api/site/chambers/${encodeURIComponent(slug)}`);
  } catch {
    return null;
  }
}

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "./api";

export type ResearchSummary = {
  id: number;
  title: string;
  topic: string;
  summary: string;
  tags: string;
  createdAt: string;
};

export type ResearchArticle = ResearchSummary & {
  body: string;
};

export type JudgmentSummary = {
  id: number;
  title: string;
  citation: string;
  court: string;
  judgmentDate: string | null;
  principle: string;
  tags: string;
};

export type LibraryCounts = {
  judgments: number;
  research: number;
  media: number;
};

type Page<T> = { items: T[]; total: number; limit: number; offset: number };

export function useLibraryCounts() {
  return useQuery({
    queryKey: ["library", "counts"],
    queryFn: () => apiFetch<LibraryCounts>("/api/library/counts"),
  });
}

export function useResearch(q: string) {
  return useQuery({
    queryKey: ["library", "research", q],
    queryFn: () =>
      apiFetch<Page<ResearchSummary>>(
        `/api/library/research?q=${encodeURIComponent(q)}&limit=50`
      ),
  });
}

export function useResearchArticle(id: number) {
  return useQuery({
    queryKey: ["library", "research", "item", id],
    queryFn: () => apiFetch<ResearchArticle>(`/api/library/research/${id}`),
  });
}

export function useJudgments(q: string) {
  return useQuery({
    queryKey: ["library", "judgments", q],
    queryFn: () =>
      apiFetch<Page<JudgmentSummary>>(
        `/api/library/judgments?q=${encodeURIComponent(q)}&limit=50`
      ),
  });
}

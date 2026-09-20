"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "./api";

/**
 * The platform console.
 *
 * Everything here is chamber metadata and counts. There is deliberately no
 * hook that fetches another chamber's clients, cases or messages, because
 * there is no endpoint that would answer one — see the API's own notes in
 * backend/src/lib/platform-stats.ts.
 */

export type ChamberSummary = {
  id: number;
  slug: string;
  name: string;
  status: "active" | "suspended";
  suspendedReason: string;
  verified: boolean;
  enrolmentNo: string;
  createdAt: string;
  counts: { staff: number; clients: number; cases: number };
  lastActivityAt: string | null;
};

export type PlatformTotals = {
  chambers: number;
  active: number;
  suspended: number;
  verified: number;
  staff: number;
  clients: number;
  cases: number;
  /** Library entries chambers have offered and nobody has answered. */
  pending: number;
};

export type PlatformAction = {
  id: number;
  actorEmail: string;
  action: "verify" | "unverify" | "suspend" | "restore";
  firmIdActedOn: number;
  firmSlug: string;
  reason: string;
  createdAt: string;
};

export type Overview = {
  totals: PlatformTotals;
  items: ChamberSummary[];
  total: number;
  actions: PlatformAction[];
  limit: number;
  offset: number;
};

export type ChamberFilters = { q: string; status: string; verified: string };

const KEY = (f: ChamberFilters) => ["platform", "overview", f] as const;

export function useOverview(filters: ChamberFilters) {
  return useQuery({
    queryKey: KEY(filters),
    queryFn: () => {
      const params = new URLSearchParams();
      if (filters.q) params.set("q", filters.q);
      if (filters.status) params.set("status", filters.status);
      if (filters.verified) params.set("verified", filters.verified);
      const qs = params.toString();
      return apiFetch<Overview>(`/api/platform/overview${qs ? `?${qs}` : ""}`);
    },
  });
}

/** Every action refetches the console, so what is on screen is what is true. */
function useAction<TBody>(run: (body: TBody) => Promise<unknown>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: run,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["platform"] });
    },
  });
}

export function useSetVerified(id: number) {
  return useAction<{ verified: boolean; note: string }>((body) =>
    apiFetch(`/api/platform/chambers/${id}/verified`, {
      method: "PATCH",
      body: JSON.stringify(body),
    })
  );
}

export function useSuspendChamber(id: number) {
  return useAction<{ reason: string }>((body) =>
    apiFetch(`/api/platform/chambers/${id}/suspend`, {
      method: "POST",
      body: JSON.stringify(body),
    })
  );
}

export function useRestoreChamber(id: number) {
  return useAction<void>(() =>
    apiFetch(`/api/platform/chambers/${id}/restore`, { method: "POST" })
  );
}

// ---------------------------------------------------------------------------
// The shared library's moderation queue
// ---------------------------------------------------------------------------

export type Submission = {
  kind: "judgment" | "research" | "media";
  id: number;
  title: string;
  citation: string;
  court: string;
  principle: string;
  summary: string;
  tags: string;
  sourceUrl: string;
  submittedBy: string;
  shareState: string;
  shareNote: string;
  chamber: { id: number; name: string; slug: string; verified: boolean };
};

export function useSubmissions(state: "pending" | "approved" | "rejected") {
  return useQuery({
    queryKey: ["platform", "submissions", state],
    queryFn: () => apiFetch<{ items: Submission[] }>(`/api/platform/submissions?state=${state}`),
  });
}

/** Approving or turning down one entry. Never in bulk: each is read. */
export function useModerate(kind: Submission["kind"], id: number) {
  return useAction<{ approve: boolean; note: string }>((body) =>
    apiFetch(`/api/platform/submissions/${kind}/${id}`, {
      method: "POST",
      body: JSON.stringify(body),
    })
  );
}

/** Taking an approved entry back out. It returns to its chamber, not deleted. */
export function useWithdrawShared(kind: Submission["kind"], id: number) {
  return useAction<{ note: string }>((body) =>
    apiFetch(`/api/platform/submissions/${kind}/${id}/withdraw`, {
      method: "POST",
      body: JSON.stringify({ approve: false, ...body }),
    })
  );
}

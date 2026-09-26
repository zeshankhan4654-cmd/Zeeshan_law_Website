import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "./api";
import type { Fees } from "./portal";
import { useAuthToken } from "./session";

/** One matter listed for a day. */
export type DiaryHearing = {
  id: number;
  purpose: string;
  recorded: boolean;
  caseId: number;
  caseTitle: string;
  court: string;
  status: string;
  clientName: string;
  clientPhone: string;
};

export type DiaryDay = { date: string; hearings: DiaryHearing[] };

export type OfficeCaseSummary = {
  id: number;
  title: string;
  court: string;
  caseType: string;
  status: string;
  nextHearing: string | null;
  client: { id: number; name: string };
};

export type OfficeHearing = {
  id: number;
  hearingDate: string;
  purpose: string;
  /** The office's own record of what happened. Never leaves the chamber. */
  outcome: string;
};

export type OfficeDocument = {
  id: number;
  title: string;
  origName: string;
  sizeBytes: number;
  clientVisible: boolean;
  createdAt: string;
};

export type OfficeMessage = {
  id: number;
  authorType: "client" | "office";
  authorName: string;
  body: string;
  hasVoiceNote: boolean;
  answered: boolean;
  createdAt: string;
};

export type OfficeCaseFile = {
  id: number;
  title: string;
  court: string;
  caseType: string;
  status: string;
  nextHearing: string | null;
  /** The chamber's working note on the matter. */
  notes: string;
  createdAt: string;
  client: { id: number; name: string; phone: string; email: string; portalEnabled: boolean };
  hearings: OfficeHearing[];
  updates: { id: number; updateDate: string; message: string; author: string }[];
  documents: OfficeDocument[];
  messages: OfficeMessage[];
  fees: Fees;
};

export type UnansweredMessage = {
  id: number;
  body: string;
  hasVoiceNote: boolean;
  createdAt: string;
  clientName: string;
  caseId: number;
  caseTitle: string;
};

export function useDiary(days = 14) {
  const token = useAuthToken();
  return useQuery({
    queryKey: ["office", "diary", days],
    queryFn: () => apiFetch<{ days: DiaryDay[] }>(`/api/office/diary?days=${days}`, { token }),
    enabled: token !== null,
  });
}

export function useOfficeCases(q: string) {
  const token = useAuthToken();
  return useQuery({
    queryKey: ["office", "cases", q],
    queryFn: () =>
      apiFetch<{ items: OfficeCaseSummary[]; total: number }>(
        `/api/office/cases?q=${encodeURIComponent(q)}`,
        { token }
      ),
    enabled: token !== null,
  });
}

export function useOfficeCase(id: number) {
  const token = useAuthToken();
  return useQuery({
    queryKey: ["office", "case", id],
    queryFn: () => apiFetch<OfficeCaseFile>(`/api/office/cases/${id}`, { token }),
    enabled: token !== null && Number.isInteger(id),
  });
}

export function useUnanswered() {
  const token = useAuthToken();
  return useQuery({
    queryKey: ["office", "unanswered"],
    queryFn: () => apiFetch<{ items: UnansweredMessage[] }>("/api/office/messages/unanswered", { token }),
    enabled: token !== null,
  });
}

/** Everything that changes a case file invalidates the same two queries. */
function useCaseMutation<TArgs>(caseId: number, run: (token: string | null, args: TArgs) => Promise<unknown>) {
  const token = useAuthToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: TArgs) => run(token, args),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["office", "case", caseId] });
      void queryClient.invalidateQueries({ queryKey: ["office", "unanswered"] });
      void queryClient.invalidateQueries({ queryKey: ["office", "diary"] });
    },
  });
}

export function usePostUpdate(caseId: number) {
  return useCaseMutation<string>(caseId, (token, message) =>
    apiFetch(`/api/office/cases/${caseId}/updates`, {
      method: "POST",
      token,
      body: JSON.stringify({ message }),
    })
  );
}

export function useReplyToClient(caseId: number) {
  return useCaseMutation<string>(caseId, (token, body) =>
    apiFetch(`/api/office/cases/${caseId}/messages`, {
      method: "POST",
      token,
      body: JSON.stringify({ body }),
    })
  );
}

export function useRecordOutcome(caseId: number) {
  return useCaseMutation<{ hearingId: number; outcome: string }>(caseId, (token, { hearingId, outcome }) =>
    apiFetch(`/api/office/hearings/${hearingId}/outcome`, {
      method: "POST",
      token,
      body: JSON.stringify({ outcome }),
    })
  );
}

/** "Today", "Tomorrow", or "Mon 5 Oct" — how a cause list is actually read. */
export function dayHeading(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return isoDate;

  const today = new Date();
  const startOfDay = (x: Date) => Date.UTC(x.getUTCFullYear(), x.getUTCMonth(), x.getUTCDate());
  const days = Math.round((startOfDay(d) - startOfDay(today)) / 86_400_000);

  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

// ---------------------------------------------------------------------------
// Opening and changing a matter
// ---------------------------------------------------------------------------

export type CaseDraft = {
  title: string;
  court: string;
  caseType: string;
  status: string;
  /** YYYY-MM-DD, or "" for a matter with nothing listed yet. */
  nextHearing: string;
  notes: string;
};

export function useCreateCase() {
  const token = useAuthToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CaseDraft & { clientId: number }) =>
      apiFetch<{ id: number }>("/api/office/cases", {
        method: "POST",
        token,
        body: JSON.stringify({ ...body, nextHearing: body.nextHearing || null }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["office", "cases"] });
      void queryClient.invalidateQueries({ queryKey: ["office", "diary"] });
      void queryClient.invalidateQueries({ queryKey: ["office", "clients"] });
    },
  });
}

export function useEditCase(caseId: number) {
  const token = useAuthToken();
  const queryClient = useQueryClient();
  return useMutation({
    // The client cannot be changed here, and the API forbids it: a matter
    // that moved to another client would be a different matter.
    mutationFn: (body: CaseDraft) =>
      apiFetch<{ id: number }>(`/api/office/cases/${caseId}`, {
        method: "PATCH",
        token,
        body: JSON.stringify({ ...body, nextHearing: body.nextHearing || null }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["office", "case", caseId] });
      void queryClient.invalidateQueries({ queryKey: ["office", "cases"] });
      void queryClient.invalidateQueries({ queryKey: ["office", "diary"] });
    },
  });
}

export function useAddHearing(caseId: number) {
  return useCaseMutation<{ hearingDate: string; purpose: string; setAsNext: boolean }>(
    caseId,
    (token, body) =>
      apiFetch(`/api/office/cases/${caseId}/hearings`, {
        method: "POST",
        token,
        body: JSON.stringify(body),
      })
  );
}

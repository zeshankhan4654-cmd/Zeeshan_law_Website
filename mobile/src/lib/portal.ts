import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { API_URL, apiFetch, ApiError } from "./api";
import { useAuthToken } from "./session";

/** Everything a client can see of one of their matters. */
export type CaseSummary = {
  id: number;
  title: string;
  court: string;
  caseType: string;
  status: string;
  nextHearing: string | null;
  messageCount: number;
  documentCount: number;
};

export type Hearing = { id: number; hearingDate: string; purpose: string };
export type CaseUpdate = { id: number; updateDate: string; message: string; author: string };
export type CaseDocument = {
  id: number;
  title: string;
  origName: string;
  sizeBytes: number;
  createdAt: string;
};

export type Fees =
  | { shown: false }
  | {
      shown: true;
      agreed: number;
      received: number;
      entries: { id: number; kind: string; amount: number; entryDate: string; note: string }[];
    };

export type CaseDetail = Omit<CaseSummary, "messageCount" | "documentCount"> & {
  createdAt: string;
  hearings: Hearing[];
  updates: CaseUpdate[];
  documents: CaseDocument[];
  fees: Fees;
};

export type CaseMessage = {
  id: number;
  authorType: "client" | "office";
  authorName: string;
  body: string;
  hasVoiceNote: boolean;
  answered: boolean;
  createdAt: string;
};

export function useCases() {
  const token = useAuthToken();
  return useQuery({
    queryKey: ["portal", "cases"],
    queryFn: () => apiFetch<{ items: CaseSummary[] }>("/api/portal/cases", { token }),
    enabled: token !== null,
  });
}

export function useCase(id: number) {
  const token = useAuthToken();
  return useQuery({
    queryKey: ["portal", "case", id],
    queryFn: () => apiFetch<CaseDetail>(`/api/portal/cases/${id}`, { token }),
    enabled: token !== null && Number.isInteger(id),
  });
}

export function useCaseMessages(caseId: number) {
  const token = useAuthToken();
  return useQuery({
    queryKey: ["portal", "messages", caseId],
    queryFn: () => apiFetch<{ items: CaseMessage[] }>(`/api/portal/cases/${caseId}/messages`, { token }),
    enabled: token !== null && Number.isInteger(caseId),
  });
}

export function useSendMessage(caseId: number) {
  const token = useAuthToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: string) =>
      apiFetch<CaseMessage>(`/api/portal/cases/${caseId}/messages`, {
        method: "POST",
        token,
        body: JSON.stringify({ body }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["portal", "messages", caseId] }),
  });
}

/**
 * Sending a recording, which cannot go through `apiFetch`: multipart needs
 * FormData and must *not* carry a JSON content-type — the boundary is chosen
 * by the runtime, so setting the header by hand breaks the upload.
 */
export function useSendVoiceNote(caseId: number) {
  const token = useAuthToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ uri, note }: { uri: string; note: string }) => {
      const form = new FormData();
      const name = uri.split("/").pop() ?? "voice-note.m4a";
      // React Native's FormData takes this shape for a local file.
      form.append("audio", { uri, name, type: "audio/m4a" } as unknown as Blob);
      if (note) form.append("body", note);

      const res = await fetch(`${API_URL}/api/portal/cases/${caseId}/messages/voice`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({ error: res.statusText }));
        throw new ApiError(res.status, payload.error ?? "Could not send the recording.");
      }
      return (await res.json()) as CaseMessage;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["portal", "messages", caseId] }),
  });
}

/** Where a voice note is played back from. Needs the bearer token. */
export function voiceNoteUrl(messageId: number): string {
  return `${API_URL}/api/portal/messages/${messageId}/audio`;
}

/** 25 Dec 2026 — unambiguous, which matters for a hearing date. */
export function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/** "in 11 days" / "today" / "24 days ago", for a date the client cares about. */
export function relativeDay(iso: string | null): string | null {
  if (!iso) return null;
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return null;

  const startOfDay = (d: Date) => Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  const days = Math.round((startOfDay(then) - startOfDay(new Date())) / 86_400_000);

  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days === -1) return "yesterday";
  return days > 0 ? `in ${days} days` : `${-days} days ago`;
}

export function formatRupees(amount: number): string {
  return `Rs ${amount.toLocaleString("en-PK")}`;
}

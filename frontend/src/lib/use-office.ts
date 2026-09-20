"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { apiFetch } from "./api";

/**
 * Office writes.
 *
 * Each returns a mutation whose success refreshes the current route, so the
 * Server Component that rendered the page re-runs and shows the new state —
 * no second copy of the data kept on the client to fall out of step.
 */
function useRefreshingMutation<TArgs, TResult>(run: (args: TArgs) => Promise<TResult>) {
  const router = useRouter();
  return useMutation({
    mutationFn: run,
    onSuccess: () => router.refresh(),
  });
}

export type ClientFields = {
  name: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
};

export function useSaveClient(id?: number) {
  return useRefreshingMutation<ClientFields, { id: number }>((fields) =>
    apiFetch(id ? `/api/office/clients/${id}` : "/api/office/clients", {
      method: id ? "PATCH" : "POST",
      body: JSON.stringify(fields),
    })
  );
}

export type PortalAccessResult = { enabled: boolean; username?: string; password?: string | null };

export function useSetPortalAccess(clientId: number) {
  return useRefreshingMutation<
    { enabled: boolean; showFees: boolean; resetPassword?: boolean },
    PortalAccessResult
  >((body) =>
    apiFetch(`/api/office/clients/${clientId}/portal`, {
      method: "POST",
      body: JSON.stringify(body),
    })
  );
}

export type CaseFields = {
  clientId?: number;
  title: string;
  court: string;
  caseType: string;
  status: string;
  nextHearing: string | null;
  notes: string;
};

export function useSaveCase(id?: number) {
  return useRefreshingMutation<CaseFields, { id: number }>((fields) =>
    apiFetch(id ? `/api/office/cases/${id}` : "/api/office/cases", {
      method: id ? "PATCH" : "POST",
      body: JSON.stringify(fields),
    })
  );
}

export function useAddHearing(caseId: number) {
  return useRefreshingMutation<{ hearingDate: string; purpose: string }, unknown>((body) =>
    apiFetch(`/api/office/cases/${caseId}/hearings`, {
      method: "POST",
      body: JSON.stringify(body),
    })
  );
}

export function useRecordOutcome(hearingId: number) {
  return useRefreshingMutation<string, unknown>((outcome) =>
    apiFetch(`/api/office/hearings/${hearingId}/outcome`, {
      method: "POST",
      body: JSON.stringify({ outcome }),
    })
  );
}

export function usePostUpdate(caseId: number) {
  return useRefreshingMutation<string, unknown>((message) =>
    apiFetch(`/api/office/cases/${caseId}/updates`, {
      method: "POST",
      body: JSON.stringify({ message }),
    })
  );
}

export function useReplyToClient(caseId: number) {
  return useRefreshingMutation<string, unknown>((body) =>
    apiFetch(`/api/office/cases/${caseId}/messages`, {
      method: "POST",
      body: JSON.stringify({ body }),
    })
  );
}

export function useAddFee(caseId: number) {
  return useRefreshingMutation<{ kind: string; amount: number; note: string }, unknown>((body) =>
    apiFetch(`/api/office/cases/${caseId}/fees`, { method: "POST", body: JSON.stringify(body) })
  );
}

export function useRemoveFee() {
  return useRefreshingMutation<number, unknown>((id) =>
    apiFetch(`/api/office/fees/${id}`, { method: "DELETE" })
  );
}

export function useShareDocument() {
  return useRefreshingMutation<{ id: number; clientVisible: boolean }, unknown>(({ id, clientVisible }) =>
    apiFetch(`/api/office/documents/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ clientVisible }),
    })
  );
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

/** Multipart, so it cannot go through apiFetch — the browser sets the boundary. */
export function useUploadDocument(caseId: number) {
  return useRefreshingMutation<{ file: File; title: string; clientVisible: boolean }, unknown>(
    async ({ file, title, clientVisible }) => {
      const form = new FormData();
      form.append("file", file);
      form.append("title", title);
      form.append("clientVisible", String(clientVisible));

      const res = await fetch(`${API_URL}/api/office/cases/${caseId}/documents`, {
        method: "POST",
        credentials: "include",
        body: form,
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(payload.error ?? "That did not upload.");
      }
      return res.json();
    }
  );
}

export function useMarkEnquiryRead(id: number) {
  return useRefreshingMutation<boolean, unknown>((read) =>
    apiFetch(`/api/office/enquiries/${id}`, { method: "PATCH", body: JSON.stringify({ read }) })
  );
}

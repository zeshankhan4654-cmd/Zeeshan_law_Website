"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { apiFetch } from "./api";

function useRefreshing<TArgs, TResult>(run: (args: TArgs) => Promise<TResult>) {
  const router = useRouter();
  return useMutation({ mutationFn: run, onSuccess: () => router.refresh() });
}

export type CommunicationFields = {
  clientId: number | null;
  method: string;
  summary: string;
  commDate: string;
  followUpDue: string | null;
};

export function useSaveCommunication(id?: number) {
  return useRefreshing<CommunicationFields, unknown>((fields) =>
    apiFetch(id ? `/api/office/communications/${id}` : "/api/office/communications", {
      method: id ? "PATCH" : "POST",
      body: JSON.stringify({ ...fields, followUpDue: fields.followUpDue || null }),
    })
  );
}

export function useDeleteCommunication() {
  return useRefreshing<number, unknown>((id) =>
    apiFetch(`/api/office/communications/${id}`, { method: "DELETE" })
  );
}

export function useAddOfficialFee() {
  return useRefreshing<
    { caseId: number | null; kind: string; amount: number; entryDate: string; note: string },
    unknown
  >((body) => apiFetch("/api/office/official-fees", { method: "POST", body: JSON.stringify(body) }));
}

export function useDeleteOfficialFee() {
  return useRefreshing<number, unknown>((id) =>
    apiFetch(`/api/office/official-fees/${id}`, { method: "DELETE" })
  );
}

export function useAddExpense() {
  return useRefreshing<
    { category: string; amount: number; expenseDate: string; description: string },
    unknown
  >((body) => apiFetch("/api/office/expenses", { method: "POST", body: JSON.stringify(body) }));
}

export function useDeleteExpense() {
  return useRefreshing<number, unknown>((id) =>
    apiFetch(`/api/office/expenses/${id}`, { method: "DELETE" })
  );
}

/** One hook for all three library kinds — they differ only in their fields. */
export type LibraryKind = "judgments" | "research" | "media";

export function useSaveLibraryEntry(kind: LibraryKind, id?: number) {
  return useRefreshing<Record<string, unknown>, unknown>((fields) =>
    apiFetch(id ? `/api/office/library/${kind}/${id}` : `/api/office/library/${kind}`, {
      method: id ? "PATCH" : "POST",
      body: JSON.stringify(fields),
    })
  );
}

export function useDeleteLibraryEntry(kind: LibraryKind) {
  return useRefreshing<number, unknown>((id) =>
    apiFetch(`/api/office/library/${kind}/${id}`, { method: "DELETE" })
  );
}

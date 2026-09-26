import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "./api";
import { useAuthToken } from "./session";

/** A client as the list shows them: enough to recognise and to ring. */
export type ClientSummary = {
  id: number;
  name: string;
  phone: string;
  email: string;
  portalEnabled: boolean;
  portalUsername: string | null;
  caseCount: number;
};

export type ClientCase = {
  id: number;
  title: string;
  court: string;
  status: string;
  nextHearing: string | null;
};

export type ClientFile = {
  id: number;
  name: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
  portalEnabled: boolean;
  portalUsername: string | null;
  portalShowFees: boolean;
  portalMustChangePassword: boolean;
  createdAt: string;
  cases: ClientCase[];
};

export type NewClient = {
  name: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
};

/**
 * What the office gets back after switching a client's access on.
 *
 * `password` is null when access was merely re-enabled and the client's own
 * password left alone — there is nothing new to read out, and inventing
 * something to show would be worse than showing nothing.
 */
export type PortalResult = {
  enabled: boolean;
  username?: string;
  password?: string | null;
};

export function useClients(q: string) {
  const token = useAuthToken();
  return useQuery({
    queryKey: ["office", "clients", q],
    queryFn: () =>
      apiFetch<{ items: ClientSummary[]; total: number }>(
        `/api/office/clients?q=${encodeURIComponent(q)}`,
        { token }
      ),
    enabled: token !== null,
  });
}

export function useClient(id: number) {
  const token = useAuthToken();
  return useQuery({
    queryKey: ["office", "client", id],
    queryFn: () => apiFetch<ClientFile>(`/api/office/clients/${id}`, { token }),
    enabled: token !== null && Number.isInteger(id),
  });
}

export function useCreateClient() {
  const token = useAuthToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: NewClient) =>
      apiFetch<ClientSummary>("/api/office/clients", {
        method: "POST",
        token,
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["office", "clients"] });
    },
  });
}

export function useSetPortalAccess(clientId: number) {
  const token = useAuthToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { enabled: boolean; showFees: boolean; resetPassword: boolean }) =>
      apiFetch<PortalResult>(`/api/office/clients/${clientId}/portal`, {
        method: "POST",
        token,
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["office", "client", clientId] });
      void queryClient.invalidateQueries({ queryKey: ["office", "clients"] });
    },
  });
}

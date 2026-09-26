import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "./api";
import { useAuthToken } from "./session";

/**
 * Two things that both amount to "somebody spoke to the chamber".
 *
 * A communication is the chamber's own record of a call, a meeting or a
 * message — written by whoever took it. An enquiry arrives by itself, from
 * a stranger filling in the form on the public site.
 *
 * They meet at the point that matters: something was said, and somebody has
 * to answer it.
 */

export type CommMethod = "call" | "email" | "in_person" | "letter" | "whatsapp";

export const METHOD_LABEL: Record<CommMethod, string> = {
  call: "Telephone",
  in_person: "In person",
  whatsapp: "WhatsApp",
  email: "Email",
  letter: "Letter",
};

export type Communication = {
  id: number;
  method: CommMethod;
  summary: string;
  commDate: string;
  followUpDue: string | null;
  createdAt: string;
  client: { id: number; name: string } | null;
};

export type Enquiry = {
  id: number;
  name: string;
  phone: string;
  email: string;
  subject: string;
  message: string;
  read: boolean;
  createdAt: string;
};

export function useCommunications() {
  const token = useAuthToken();
  return useQuery({
    queryKey: ["office", "comms"],
    queryFn: () =>
      apiFetch<{ items: Communication[]; due: number }>("/api/office/communications", { token }),
    enabled: token !== null,
  });
}

export function useLogCommunication() {
  const token = useAuthToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      clientId: number | null;
      method: CommMethod;
      summary: string;
      commDate: string;
      followUpDue: string | null;
    }) =>
      apiFetch<{ id: number }>("/api/office/communications", {
        method: "POST",
        token,
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["office", "comms"] });
    },
  });
}

export function useEnquiries() {
  const token = useAuthToken();
  return useQuery({
    queryKey: ["office", "enquiries"],
    queryFn: () => apiFetch<{ items: Enquiry[]; unread: number }>("/api/office/enquiries", { token }),
    enabled: token !== null,
  });
}

export function useMarkEnquiry(id: number) {
  const token = useAuthToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (read: boolean) =>
      apiFetch<void>(`/api/office/enquiries/${id}`, {
        method: "PATCH",
        token,
        body: JSON.stringify({ read }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["office", "enquiries"] });
    },
  });
}

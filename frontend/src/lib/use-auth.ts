"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch, ApiError } from "./api";

export type SessionUser = {
  id: number;
  username: string;
  fullName: string;
  role: string;
  mustChangePassword: boolean;
  /** null means "every capability" — the Principal role. */
  capabilities: string[] | null;
};

const ME_KEY = ["auth", "me"] as const;

/**
 * The signed-in user, or null when there isn't one. A 401 here is an
 * expected, normal outcome — "nobody is signed in" — not a query failure,
 * so it resolves successfully with null rather than entering an error state
 * that every caller would otherwise have to special-case.
 */
export function useMe() {
  return useQuery({
    queryKey: ME_KEY,
    queryFn: async (): Promise<SessionUser | null> => {
      try {
        return await apiFetch<SessionUser>("/api/auth/me");
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) return null;
        throw err;
      }
    },
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { username: string; password: string }) =>
      apiFetch<SessionUser>("/api/auth/login", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: (user) => {
      queryClient.setQueryData(ME_KEY, user);
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch<void>("/api/auth/logout", { method: "POST" }),
    onSuccess: () => {
      queryClient.setQueryData(ME_KEY, null);
    },
  });
}

export function useChangePassword() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { currentPassword: string; newPassword: string }) =>
      apiFetch<void>("/api/auth/change-password", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ME_KEY });
    },
  });
}

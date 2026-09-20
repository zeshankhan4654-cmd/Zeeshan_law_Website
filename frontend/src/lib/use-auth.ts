"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch, ApiError } from "./api";

export type SessionUser = {
  id: number;
  /** What they sign in with. */
  email: string;
  /** The handle inside the chamber — what signs a case update. */
  username: string;
  fullName: string;
  role: string;
  mustChangePassword: boolean;
  /**
   * True while the address is one the migration wrote for an account that
   * pre-dates email sign-in. It works, but nothing can be sent to it, so
   * the office asks its holder to replace it.
   */
  emailIsPlaceholder: boolean;
  /** null means "every capability" — the Principal role. */
  capabilities: string[] | null;
  /** The chamber this session is in. */
  chamber: Chamber | null;
  /**
   * Runs the platform itself, not merely this chamber. Only decides whether
   * the office shows a link to the console — the console re-checks against
   * the database on every request of its own.
   */
  platformAdmin: boolean;
};

export type Chamber = {
  slug: string;
  name: string;
  /** Whether the platform has checked that this really is an advocate. */
  verified: boolean;
  /** The link this chamber gives its clients. */
  clientLoginPath: string;
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
    mutationFn: (body: { email: string; password: string }) =>
      apiFetch<SessionUser>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: body.email.trim().toLowerCase(), password: body.password }),
      }),
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

/** Replacing the address you sign in with. Needs the password, not just the session. */
export function useChangeEmail() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { password: string; email: string }) =>
      apiFetch<void>("/api/auth/change-email", {
        method: "POST",
        body: JSON.stringify({ password: body.password, email: body.email.trim().toLowerCase() }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ME_KEY });
    },
  });
}

export type NewChamber = SessionUser & { chamber: Chamber };

/**
 * An advocate registering their own chamber — the one place on the platform
 * where somebody creates their own account. What it creates is a new, empty
 * chamber; it is not a way into anybody else's.
 */
export function useSignup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      fullName: string;
      chamberName: string;
      email: string;
      password: string;
      enrolmentNo: string;
    }) =>
      apiFetch<NewChamber>("/api/signup", {
        method: "POST",
        body: JSON.stringify({ ...body, email: body.email.trim().toLowerCase() }),
      }),
    onSuccess: (created) => {
      queryClient.setQueryData(ME_KEY, created);
    },
  });
}

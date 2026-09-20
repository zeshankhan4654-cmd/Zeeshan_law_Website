"use client";

import { useMutation } from "@tanstack/react-query";
import { apiFetch } from "./api";
import type { PortalClient } from "./portal-session";

/**
 * The client portal's own sign-in. A separate endpoint, a separate cookie
 * and a separate token kind from the office's — see the API's own notes on
 * why a client token must never be usable as a staff one.
 */
export function usePortalLogin() {
  return useMutation({
    mutationFn: (credentials: { username: string; password: string }) =>
      apiFetch<PortalClient & { token: string }>("/api/portal/login", {
        method: "POST",
        body: JSON.stringify({
          username: credentials.username.trim().toLowerCase(),
          password: credentials.password,
        }),
      }),
  });
}

export function usePortalChangePassword() {
  return useMutation({
    mutationFn: (passwords: { currentPassword: string; newPassword: string }) =>
      apiFetch<void>("/api/portal/change-password", {
        method: "POST",
        body: JSON.stringify(passwords),
      }),
  });
}

export function usePortalLogout() {
  return useMutation({
    mutationFn: () => apiFetch<void>("/api/portal/logout", { method: "POST" }),
  });
}

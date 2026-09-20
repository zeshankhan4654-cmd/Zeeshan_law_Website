"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { apiFetch } from "./api";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

function useRefreshing<TArgs, TResult>(run: (args: TArgs) => Promise<TResult>) {
  const router = useRouter();
  return useMutation({ mutationFn: run, onSuccess: () => router.refresh() });
}

export function useSaveSettings() {
  return useRefreshing<Record<string, string>, Record<string, string>>((settings) =>
    apiFetch("/api/office/settings", { method: "PUT", body: JSON.stringify(settings) })
  );
}

export type TestimonialFields = {
  author: string;
  role: string;
  body: string;
  rating: number;
  source: string;
  sourceUrl: string;
  published: boolean;
  sortOrder: number;
};

export function useSaveTestimonial(id?: number) {
  return useRefreshing<TestimonialFields, unknown>((fields) =>
    apiFetch(id ? `/api/office/testimonials/${id}` : "/api/office/testimonials", {
      method: id ? "PATCH" : "POST",
      body: JSON.stringify(fields),
    })
  );
}

export function useDeleteTestimonial() {
  return useRefreshing<number, unknown>((id) =>
    apiFetch(`/api/office/testimonials/${id}`, { method: "DELETE" })
  );
}

export type PostFields = {
  title: string;
  slug: string;
  summary: string;
  body: string;
  category: string;
  tags: string;
  published: boolean;
};

export function useSavePost(id?: number) {
  return useRefreshing<PostFields, { id: number; slug: string }>((fields) =>
    apiFetch(id ? `/api/office/posts/${id}` : "/api/office/posts", {
      method: id ? "PATCH" : "POST",
      body: JSON.stringify(fields),
    })
  );
}

export function useDeletePost() {
  return useRefreshing<number, unknown>((id) =>
    apiFetch(`/api/office/posts/${id}`, { method: "DELETE" })
  );
}

export function useUploadCover(postId: number) {
  return useRefreshing<File, { coverName: string }>(async (file) => {
    const form = new FormData();
    form.append("cover", file);

    const res = await fetch(`${API_URL}/api/office/posts/${postId}/cover`, {
      method: "POST",
      credentials: "include",
      body: form,
    });
    if (!res.ok) {
      const payload = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(payload.error ?? "That did not upload.");
    }
    return res.json();
  });
}

export function useCreateUser() {
  return useRefreshing<
    { fullName: string; username: string; email: string; role: string },
    { id: number; username: string; email: string; password: string }
  >((fields) =>
    apiFetch("/api/office/users", {
      method: "POST",
      body: JSON.stringify({ ...fields, email: fields.email.trim().toLowerCase() }),
    })
  );
}

export function useEditUser(id: number) {
  return useRefreshing<{ fullName: string; role: string }, unknown>((fields) =>
    apiFetch(`/api/office/users/${id}`, { method: "PATCH", body: JSON.stringify(fields) })
  );
}

export function useResetUserPassword(id: number) {
  return useRefreshing<void, { password: string }>(() =>
    apiFetch(`/api/office/users/${id}/password`, { method: "POST" })
  );
}

export function useDeleteUser(id: number) {
  return useRefreshing<void, unknown>(() =>
    apiFetch(`/api/office/users/${id}`, { method: "DELETE" })
  );
}

export function useSaveRoleCaps(roleKey: string) {
  return useRefreshing<string[], unknown>((caps) =>
    apiFetch(`/api/office/roles/${roleKey}/caps`, { method: "PUT", body: JSON.stringify({ caps }) })
  );
}

export function useCreateRole() {
  return useRefreshing<{ roleKey: string; label: string; description: string }, unknown>((fields) =>
    apiFetch("/api/office/roles", { method: "POST", body: JSON.stringify(fields) })
  );
}

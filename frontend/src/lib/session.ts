import { cookies } from "next/headers";
import "server-only";
import type { SessionUser } from "./use-auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

/**
 * The signed-in user, read on the server before a protected page renders —
 * not a client-side check that flashes protected content before redirecting.
 * A missing or expired cookie, or the backend being unreachable, all resolve
 * to null rather than throwing: the caller's job is simply to redirect.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const cookieHeader = jar.toString();
  if (!cookieHeader) return null;

  try {
    const res = await fetch(`${API_URL}/api/auth/me`, {
      headers: { Cookie: cookieHeader },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as SessionUser;
  } catch {
    return null;
  }
}

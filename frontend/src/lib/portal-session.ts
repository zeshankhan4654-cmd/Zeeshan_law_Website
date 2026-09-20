import { cookies } from "next/headers";
import "server-only";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export type PortalClient = {
  id: number;
  name: string;
  username: string;
  showFees: boolean;
  mustChangePassword: boolean;
};

/**
 * The signed-in client, read on the server before a portal page renders.
 *
 * The whole cookie jar is forwarded, and the API picks out `portal_session`
 * — the office's own cookie is called something else, which is why a
 * solicitor signed into the office in the same browser does not accidentally
 * authenticate as a client here, and vice versa.
 *
 * A missing cookie, an expired one, a portal the office has since switched
 * off, or the API being unreachable all resolve to null. The caller's job is
 * simply to redirect.
 */
export async function getPortalClient(): Promise<PortalClient | null> {
  const jar = await cookies();
  const cookieHeader = jar.toString();
  if (!cookieHeader) return null;

  try {
    const res = await fetch(`${API_URL}/api/portal/me`, {
      headers: { Cookie: cookieHeader },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as PortalClient;
  } catch {
    return null;
  }
}

/** A portal resource, fetched as the signed-in client. Null on any refusal. */
export async function portalFetch<T>(path: string): Promise<T | null> {
  const jar = await cookies();
  const cookieHeader = jar.toString();
  if (!cookieHeader) return null;

  try {
    const res = await fetch(`${API_URL}${path}`, {
      headers: { Cookie: cookieHeader },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

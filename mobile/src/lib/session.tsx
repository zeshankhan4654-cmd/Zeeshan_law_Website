import { useQueryClient } from "@tanstack/react-query";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { apiFetch, ApiError } from "./api";
import { deleteSecure, readSecure, writeSecure } from "./secure-store";

/**
 * Who is signed in, if anyone.
 *
 * The two audiences sign in at different endpoints and get tokens the API
 * will not accept for each other, so the kind travels with the token here
 * too — both to send each request to the right endpoint and so a screen can
 * say "clients only" without guessing.
 */
export type Audience = "client" | "staff";

export type Account =
  | { kind: "client"; id: number; name: string; username: string; showFees: boolean; mustChangePassword: boolean }
  | { kind: "staff"; id: number; fullName: string; username: string; role: string; mustChangePassword: boolean };

type Stored = { kind: Audience; token: string };

const TOKEN_KEY = "session";

type SessionState =
  | { status: "loading" }
  | { status: "signed-out" }
  | { status: "signed-in"; account: Account; token: string };

type SessionValue = SessionState & {
  signIn: (audience: Audience, username: string, password: string) => Promise<Account>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
};

const SessionContext = createContext<SessionValue | null>(null);

/** The endpoint pair each audience talks to. Everything else is identical. */
const ROUTES: Record<Audience, string> = { client: "/api/portal", staff: "/api/auth" };

type ClientMe = { id: number; name: string; username: string; showFees: boolean; mustChangePassword: boolean };
type StaffMe = { id: number; fullName: string; username: string; role: string; mustChangePassword: boolean };
type Me = ClientMe | StaffMe;

/** Built field by field rather than spread, so the token never ends up
 *  copied into an object that screens pass around. */
function toAccount(kind: Audience, data: Me): Account {
  if (kind === "client") {
    const c = data as ClientMe;
    return { kind, id: c.id, name: c.name, username: c.username, showFees: c.showFees, mustChangePassword: c.mustChangePassword };
  }
  const s = data as StaffMe;
  return { kind, id: s.id, fullName: s.fullName, username: s.username, role: s.role, mustChangePassword: s.mustChangePassword };
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<SessionState>({ status: "loading" });
  const queryClient = useQueryClient();

  const clear = useCallback(async () => {
    await deleteSecure(TOKEN_KEY);
    setState({ status: "signed-out" });
    // Anything fetched under the old identity must not survive into the next
    // one, signed in or not.
    queryClient.clear();
  }, [queryClient]);

  /** Ask the API who this token belongs to — the token may have expired, or
   *  the office may have switched the portal off since it was issued. */
  const load = useCallback(
    async (stored: Stored) => {
      try {
        const me = await apiFetch<Me>(`${ROUTES[stored.kind]}/me`, {
          token: stored.token,
        });
        setState({ status: "signed-in", account: toAccount(stored.kind, me), token: stored.token });
      } catch (err) {
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          await clear();
        } else {
          // A network failure is not a sign-out: the phone may simply be on
          // the way to court. Keep the token and let the screen retry.
          setState({ status: "signed-out" });
        }
      }
    },
    [clear]
  );

  // Restore the session on launch, before the first screen decides what to show.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const raw = await readSecure(TOKEN_KEY);
      if (cancelled) return;
      if (!raw) {
        setState({ status: "signed-out" });
        return;
      }
      try {
        await load(JSON.parse(raw) as Stored);
      } catch {
        await clear();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [load, clear]);

  const signIn = useCallback(
    async (audience: Audience, username: string, password: string) => {
      const data = await apiFetch<Me & { token: string }>(`${ROUTES[audience]}/login`, {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });
      const stored: Stored = { kind: audience, token: data.token };
      await writeSecure(TOKEN_KEY, JSON.stringify(stored));
      const account = toAccount(audience, data);
      setState({ status: "signed-in", account, token: data.token });
      return account;
    },
    []
  );

  const signOut = useCallback(async () => {
    const audience = state.status === "signed-in" ? state.account.kind : null;
    if (audience) {
      // Best effort: clearing the server cookie matters for the browser
      // target. The token is a bearer token, so what counts is dropping it.
      await apiFetch(`${ROUTES[audience]}/logout`, { method: "POST" }).catch(() => undefined);
    }
    await clear();
  }, [state, clear]);

  const refresh = useCallback(async () => {
    if (state.status !== "signed-in") return;
    await load({ kind: state.account.kind, token: state.token });
  }, [state, load]);

  const value = useMemo<SessionValue>(
    () => ({ ...state, signIn, signOut, refresh }),
    [state, signIn, signOut, refresh]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error("useSession must be used inside SessionProvider");
  return value;
}

/** The bearer token for an authenticated request, or null when signed out. */
export function useAuthToken(): string | null {
  const session = useSession();
  return session.status === "signed-in" ? session.token : null;
}

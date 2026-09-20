import { useQueryClient } from "@tanstack/react-query";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { apiFetch, ApiError } from "./api";
import { registerDevice, unregisterDevice } from "./push-registration";
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

/** The chamber a staff session belongs to. */
export type Chamber = {
  slug: string;
  name: string;
  verified: boolean;
  /** The path this chamber's clients sign in at. */
  clientLoginPath: string;
};

export type Account =
  | { kind: "client"; id: number; name: string; username: string; showFees: boolean; mustChangePassword: boolean }
  | {
      kind: "staff";
      id: number;
      /** What they sign in with. */
      email: string;
      /** Their handle inside the chamber — what signs a case update. */
      username: string;
      fullName: string;
      role: string;
      mustChangePassword: boolean;
      /** True while the address is a placeholder that cannot receive mail. */
      emailIsPlaceholder: boolean;
      /** null means the Principal, who holds every capability. */
      capabilities: string[] | null;
      chamber: Chamber | null;
    };

/**
 * What each audience signs in with.
 *
 * They differ because the people differ. An advocate has an email address
 * and it is unique across the platform, so no chamber need be named. A
 * client may well have no email at all — an elderly litigant very often
 * does not — so they keep a username, unique within their advocate's
 * chamber, and name the chamber from the link they were sent.
 */
export type Credentials =
  | { kind: "staff"; email: string; password: string }
  | { kind: "client"; firm: string; username: string; password: string };

type Stored = { kind: Audience; token: string };

const TOKEN_KEY = "session";

type SessionState =
  | { status: "loading" }
  | { status: "signed-out" }
  | { status: "signed-in"; account: Account; token: string };

type SessionValue = SessionState & {
  signIn: (credentials: Credentials) => Promise<Account>;
  /**
   * Adopts a token the API has just issued, without asking for the
   * password again. Used by registration, which is handed one.
   */
  signInWithToken: (audience: Audience, token: string) => Promise<Account>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
};

const SessionContext = createContext<SessionValue | null>(null);

/** The endpoint pair each audience talks to. Everything else is identical. */
const ROUTES: Record<Audience, string> = { client: "/api/portal", staff: "/api/auth" };

type ClientMe = { id: number; name: string; username: string; showFees: boolean; mustChangePassword: boolean };
type StaffMe = {
  id: number;
  email: string;
  fullName: string;
  username: string;
  role: string;
  mustChangePassword: boolean;
  emailIsPlaceholder: boolean;
  capabilities: string[] | null;
  chamber: Chamber | null;
};
type Me = ClientMe | StaffMe;

/** Built field by field rather than spread, so the token never ends up
 *  copied into an object that screens pass around. */
function toAccount(kind: Audience, data: Me): Account {
  if (kind === "client") {
    const c = data as ClientMe;
    return { kind, id: c.id, name: c.name, username: c.username, showFees: c.showFees, mustChangePassword: c.mustChangePassword };
  }
  const s = data as StaffMe;
  return {
    kind,
    id: s.id,
    email: s.email,
    fullName: s.fullName,
    username: s.username,
    role: s.role,
    mustChangePassword: s.mustChangePassword,
    emailIsPlaceholder: s.emailIsPlaceholder ?? false,
    capabilities: s.capabilities ?? null,
    chamber: s.chamber ?? null,
  };
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
    async (credentials: Credentials) => {
      const audience = credentials.kind;
      // The kind is how the app decides which endpoint to call; it is not
      // something the API is told, so it is dropped from the body.
      const { kind: _kind, ...body } = credentials;

      const data = await apiFetch<Me & { token: string }>(`${ROUTES[audience]}/login`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      const stored: Stored = { kind: audience, token: data.token };
      await writeSecure(TOKEN_KEY, JSON.stringify(stored));
      const account = toAccount(audience, data);
      setState({ status: "signed-in", account, token: data.token });

      // Not awaited: being reachable by notification is a convenience, and
      // must never hold up the sign-in that a person is waiting on.
      void registerDevice(audience, data.token);

      return account;
    },
    []
  );

  const signInWithToken = useCallback(async (audience: Audience, token: string) => {
    const me = await apiFetch<Me>(`${ROUTES[audience]}/me`, { token });
    await writeSecure(TOKEN_KEY, JSON.stringify({ kind: audience, token } satisfies Stored));

    const account = toAccount(audience, me);
    setState({ status: "signed-in", account, token });

    // Not awaited, as in signIn: notifications are a convenience and must
    // never hold up what somebody is waiting on.
    void registerDevice(audience, token);

    return account;
  }, []);

  const signOut = useCallback(async () => {
    const audience = state.status === "signed-in" ? state.account.kind : null;
    if (audience && state.status === "signed-in") {
      // Before the token goes: this call needs it, and a handset left
      // registered would keep receiving the previous holder's
      // notifications.
      await unregisterDevice(audience, state.token);
    }
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
    () => ({ ...state, signIn, signInWithToken, signOut, refresh }),
    [state, signIn, signInWithToken, signOut, refresh]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error("useSession must be used inside SessionProvider");
  return value;
}

/**
 * Whether a signed-in staff member holds a capability.
 *
 * This decides what to *show*, never what is allowed: the server checks the
 * same capability on every request, so hiding a button is a courtesy to the
 * person, not a control on them.
 */
export function can(account: Account | null, cap: string): boolean {
  if (account?.kind !== "staff") return false;
  return account.capabilities === null || account.capabilities.includes(cap);
}

/** The bearer token for an authenticated request, or null when signed out. */
export function useAuthToken(): string | null {
  const session = useSession();
  return session.status === "signed-in" ? session.token : null;
}

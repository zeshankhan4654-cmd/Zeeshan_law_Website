import jwt, { type JwtPayload } from "jsonwebtoken";
import { env } from "../config/env.js";
import { parseDurationMs } from "./duration.js";

/**
 * Two kinds of party sign in, and they live in different tables: staff in
 * `users`, clients in `clients`. Their ids overlap — user 1 and client 1 both
 * exist — so the kind is part of the token and part of the type. A payload
 * without a recognised kind is not a session.
 *
 * Modelling it as a union rather than an optional field is deliberate: the
 * compiler refuses `session.role` on a client session, so a staff-only check
 * cannot be written against a client token by accident.
 */
export type StaffSession = {
  kind: "staff";
  sub: number; // users.id
  username: string;
  role: string;
  /** The chamber this session may see. Nothing outside it is reachable. */
  firm: number;
};

export type ClientSession = {
  kind: "client";
  sub: number; // clients.id
  username: string;
  /** The chamber whose client this is. */
  firm: number;
};

export type SessionPayload = StaffSession | ClientSession;

const expiresInSeconds = Math.floor(parseDurationMs(env.jwt.expiresIn) / 1000);

export function signSession(payload: SessionPayload): string {
  return jwt.sign(payload, env.jwt.secret, { expiresIn: expiresInSeconds });
}

/** Throws if the token is unsigned, expired, or not a shape we issue. */
export function verifySession(token: string): SessionPayload {
  const decoded = jwt.verify(token, env.jwt.secret) as JwtPayload;
  const sub = Number(decoded.sub);
  const username = decoded.username;
  const firm = Number(decoded.firm);

  if (!Number.isInteger(sub) || sub <= 0 || typeof username !== "string") {
    throw new Error("Malformed session payload");
  }

  // A session with no chamber is not a session. Tokens issued before the
  // platform existed have none, and are refused rather than guessed at —
  // guessing would put somebody in whichever chamber happened to be first.
  if (!Number.isInteger(firm) || firm <= 0) {
    throw new Error("Session names no chamber");
  }

  if (decoded.kind === "staff" && typeof decoded.role === "string") {
    return { kind: "staff", sub, username, role: decoded.role, firm };
  }
  if (decoded.kind === "client") {
    return { kind: "client", sub, username, firm };
  }

  // Includes tokens issued before `kind` existed. Failing closed costs one
  // sign-in; guessing would hand a client a staff session.
  throw new Error("Unrecognised session kind");
}

/** The office cookie and the client-portal cookie are separate, so signing
 *  into one in a browser never disturbs the other. */
export const SESSION_COOKIE = "session";
export const PORTAL_COOKIE = "portal_session";

export const sessionCookieOptions = {
  httpOnly: true,
  secure: env.isProduction,
  sameSite: "lax" as const,
  maxAge: parseDurationMs(env.jwt.expiresIn),
  path: "/",
};

import jwt, { type JwtPayload } from "jsonwebtoken";
import { env } from "../config/env.js";
import { parseDurationMs } from "./duration.js";

export type SessionPayload = {
  sub: number; // user id
  username: string;
  role: string;
};

const expiresInSeconds = Math.floor(parseDurationMs(env.jwt.expiresIn) / 1000);

export function signSession(payload: SessionPayload): string {
  return jwt.sign(payload, env.jwt.secret, { expiresIn: expiresInSeconds });
}

export function verifySession(token: string): SessionPayload {
  const decoded = jwt.verify(token, env.jwt.secret) as JwtPayload;
  return { sub: decoded.sub as unknown as number, username: decoded.username as string, role: decoded.role as string };
}

export const SESSION_COOKIE = "session";

export const sessionCookieOptions = {
  httpOnly: true,
  secure: env.isProduction,
  sameSite: "lax" as const,
  maxAge: parseDurationMs(env.jwt.expiresIn),
  path: "/",
};

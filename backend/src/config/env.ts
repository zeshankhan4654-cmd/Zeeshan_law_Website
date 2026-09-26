import path from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnvFile } from "dotenv";
import Joi from "joi";

/**
 * The settings file, found by where this file is rather than by where the
 * process was started.
 *
 * `dotenv/config` reads `.env` from the current working directory, which is
 * only the backend folder when somebody happens to have cd'd there. A
 * hosting panel starts the server from wherever it likes — cPanel's Node
 * application manager does — and the server then came up with no
 * DATABASE_URL at all, reporting the database as unreachable rather than
 * saying it had never been told where the database was.
 *
 * This resolves upwards from this module: `dist/config/env.js` when built
 * and `src/config/env.ts` when run through tsx are both two levels below
 * the backend folder, so one path serves both.
 */
const HERE = path.dirname(fileURLToPath(import.meta.url));
loadEnvFile({ path: path.resolve(HERE, "../../.env") });

/**
 * Every environment variable the server needs, validated once at boot.
 * A missing or malformed value fails fast here rather than surfacing as an
 * unexplained crash three requests later.
 */
const schema = Joi.object({
  PORT: Joi.number().port().default(4000),
  NODE_ENV: Joi.string().valid("development", "test", "production").default("development"),

  DATABASE_URL: Joi.string().uri({ scheme: ["postgresql", "postgres"] }).required(),

  // Browser origins allowed to call this API, comma-separated: the Next.js
  // app, and Expo's web target during mobile development. A native build
  // sends no Origin header and is not subject to CORS at all.
  CORS_ORIGIN: Joi.string().required(),

  // Whether an advocate who finds the site may register a chamber without
  // being invited. "off" closes the door and changes nothing else: chambers
  // that already exist carry on, and the platform admin can still create
  // one. It is a decision about who arrives, not about how anything works.
  PUBLIC_SIGNUP: Joi.string().valid("on", "off").default("on"),

  // Signs and verifies the session cookie. Generate a real value with:
  //   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRES_IN: Joi.string().default("12h"),

  // Where uploaded case documents and client voice notes are written. Kept
  // outside the repository tree in a real deployment.
  UPLOAD_DIR: Joi.string().default("./uploads"),
  // Largest voice note accepted, in megabytes. A note to the office is a
  // sentence or two, not a recording of the hearing.
  VOICE_NOTE_MAX_MB: Joi.number().min(1).max(50).default(10),

  // Expo's push service. Overridable so a development machine can point at
  // a local stub, and so the address is not compiled in.
  PUSH_API_URL: Joi.string().uri().default("https://exp.host/--/api/v2/push/send"),
  // "expo" sends for real; "log" writes what would have been sent and sends
  // nothing, which is what a development machine wants.
  PUSH_TRANSPORT: Joi.string().valid("expo", "log", "off").default("expo"),

  // How many reverse proxies sit in front of this server. Behind nginx or a
  // hosting panel, req.ip is the proxy's address unless this is set, which
  // would make every rate limit global. It is opt-in and a count rather
  // than a boolean, because trusting X-Forwarded-For blindly lets a caller
  // choose their own address and walk around the limit.
  TRUST_PROXY_HOPS: Joi.number().integer().min(0).max(10).default(0),

  // Which chamber's website this deployment serves on its bare domain.
  // Behind a sign-in the chamber comes from the session; the public pages
  // have no session, so they are told here.
  PLATFORM_FIRM_SLUG: Joi.string().default("arbitrator-law"),

  // Failed sign-ins before an identity is locked out, and for how long.
  LOGIN_MAX_ATTEMPTS: Joi.number().integer().min(1).default(8),
  LOGIN_LOCKOUT_MINUTES: Joi.number().integer().min(1).default(15),
}).unknown(true);

const { value, error } = schema.validate(process.env);

if (error) {
  throw new Error(`Invalid environment configuration: ${error.message}`);
}

export const env = {
  port: value.PORT as number,
  nodeEnv: value.NODE_ENV as "development" | "test" | "production",
  isProduction: value.NODE_ENV === "production",
  databaseUrl: value.DATABASE_URL as string,
  corsOrigins: (value.CORS_ORIGIN as string)
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean),
  jwt: {
    secret: value.JWT_SECRET as string,
    expiresIn: value.JWT_EXPIRES_IN as string,
  },
  uploadDir: value.UPLOAD_DIR as string,
  voiceNoteMaxBytes: (value.VOICE_NOTE_MAX_MB as number) * 1024 * 1024,
  trustProxyHops: value.TRUST_PROXY_HOPS as number,
  push: {
    apiUrl: value.PUSH_API_URL as string,
    transport: value.PUSH_TRANSPORT as "expo" | "log" | "off",
  },
  platformFirmSlug: value.PLATFORM_FIRM_SLUG as string,
  publicSignup: value.PUBLIC_SIGNUP === "on",
  login: {
    maxAttempts: value.LOGIN_MAX_ATTEMPTS as number,
    lockoutMinutes: value.LOGIN_LOCKOUT_MINUTES as number,
  },
};

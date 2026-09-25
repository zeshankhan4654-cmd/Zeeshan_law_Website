import { env } from "./env.js";

/**
 * Refusals that only apply in production.
 *
 * Every one of these is a configuration mistake that is silent in
 * development and serious on a live server — a default secret nobody
 * changed, a site still pointing at localhost, notifications quietly
 * switched off. The server refuses to start rather than run wrongly, and
 * says exactly what to fix.
 *
 * These are checks on *configuration*, not on the network: they must not
 * make starting up depend on another service being awake.
 */

/**
 * The literal placeholder tokens from .env.example.
 *
 * Deliberately narrow. An earlier version also matched the words "secret"
 * and "password" anywhere in the value, which rejected a perfectly good
 * database password that happened to contain the word — a check that stops
 * a correct deployment is worse than the mistake it was guarding against.
 * Weakness is caught by length and variety below, not by vocabulary.
 */
const PLACEHOLDERS = ["CHANGE_ME", "changeme", "your-secret", "REPLACE_ME"];

function looksLikePlaceholder(value: string): boolean {
  const lower = value.toLowerCase();
  return PLACEHOLDERS.some((p) => lower.includes(p.toLowerCase()));
}

/**
 * Weak in the way a hand-typed secret is weak: too few distinct characters.
 *
 * The threshold has to account for what a correct secret looks like. The
 * command this project tells people to run prints 96 hexadecimal
 * characters, drawn from an alphabet of exactly 16, so demanding 16
 * distinct characters demanded a *perfect* set — and a random draw misses
 * at least one digit about 3% of the time. Roughly one deployment in
 * thirty was told its properly generated secret "does not look random",
 * which is the same mistake as the vocabulary check above, rediscovered
 * from the other end.
 *
 * Twelve leaves margin: missing five of sixteen digits across 96 draws
 * does not happen, while a repeated word or a name still falls short.
 */
function tooLittleVariety(value: string): boolean {
  return new Set(value).size < 12;
}

export function productionChecks(): string[] {
  if (!env.isProduction) return [];

  const problems: string[] = [];

  if (env.jwt.secret.length < 48) {
    problems.push(
      "JWT_SECRET is too short. Generate one with:\n" +
        `    node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`
    );
  }
  if (looksLikePlaceholder(env.jwt.secret)) {
    problems.push("JWT_SECRET still contains a placeholder from .env.example.");
  }
  if (tooLittleVariety(env.jwt.secret)) {
    problems.push("JWT_SECRET does not look random. Generate one rather than typing it.");
  }

  if (looksLikePlaceholder(env.databaseUrl)) {
    problems.push("DATABASE_URL still contains a placeholder password.");
  }

  // An origin list containing localhost means the deployment was copied
  // from a development machine.
  const localOrigins = env.corsOrigins.filter(
    (o) => o.includes("localhost") || o.includes("127.0.0.1")
  );
  if (localOrigins.length > 0) {
    problems.push(`CORS_ORIGIN still allows a local address: ${localOrigins.join(", ")}`);
  }
  if (env.corsOrigins.some((o) => o.startsWith("http://"))) {
    problems.push("CORS_ORIGIN contains an http:// origin. A live site must be https.");
  }
  if (env.corsOrigins.length === 0) {
    problems.push("CORS_ORIGIN is empty, so the website cannot call this API.");
  }

  if (env.push.transport === "expo" && !env.push.apiUrl.startsWith("https://")) {
    problems.push("PUSH_API_URL is not https. Leave it unset to use Expo's own address.");
  }

  return problems;
}

/** Called at boot. Throws with everything wrong at once, not one at a time. */
export function assertProductionReady(): void {
  const problems = productionChecks();
  if (problems.length === 0) return;

  throw new Error(
    `Refusing to start in production with this configuration:\n\n` +
      problems.map((p, i) => `  ${i + 1}. ${p}`).join("\n\n") +
      `\n\nFix these in the server's .env, then start again.\n`
  );
}

import "dotenv/config";
import Joi from "joi";

/**
 * Every environment variable the server needs, validated once at boot.
 * A missing or malformed value fails fast here rather than surfacing as an
 * unexplained crash three requests later.
 */
const schema = Joi.object({
  PORT: Joi.number().port().default(4000),
  NODE_ENV: Joi.string().valid("development", "test", "production").default("development"),

  DATABASE_URL: Joi.string().uri({ scheme: ["postgresql", "postgres"] }).required(),

  // The browser origin allowed to call this API (the Next.js dev server).
  CORS_ORIGIN: Joi.string().uri().required(),

  // Signs and verifies the session cookie. Generate a real value with:
  //   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRES_IN: Joi.string().default("12h"),

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
  corsOrigin: value.CORS_ORIGIN as string,
  jwt: {
    secret: value.JWT_SECRET as string,
    expiresIn: value.JWT_EXPIRES_IN as string,
  },
  login: {
    maxAttempts: value.LOGIN_MAX_ATTEMPTS as number,
    lockoutMinutes: value.LOGIN_LOCKOUT_MINUTES as number,
  },
};

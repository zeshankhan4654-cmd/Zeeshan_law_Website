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

  PGHOST: Joi.string().required(),
  PGPORT: Joi.number().port().default(5432),
  PGDATABASE: Joi.string().required(),
  PGUSER: Joi.string().required(),
  PGPASSWORD: Joi.string().allow("").required(),

  CORS_ORIGIN: Joi.string().uri().required(),
}).unknown(true);

const { value, error } = schema.validate(process.env);

if (error) {
  throw new Error(`Invalid environment configuration: ${error.message}`);
}

export const env = {
  port: value.PORT as number,
  nodeEnv: value.NODE_ENV as "development" | "test" | "production",
  isProduction: value.NODE_ENV === "production",
  corsOrigin: value.CORS_ORIGIN as string,
  pg: {
    host: value.PGHOST as string,
    port: value.PGPORT as number,
    database: value.PGDATABASE as string,
    user: value.PGUSER as string,
    password: value.PGPASSWORD as string,
  },
};

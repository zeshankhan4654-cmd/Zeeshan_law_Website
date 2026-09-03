import { Pool } from "pg";
import { env } from "../config/env.js";

/**
 * A single shared connection pool for the whole process.
 *
 * This is deliberately the plain `pg` driver rather than Prisma: in Phase 0
 * there is no schema yet, so there is nothing for an ORM to model. Phase 1
 * introduces Prisma alongside the real tables and this file is replaced.
 */
export const pool = new Pool({
  host: env.pg.host,
  port: env.pg.port,
  database: env.pg.database,
  user: env.pg.user,
  password: env.pg.password,
});

pool.on("error", (err) => {
  console.error("Unexpected error on an idle Postgres client", err);
});

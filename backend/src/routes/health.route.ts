import { Router } from "express";
import { prisma } from "../lib/prisma.js";

export const healthRouter = Router();

/**
 * Confirms the API is up and can actually reach Postgres — not just that the
 * process is running. Used by deployment platforms and by the frontend's
 * end-to-end smoke test.
 */
healthRouter.get("/", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ok", database: "connected" });
  } catch (error) {
    // Logged here, not returned to the caller. This endpoint is public and
    // a connection error names the host and the database user, so the
    // answer stays bare — but whoever is deploying needs the reason, and
    // without this they have to patch this file by hand to get it. That
    // happened, and it cost an evening.
    console.error("Health check could not reach the database:", error);
    res.status(503).json({ status: "error", database: "unreachable" });
  }
});

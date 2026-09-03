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
  } catch {
    res.status(503).json({ status: "error", database: "unreachable" });
  }
});

import { Router } from "express";
import { pool } from "../lib/db.js";

export const healthRouter = Router();

/**
 * Confirms the API is up and can actually reach Postgres — not just that the
 * process is running. Used by deployment platforms and by Phase 0's smoke
 * test from the frontend.
 */
healthRouter.get("/", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok", database: "connected" });
  } catch {
    res.status(503).json({ status: "error", database: "unreachable" });
  }
});

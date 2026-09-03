"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { CircleAlert, CircleCheck, LoaderCircle } from "lucide-react";
import { apiFetch } from "@/lib/api";

type HealthResponse = { status: "ok"; database: "connected" };

/**
 * Phase 0's proof of life: confirms TanStack Query can reach the Express API,
 * and the API can reach Postgres — the whole chain in one component.
 */
export function HealthCheck() {
  const { data, isPending, isError } = useQuery({
    queryKey: ["health"],
    queryFn: () => apiFetch<HealthResponse>("/api/health"),
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex items-center gap-2 rounded-card border border-rule bg-surface px-4 py-3 text-sm"
    >
      {isPending && (
        <>
          <LoaderCircle className="size-4 animate-spin text-gold" />
          <span>Checking the API…</span>
        </>
      )}
      {isError && (
        <>
          <CircleAlert className="size-4 text-danger" />
          <span>API unreachable — is the backend running on port 4000?</span>
        </>
      )}
      {data && (
        <>
          <CircleCheck className="size-4 text-success" />
          <span>
            API {data.status} · database {data.database}
          </span>
        </>
      )}
    </motion.div>
  );
}

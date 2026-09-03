import { cn } from "@/lib/cn";

/** A pulsing placeholder block, for a list or card while its data is still loading. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-rule/60", className)} aria-hidden="true" />;
}

import { cn } from "@/lib/cn";
import type { TableHTMLAttributes } from "react";

/**
 * A styled `<table>` in a horizontally-scrolling container of its own, so
 * a wide table never pushes the page itself sideways. Everything inside —
 * thead, tbody, tr, td — stays plain HTML; only the outer table needs a
 * consistent look.
 */
export function Table({ className, ...props }: TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="overflow-x-auto rounded-card border border-rule">
      <table className={cn("tbl w-full border-collapse text-sm", className)} {...props} />
    </div>
  );
}

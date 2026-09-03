import { cn } from "@/lib/cn";
import type { HTMLAttributes } from "react";

type Variant = "gold" | "success" | "danger" | "neutral";

const variants: Record<Variant, string> = {
  gold: "bg-gold-wash text-gold",
  success: "bg-success-wash text-success",
  danger: "bg-danger-wash text-danger",
  neutral: "bg-rule/60 text-ink-soft",
};

export function Badge({
  variant = "neutral",
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { variant?: Variant }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}

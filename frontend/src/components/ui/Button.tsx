import { cn } from "@/lib/cn";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "outline" | "ghost" | "destructive";
type Size = "sm" | "md" | "lg";

/**
 * The class string alone — exported so a styled-as-a-button `<Link>` (a
 * "sign in" link, say) can share the exact same look without wrapping in a
 * real `<button>`, which would be invalid HTML nested in an anchor.
 */
export function buttonClasses(variant: Variant = "primary", size: Size = "md", className?: string): string {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors " +
    "disabled:pointer-events-none disabled:opacity-50 " +
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold";

  const variants: Record<Variant, string> = {
    primary: "bg-gold text-white hover:bg-gold-bright",
    outline: "border border-gold text-gold hover:bg-gold-wash",
    ghost: "text-ink-soft hover:bg-gold-wash hover:text-ink",
    destructive: "text-danger hover:bg-danger-wash",
  };

  const sizes: Record<Size, string> = {
    sm: "h-8 px-3 text-sm",
    md: "h-10 px-4 text-sm",
    lg: "h-12 px-6 text-base",
  };

  return cn(base, variants[variant], sizes[size], className);
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
};

export function Button({ variant = "primary", size = "md", className, ...props }: ButtonProps) {
  return <button className={buttonClasses(variant, size, className)} {...props} />;
}

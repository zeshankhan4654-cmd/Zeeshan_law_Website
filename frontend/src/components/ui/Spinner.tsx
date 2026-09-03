import { cn } from "@/lib/cn";
import { LoaderCircle } from "lucide-react";

export function Spinner({ className }: { className?: string }) {
  return <LoaderCircle className={cn("size-4 animate-spin text-gold", className)} aria-hidden="true" />;
}

import Image from "next/image";

/**
 * The firm's mark. One SVG drawn in `currentColor`, so the same file serves
 * the gold header and the dark footer — the header and footer showing no
 * logo at all was the first thing the chamber asked to have fixed.
 */
export function Logo({ className = "size-9" }: { className?: string }) {
  return (
    <Image
      src="/logo.svg"
      alt=""
      width={36}
      height={36}
      className={className}
      aria-hidden
      priority
    />
  );
}

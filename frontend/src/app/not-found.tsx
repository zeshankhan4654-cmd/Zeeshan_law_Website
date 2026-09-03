import { Compass } from "lucide-react";
import Link from "next/link";
import { buttonClasses } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center bg-ground px-6 text-center">
      <div className="flex flex-col items-center gap-4">
        <Compass className="size-10 text-gold" strokeWidth={1.5} />
        <h1 className="font-display text-2xl text-ink">That page doesn&apos;t exist</h1>
        <p className="max-w-sm text-sm text-ink-soft">
          Either the address is wrong, or it belongs to a page a later phase hasn&apos;t built yet.
        </p>
        <Link href="/" className={buttonClasses("outline")}>
          Back to the homepage
        </Link>
      </div>
    </div>
  );
}

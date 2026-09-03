import { Scale } from "lucide-react";
import Link from "next/link";
import { buttonClasses } from "@/components/ui/Button";

export default function Home() {
  return (
    <section className="mx-auto flex max-w-2xl flex-col items-center gap-6 px-6 py-24 text-center">
      <Scale className="size-10 text-gold" strokeWidth={1.5} />
      <div className="space-y-2">
        <p className="text-xs font-semibold tracking-[0.18em] text-gold uppercase">
          The site shell is in place
        </p>
        <h1 className="font-display text-3xl font-medium text-ink">
          The Arbitrator &amp; Law Associates
        </h1>
        <p className="text-ink-soft">
          The header, footer and design system are live. The hero, practice areas, blog
          and contact form that will actually fill this page are built in the next phase.
        </p>
      </div>
      <Link href="/office/login" className={buttonClasses("outline")}>
        Office sign-in →
      </Link>
    </section>
  );
}

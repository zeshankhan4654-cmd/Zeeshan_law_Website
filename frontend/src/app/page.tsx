import { Scale } from "lucide-react";
import { HealthCheck } from "./health-check";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-6 px-6 text-center">
      <Scale className="size-10 text-gold" strokeWidth={1.5} />
      <div className="space-y-2">
        <p className="text-xs font-semibold tracking-[0.18em] text-gold uppercase">
          Phase 0 — walking skeleton
        </p>
        <h1 className="font-display text-3xl font-medium text-ink">
          The Arbitrator &amp; Law Associates
        </h1>
        <p className="text-ink-soft">
          Next.js, TanStack Query, Tailwind, Lucide and Framer Motion on the
          frontend; Express, Joi and Postgres on the backend. The card below
          proves the whole chain is connected.
        </p>
      </div>
      <HealthCheck />
    </main>
  );
}

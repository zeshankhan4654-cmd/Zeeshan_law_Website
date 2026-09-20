import Link from "next/link";

/** The same heading block on every office screen. */
export function PageHeading({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 pb-6">
      <div className="space-y-1">
        <h1 className="font-display text-2xl text-ink">{title}</h1>
        {subtitle && <p className="text-sm text-ink-soft">{subtitle}</p>}
      </div>
      {action && (
        <Link
          href={action.href}
          className="rounded-md bg-gold px-4 py-2 text-sm font-medium text-white hover:bg-gold-bright"
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}

/** Shown where a list has nothing in it yet. */
export function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-card border border-rule bg-surface px-6 py-14 text-center text-sm text-ink-soft">
      {children}
    </p>
  );
}

/**
 * Shown where a role may not see a screen's data at all. The API refused
 * the request; this says so rather than rendering an empty page that looks
 * like "there is nothing here".
 */
export function NotPermitted() {
  return (
    <div className="rounded-card border border-rule bg-surface px-6 py-14 text-center">
      <p className="text-sm text-ink-soft">
        Your role does not have access to this. Ask the Principal if you need it.
      </p>
    </div>
  );
}

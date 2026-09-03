import { Scale } from "lucide-react";
import Link from "next/link";
import { buttonClasses } from "@/components/ui/Button";

const NAV_LINKS = [
  { href: "/practice-areas", label: "Practice areas" },
  { href: "/about", label: "The chamber" },
  { href: "/blog", label: "Writing" },
  { href: "/resources", label: "Resources" },
  { href: "/contact", label: "Contact" },
];

/**
 * The header, footer and nav every public page shares. Real marketing
 * content (hero, practice areas, blog, contact form) arrives in Phase 3 —
 * this phase is the shell it will be built inside.
 */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-rule bg-ink">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2 text-white">
            <span className="grid size-9 place-items-center rounded-md bg-gold/15 ring-1 ring-gold/40">
              <Scale className="size-5 text-gold-bright" strokeWidth={1.5} />
            </span>
            <span className="text-sm leading-tight font-semibold">
              The Arbitrator &amp; Law Associates
            </span>
          </Link>
          <ul className="hidden items-center gap-6 text-sm text-white/80 md:flex">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="hover:text-gold-bright">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
          <Link href="/client" className={buttonClasses("primary", "sm")}>
            Client portal
          </Link>
        </nav>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-rule bg-ink py-8 text-white/60">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 px-6 text-center text-sm">
          <p>
            &copy; {new Date().getFullYear()} The Arbitrator &amp; Law Associates. Material on this
            site is general information, not legal advice on your matter.
          </p>
          <p>
            Designed and Maintained by{" "}
            <a
              href="https://www.mudassir.co/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gold-bright hover:underline"
            >
              mudassir.co
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}

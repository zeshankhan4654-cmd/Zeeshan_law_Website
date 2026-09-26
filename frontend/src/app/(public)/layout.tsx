import { Mail, MapPin, Phone } from "lucide-react";
import Link from "next/link";
import { buttonClasses } from "@/components/ui/Button";
import { Logo } from "@/components/site/Logo";
import { MobileNav } from "@/components/site/MobileNav";
import { Social } from "@/components/site/Social";
import { WhatsAppButton } from "@/components/site/WhatsAppButton";
import { getSettings } from "@/lib/site";
import { PRACTICE_AREAS } from "@/lib/practice-areas";

/**
 * Content the office edits — settings, reviews, writing — must reach the
 * site without a redeploy. Without this the pages are prerendered once at
 * build time and a new review would never appear. Five minutes is fresh
 * enough for a marketing site and still serves a cached page to almost
 * every visitor. It applies to every route in this group.
 */
export const revalidate = 300;

const NAV_LINKS = [
  { href: "/practice-areas", label: "Practice areas" },
  { href: "/about", label: "The chamber" },
  { href: "/blog", label: "Writing" },
  { href: "/resources", label: "Resources" },
  { href: "/contact", label: "Contact" },
];

/**
 * The header, footer and nav every public page shares.
 *
 * A Server Component: it fetches the chamber's own details once, and each
 * contact element renders only when its setting has been filled in. An
 * unset telephone number shows nothing rather than a placeholder — a wrong
 * number on a law firm's site sends someone in difficulty to a stranger.
 */
export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSettings();

  const phone = settings["contact.phone"];
  const email = settings["contact.email"];
  const address = settings["firm.address"];

  return (
    <div className="flex min-h-screen flex-col">
      <header className="relative border-b border-white/10 bg-ink">
        <nav className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <Link href="/" className="flex items-center gap-2.5 text-white">
            <span className="grid size-10 place-items-center rounded-md bg-gold/15 text-gold-bright ring-1 ring-gold/40">
              <Logo className="size-6" />
            </span>
            <span className="text-sm leading-tight font-semibold">
              The Arbitrator &amp; Law Associates
            </span>
          </Link>

          <ul className="hidden items-center gap-6 text-sm text-white/80 lg:flex">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="hover:text-gold-bright">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-2">
            <Link href="/client" className={`hidden sm:inline-flex ${buttonClasses("primary", "sm")}`}>
              Client portal
            </Link>
            <MobileNav links={[...NAV_LINKS, { href: "/client", label: "Client portal" }]} />
          </div>
        </nav>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-white/10 bg-ink text-white/60">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 py-12 md:grid-cols-[1.3fr_1fr_1fr]">
          <div className="space-y-4">
            <Link href="/" className="flex items-center gap-2.5 text-white">
              <span className="grid size-10 place-items-center rounded-md bg-gold/15 text-gold-bright ring-1 ring-gold/40">
                <Logo className="size-6" />
              </span>
              <span className="text-sm leading-tight font-semibold">
                The Arbitrator &amp; Law Associates
              </span>
            </Link>
            <p className="max-w-sm text-sm leading-6">{settings["firm.tagline"]}</p>
            {/* The chamber asked for the accounts to sit below the logo. */}
            <Social settings={settings} className="pt-1 text-white/70" />
          </div>

          <div className="space-y-3">
            <h2 className="text-xs font-semibold tracking-[0.18em] text-gold uppercase">
              Practice areas
            </h2>
            <ul className="space-y-2 text-sm">
              {PRACTICE_AREAS.slice(0, 5).map((area) => (
                <li key={area.slug}>
                  <Link href={`/practice-areas#${area.slug}`} className="hover:text-gold-bright">
                    {area.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-3">
            <h2 className="text-xs font-semibold tracking-[0.18em] text-gold uppercase">
              The chamber
            </h2>
            <ul className="space-y-2.5 text-sm">
              {address && (
                <li className="flex gap-2.5">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-gold" strokeWidth={1.6} />
                  <span>{address}</span>
                </li>
              )}
              {phone && (
                <li className="flex gap-2.5">
                  <Phone className="mt-0.5 size-4 shrink-0 text-gold" strokeWidth={1.6} />
                  <a href={`tel:${phone.replace(/\s/g, "")}`} className="hover:text-gold-bright">
                    {phone}
                  </a>
                </li>
              )}
              {email && (
                <li className="flex gap-2.5">
                  <Mail className="mt-0.5 size-4 shrink-0 text-gold" strokeWidth={1.6} />
                  <a href={`mailto:${email}`} className="break-all hover:text-gold-bright">
                    {email}
                  </a>
                </li>
              )}
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10">
          <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 px-6 py-6 text-center text-xs">
            <p>
              &copy; {new Date().getFullYear()} The Arbitrator &amp; Law Associates. Material on
              this site is general information, not legal advice on your matter.
            </p>
            {/* Both app stores require this at a public address before they
                will list the mobile app, and it belongs in the footer of a
                site that holds privileged material regardless. */}
            <p>
              <Link href="/privacy" className="hover:text-gold-bright">
                What this chamber records
              </Link>
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
        </div>
      </footer>

      <WhatsAppButton settings={settings} />
    </div>
  );
}

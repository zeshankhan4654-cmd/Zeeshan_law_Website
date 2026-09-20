"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

/**
 * The narrow-screen menu — the one piece of the header that has to be a
 * client component, because it holds open/closed state.
 */
export function MobileNav({ links }: { links: { href: string; label: string }[] }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const [openedAt, setOpenedAt] = useState(pathname);

  // Navigating should close it; otherwise the menu covers the page you just
  // asked for. Adjusted during render rather than in an effect: an effect
  // that calls setState renders the page once with the menu still open and
  // then again without it, which React now warns about — and this also
  // catches a back or forward button, which a click handler would miss.
  if (pathname !== openedAt) {
    setOpenedAt(pathname);
    setOpen(false);
  }

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="mobile-nav"
        aria-label={open ? "Close the menu" : "Open the menu"}
        className="grid size-10 place-items-center rounded-md text-white/90 hover:bg-white/10"
      >
        {open ? <X className="size-5" /> : <Menu className="size-5" />}
      </button>

      {open && (
        <div
          id="mobile-nav"
          className="absolute inset-x-0 top-full z-30 border-t border-white/10 bg-ink px-6 pb-5 shadow-lg"
        >
          <ul className="flex flex-col divide-y divide-white/10">
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="block py-3.5 text-sm text-white/85 hover:text-gold-bright"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

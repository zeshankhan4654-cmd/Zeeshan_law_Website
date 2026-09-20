"use client";

import { LogOut, ScrollText, User } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/site/Logo";
import type { PortalClient } from "@/lib/portal-session";
import { usePortalLogout } from "@/lib/use-portal";

/**
 * The frame around every portal page. A client component only because
 * signing out is an action — everything inside it is rendered on the server.
 */
export function PortalShell({
  client,
  children,
}: {
  client: PortalClient;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const logout = usePortalLogout();

  function signOut() {
    logout.mutate(undefined, {
      // Whether or not the server could be reached, the visitor asked to
      // leave: send them to the sign-in page either way.
      onSettled: () => {
        router.push("/client/login");
        router.refresh();
      },
    });
  }

  return (
    <div className="flex min-h-screen flex-col bg-ground">
      <header className="border-b border-white/10 bg-ink">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-6 py-4">
          <Link href="/client" className="flex items-center gap-2.5 text-white">
            <span className="grid size-9 place-items-center rounded-md bg-gold/15 text-gold-bright ring-1 ring-gold/40">
              <Logo className="size-5" />
            </span>
            <span className="text-sm leading-tight font-semibold">Your matters</span>
          </Link>

          <div className="flex items-center gap-1">
            <span className="hidden items-center gap-2 px-3 text-sm text-white/70 sm:flex">
              <User className="size-4" />
              {client.name}
            </span>
            <Link
              href="/client/change-password"
              className="rounded-md px-3 py-2 text-sm text-white/70 hover:bg-white/10 hover:text-white"
            >
              Password
            </Link>
            <button
              type="button"
              onClick={signOut}
              disabled={logout.isPending}
              className="flex items-center gap-1.5 rounded-md px-3 py-2 text-sm text-white/70 hover:bg-white/10 hover:text-white disabled:opacity-50"
            >
              <LogOut className="size-4" />
              {logout.isPending ? "Signing out…" : "Sign out"}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-10">{children}</main>

      <footer className="border-t border-rule px-6 py-6">
        <p className="mx-auto flex max-w-4xl items-start gap-2.5 text-xs leading-5 text-ink-soft">
          <ScrollText className="mt-0.5 size-4 shrink-0 text-gold" />
          What appears here is a record of your matter kept by the chamber.
          It is not a substitute for advice on it — if a date is approaching,
          telephone rather than wait for a message.
        </p>
      </footer>
    </div>
  );
}

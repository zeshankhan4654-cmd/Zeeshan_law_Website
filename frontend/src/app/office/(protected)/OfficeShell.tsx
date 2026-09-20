"use client";

import { Building2, Globe, KeyRound, LogOut, Scale } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { canSeeNavItem, OFFICE_NAV } from "@/lib/office-nav";
import { useLogout, type SessionUser } from "@/lib/use-auth";

export function OfficeShell({ user, children }: { user: SessionUser; children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const logout = useLogout();

  function handleLogout() {
    logout.mutate(undefined, {
      onSuccess: () => {
        router.push("/office/login");
        router.refresh();
      },
    });
  }

  return (
    <div className="min-h-screen bg-ground">
      {user.emailIsPlaceholder && (
        <p className="fixed inset-x-0 top-0 z-20 bg-gold-wash px-4 py-2 text-center text-xs text-ink">
          You sign in with <span className="font-semibold">{user.email}</span>, which was
          written for you and cannot receive mail.{" "}
          <Link href="/office/account" className="font-semibold text-gold underline">
            Put your real address in
          </Link>
          .
        </p>
      )}

      <aside className="fixed inset-y-0 left-0 flex w-62 flex-col overflow-y-auto bg-ink text-white/75">
        <Link href="/office" className="flex items-center gap-2 border-b border-white/10 px-4 py-4">
          <span className="grid size-8 place-items-center rounded-md bg-gold/15 ring-1 ring-gold/40">
            <Scale className="size-4 text-gold-bright" strokeWidth={1.5} />
          </span>
          {/* The chamber's own name. Every advocate has their own office
              here, and seeing somebody else's name over it would be both
              wrong and alarming. */}
          <span className="text-sm leading-tight font-semibold text-white">
            {user.chamber?.name ?? "Office"}
            <span className="block text-[0.68rem] font-normal text-gold-bright">Office Diary</span>
          </span>
        </Link>

        {user.platformAdmin && (
          <Link
            href="/platform"
            className="mx-3 mt-3 flex items-center gap-2.5 rounded-md bg-gold/15 px-3 py-2 text-sm text-gold-bright ring-1 ring-gold/30 hover:bg-gold/25"
          >
            <Building2 className="size-4" strokeWidth={1.6} />
            Platform
          </Link>
        )}

        <nav className="flex-1 py-3">
          {OFFICE_NAV.map((section) => {
            const items = section.items.filter((item) => canSeeNavItem(item, user.role, user.capabilities));
            if (items.length === 0) return null;
            return (
              <div key={section.heading ?? "top"} className="mb-1">
                {section.heading && (
                  <p className="mt-4 mb-1 px-4 text-[0.66rem] tracking-[0.14em] text-white/35 uppercase">
                    {section.heading}
                  </p>
                )}
                {items.map((item) => {
                  const active = pathname === item.href;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-2.5 border-l-2 border-transparent px-4 py-2 text-sm",
                        active
                          ? "border-gold-bright bg-gold/15 font-medium text-white"
                          : "text-white/75 hover:bg-white/5 hover:text-white"
                      )}
                    >
                      <span
                        className={cn(
                          "grid size-6 place-items-center rounded-md",
                          active ? "bg-gold-bright text-ink" : "bg-white/5 text-white/55"
                        )}
                      >
                        <Icon className="size-3.5" />
                      </span>
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </nav>

        <div className="border-t border-white/10 px-4 py-4">
          <p className="text-sm font-semibold text-white">{user.fullName}</p>
          <p className="mb-2 text-xs text-gold-bright">{user.role}</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
            <Link href="/office/change-password" className="flex items-center gap-1 text-white/60 hover:text-white">
              <KeyRound className="size-3" /> Change password
            </Link>
            <button
              onClick={handleLogout}
              disabled={logout.isPending}
              className="flex items-center gap-1 text-white/60 hover:text-white"
            >
              <LogOut className="size-3" /> Log out
            </button>
          </div>
          <Link
            href="/"
            target="_blank"
            className="mt-2 flex items-center gap-1 text-xs text-white/60 hover:text-white"
          >
            <Globe className="size-3" /> View the website
          </Link>
        </div>
      </aside>

      <div className="ml-62">
        <main className="p-7">{children}</main>
      </div>
    </div>
  );
}

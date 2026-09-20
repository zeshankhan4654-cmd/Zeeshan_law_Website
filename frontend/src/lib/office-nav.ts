import { Calendar, Folder, Gauge, Inbox, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Capability required to see this item. Omitted = every signed-in staff member sees it. */
  cap?: string;
};

export type NavSection = {
  heading: string | null;
  items: NavItem[];
};

/**
 * The office sidebar.
 *
 * Only screens that exist are listed. The original build's full menu also
 * had the communications diary, official fees, office expenses, the library
 * editors, the blog, reviews, settings and accounts; those return here as
 * Phase 6 builds them. A sidebar item that leads nowhere is worse than one
 * that is not there yet.
 */
export const OFFICE_NAV: NavSection[] = [
  {
    heading: null,
    items: [
      { label: "Dashboard", href: "/office", icon: Gauge },
      { label: "Cause List", href: "/office/causelist", icon: Calendar, cap: "cases.view" },
    ],
  },
  {
    heading: "Diaries",
    items: [
      { label: "Cases", href: "/office/cases", icon: Folder, cap: "cases.view" },
      { label: "Clients", href: "/office/clients", icon: Users, cap: "clients.view" },
    ],
  },
  {
    heading: "Office",
    items: [{ label: "Enquiries", href: "/office/enquiries", icon: Inbox, cap: "enquiries.view" }],
  },
];

/** Mirrors backend/src/lib/capabilities.ts's ROOT_ROLE — the role that always holds everything. */
const ROOT_ROLE = "admin";

/** Whether a signed-in user (by role/capabilities) may see a nav item. */
export function canSeeNavItem(item: NavItem, role: string, capabilities: string[] | null): boolean {
  if (!item.cap) return true;
  if (role === ROOT_ROLE) return true; // the Principal sees everything
  return capabilities?.includes(item.cap) ?? false;
}

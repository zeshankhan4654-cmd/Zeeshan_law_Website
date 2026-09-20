import {
  BookOpen,
  Calendar,
  FileText,
  Folder,
  Gauge,
  Inbox,
  Landmark,
  Layers,
  MessagesSquare,
  Newspaper,
  PlayCircle,
  Search,
  Settings,
  ShieldCheck,
  Star,
  UserCog,
  Users,
  Wallet,
} from "lucide-react";
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
 * The office sidebar — every screen the chamber has, grouped as the
 * original build grouped them. Each item names the capability that makes it
 * visible, so a colleague's sidebar is shorter than the Principal's.
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
      { label: "Communications", href: "/office/communications", icon: MessagesSquare, cap: "comms.view" },
      { label: "Professional Fees", href: "/office/fees", icon: Wallet, cap: "money.view" },
      { label: "Official Fees", href: "/office/official-fees", icon: Landmark, cap: "money.view" },
      { label: "Office Expenses", href: "/office/expenses", icon: Layers, cap: "money.view" },
    ],
  },
  {
    heading: "Library",
    items: [
      { label: "Judgments", href: "/office/library/judgments", icon: BookOpen, cap: "library.view" },
      { label: "Legal Research", href: "/office/library/research", icon: Search, cap: "library.view" },
      { label: "Videos & Lectures", href: "/office/library/media", icon: PlayCircle, cap: "library.view" },
    ],
  },
  {
    heading: "The website",
    items: [
      { label: "Writing", href: "/office/blog", icon: Newspaper, cap: "blog.edit" },
      { label: "Client Reviews", href: "/office/testimonials", icon: Star, cap: "testimonials.edit" },
      { label: "Site Settings", href: "/office/settings", icon: Settings, cap: "site.settings" },
    ],
  },
  {
    heading: "Office",
    items: [
      { label: "Enquiries", href: "/office/enquiries", icon: Inbox, cap: "enquiries.view" },
      { label: "Accounts", href: "/office/users", icon: FileText, cap: "users.manage" },
      { label: "Roles & Access", href: "/office/roles", icon: ShieldCheck, cap: "users.manage" },
      // No capability: everybody must be able to change their own sign-in
      // without having to ask somebody who holds users.manage.
      { label: "My Account", href: "/office/account", icon: UserCog },
    ],
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

/**
 * Whether a signed-in user holds a capability.
 *
 * This decides what to *show*. The API checks the same capability on every
 * request, so hiding a control is a courtesy to the person — it stops them
 * filling in a form that was always going to be refused — never the
 * control itself.
 */
export function can(
  role: string | undefined,
  capabilities: string[] | null | undefined,
  cap: string
): boolean {
  if (!role) return false;
  if (role === ROOT_ROLE) return true;
  return capabilities?.includes(cap) ?? false;
}

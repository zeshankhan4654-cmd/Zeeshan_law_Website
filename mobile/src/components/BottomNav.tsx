import { type Href, usePathname, useRouter } from "expo-router";
import {
  BookOpen,
  CalendarDays,
  FolderOpen,
  Gavel,
  Home,
  LogIn,
  User,
  Users,
} from "lucide-react-native";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSession } from "@/lib/session";

/**
 * The bar across the bottom.
 *
 * Every screen was previously reached by tapping a card and returning with
 * the back arrow, so moving from the cause list to a case file meant going
 * back to the account screen first. On a phone that is a tax on every
 * journey. This puts the four places anyone actually goes one tap from
 * anywhere.
 *
 * What it offers depends on who is signed in, because the three audiences
 * do not share a destination beyond the library: an advocate's chamber, a
 * client's own matters, and a visitor who has neither.
 */

type Item = {
  label: string;
  href: Href;
  icon: typeof Home;
  /** Which screens count as "here", so a case file still lights up "Cases". */
  active: (pathname: string) => boolean;
};

const HOME: Item = {
  label: "Home",
  href: "/",
  icon: Home,
  active: (p) => p === "/",
};

const LIBRARY: Item = {
  label: "Library",
  href: "/library",
  icon: BookOpen,
  active: (p) => p.startsWith("/library"),
};

const ACCOUNT: Item = {
  label: "Account",
  href: "/account",
  icon: User,
  active: (p) => p === "/account",
};

const VISITOR: Item[] = [
  HOME,
  { ...LIBRARY, label: "Research", active: (p) => p === "/library" || p.startsWith("/library/a") },
  {
    label: "Judgments",
    href: "/library/judgments",
    icon: Gavel,
    active: (p) => p.startsWith("/library/judgments"),
  },
  { label: "Sign in", href: "/sign-in", icon: LogIn, active: (p) => p === "/sign-in" },
];

const STAFF: Item[] = [
  {
    label: "Cause list",
    href: "/diary",
    icon: CalendarDays,
    active: (p) => p.startsWith("/diary"),
  },
  { label: "Cases", href: "/files", icon: FolderOpen, active: (p) => p.startsWith("/files") },
  { label: "Clients", href: "/clients", icon: Users, active: (p) => p.startsWith("/clients") },
  LIBRARY,
  ACCOUNT,
];

const CLIENT: Item[] = [
  { label: "Your cases", href: "/cases", icon: FolderOpen, active: (p) => p.startsWith("/cases") },
  LIBRARY,
  ACCOUNT,
];

/**
 * Screens the bar stays off.
 *
 * A password that must be changed is a gate, not a screen: the layouts send
 * an account with `mustChangePassword` here and would send it straight back,
 * so offering a way out would only produce a loop. Registering a chamber is
 * a form part-way filled in, and a stray tap should not discard it.
 */
const HIDDEN = ["/change-password", "/sign-up"];

export function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const session = useSession();
  const insets = useSafeAreaInsets();

  if (HIDDEN.includes(pathname)) return null;

  // Nothing until we know who this is — a bar that changes under the reader's
  // thumb a moment after it appears is worse than one that arrives late.
  if (session.status === "loading") return null;

  const items =
    session.status === "signed-out"
      ? VISITOR
      : session.account.kind === "staff"
        ? STAFF
        : CLIENT;

  return (
    <View
      testID="bottom-nav"
      className="flex-row border-t border-rule bg-surface"
      style={{ paddingBottom: insets.bottom }}
    >
      {items.map((item) => {
        const here = item.active(pathname);
        const Icon = item.icon;

        return (
          <Pressable
            key={item.label}
            testID={`tab-${item.label}`}
            accessibilityRole="button"
            accessibilityState={{ selected: here }}
            accessibilityLabel={item.label}
            // `navigate` returns to a screen already open rather than stacking
            // another copy of it, so tapping between tabs does not build a
            // back stack twenty deep.
            onPress={() => router.navigate(item.href)}
            className="flex-1 items-center gap-1 py-2 active:bg-gold-wash"
          >
            <Icon size={22} color={here ? "#9a7622" : "#4b443a"} strokeWidth={here ? 2.4 : 1.8} />
            <Text
              numberOfLines={1}
              className={`text-[11px] ${here ? "font-semibold text-gold" : "text-ink-soft"}`}
            >
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

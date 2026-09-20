import { Facebook, Instagram, Linkedin, Youtube, type LucideIcon } from "lucide-react";
import type { SiteSettings } from "@/lib/site";

/**
 * The chamber's accounts. Only the ones actually set appear — an icon
 * linking nowhere is worse than no icon.
 */
const ACCOUNTS: { key: string; label: string; icon: LucideIcon }[] = [
  { key: "social.facebook", label: "Facebook", icon: Facebook },
  { key: "social.linkedin", label: "LinkedIn", icon: Linkedin },
  { key: "social.youtube", label: "YouTube", icon: Youtube },
  { key: "social.instagram", label: "Instagram", icon: Instagram },
];

export function Social({
  settings,
  className = "",
  iconClassName = "size-4",
}: {
  settings: SiteSettings;
  className?: string;
  iconClassName?: string;
}) {
  const present = ACCOUNTS.filter(({ key }) => settings[key]?.trim());
  if (present.length === 0) return null;

  return (
    <ul className={`flex items-center gap-3 ${className}`}>
      {present.map(({ key, label, icon: Icon }) => (
        <li key={key}>
          <a
            href={settings[key]}
            target="_blank"
            rel="noopener noreferrer me"
            aria-label={label}
            title={label}
            className="grid size-9 place-items-center rounded-full ring-1 ring-current/25 transition hover:ring-current/60"
          >
            <Icon className={iconClassName} strokeWidth={1.6} />
          </a>
        </li>
      ))}
    </ul>
  );
}

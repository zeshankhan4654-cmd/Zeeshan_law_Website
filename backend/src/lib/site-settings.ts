import { prisma } from "./prisma.js";

/**
 * The settings the public site reads.
 *
 * Every one of these is editable from Site Settings (Phase 6). The defaults
 * here exist so a fresh install renders correctly before anyone has touched
 * the table — they are not stand-ins for the firm's real details.
 *
 * Contact details are deliberately **empty** by default. A wrong telephone
 * number on a law firm's website is worse than no telephone number: it
 * sends a client in distress to a stranger. Every element that depends on
 * one is hidden until the value is set, so an unfilled setting shows
 * nothing rather than something invented.
 */
export const SITE_DEFAULTS = {
  "firm.name": "The Arbitrator & Law Associates",
  "firm.tagline": "Advocates, Arbitrators & Legal Consultants",
  // The chamber practises at the Peshawar High Court.
  "firm.address": "Peshawar High Court, Peshawar, Khyber Pakhtunkhwa",
  "firm.hours": "Monday to Saturday, 9am – 6pm",

  "contact.phone": "",
  "contact.phone2": "",
  "contact.email": "",
  "contact.whatsapp": "",
  /** Shown beside the floating WhatsApp button as its opening line. */
  "contact.whatsappMessage": "Assalam-o-Alaikum. I would like to consult the chamber.",
  /** A Google Maps place or directions URL. */
  "contact.mapUrl": "",
  /** The src of an embedded map iframe, if the office wants one. */
  "contact.mapEmbed": "",

  "social.facebook": "",
  "social.linkedin": "",
  "social.youtube": "",
  "social.instagram": "",
  "social.x": "",
} as const;

export type SettingKey = keyof typeof SITE_DEFAULTS;

export type SiteSettings = Record<SettingKey, string>;

/**
 * One chamber's settings, with any unset key falling back to its default.
 *
 * The chamber is always named: there is no "the settings" any more, and a
 * default here would be a quiet way to show one chamber's telephone number
 * on another's page.
 */
export async function publicSettings(firmId: number): Promise<SiteSettings> {
  const rows = await prisma.setting.findMany({
    where: { firmId, key: { in: Object.keys(SITE_DEFAULTS) } },
  });

  const stored = new Map(rows.map((r) => [r.key, r.value]));
  const out = {} as SiteSettings;

  for (const key of Object.keys(SITE_DEFAULTS) as SettingKey[]) {
    // An empty stored value means "not set", not "set to nothing" — there is
    // no setting here where a deliberate blank differs from an absent one.
    out[key] = stored.get(key)?.trim() || SITE_DEFAULTS[key];
  }

  return out;
}

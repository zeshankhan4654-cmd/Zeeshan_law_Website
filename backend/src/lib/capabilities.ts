/**
 * Every guarded action in the office names one of these. Which role holds
 * which is a row in role_caps, editable from Roles & Access — so an admin
 * can widen or narrow a role without a code change or a deployment.
 *
 * The Principal role is the one exception: it always holds everything, so
 * there is no way to lock yourself out of the account that grants access.
 */
export const CAPS = {
  Cases: {
    "cases.view": "See cases",
    "cases.edit": "Open and edit cases",
    "cases.delete": "Delete a case",
    "hearings.edit": "Record hearings",
    "updates.edit": "Post updates the client can see",
    "documents.edit": "Upload and share documents",
    "messages.reply": "Answer client questions",
  },
  Clients: {
    "clients.view": "See clients",
    "clients.edit": "Add and edit clients",
    "clients.delete": "Delete a client",
    "clients.portal": "Switch a client portal on and set its password",
  },
  Money: {
    "money.view": "See fees, official fees and expenses",
    "money.edit": "Record and remove money entries",
  },
  Diary: {
    "comms.view": "See the communications diary",
    "comms.edit": "Log communications",
  },
  Library: {
    "library.view": "See the library",
    "library.edit": "Add and edit library entries",
    "library.publish": "Publish to the public website",
    "library.delete": "Delete library entries",
  },
  Website: {
    "blog.edit": "Write and publish blog articles",
    "testimonials.edit": "Add and edit client reviews",
    "site.settings": "Change the address, numbers and social links",
  },
  Office: {
    "enquiries.view": "See website enquiries",
    "users.manage": "Create accounts, and set roles and access",
  },
} as const;

type CapGroup = keyof typeof CAPS;
export type Capability = { [K in CapGroup]: keyof (typeof CAPS)[K] }[CapGroup];

/** Every capability key, flattened, with its human label. */
export function allCaps(): Record<string, string> {
  const flat: Record<string, string> = {};
  for (const group of Object.values(CAPS)) {
    Object.assign(flat, group);
  }
  return flat;
}

/** The role that always holds every capability, whatever role_caps says. */
export const ROOT_ROLE = "admin";

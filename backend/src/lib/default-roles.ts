import type { FirmClient } from "./tenant.js";

/**
 * What a new chamber starts with.
 *
 * Every chamber gets its own copy of these rows rather than sharing a
 * platform-wide set, because a chamber may rename a role, change what it
 * grants, or add one of its own — "Add a role of your own" is a first-class
 * feature, and it would not be if the starting three were shared.
 *
 * Used by the seed for the first chamber and by sign-up for every one after
 * it, so the two cannot drift apart.
 */

export const DEFAULT_ROLES = [
  {
    roleKey: "admin",
    label: "Principal",
    description: "Everything, including accounts and deleting records",
    isSystem: true,
    sortOrder: 10,
  },
  {
    roleKey: "editor",
    label: "Clerk",
    description: "Day-to-day work, the diaries, the money, and the website",
    isSystem: true,
    sortOrder: 20,
  },
  {
    roleKey: "associate",
    label: "Colleague",
    description: "Case work only, with no money and no accounts",
    isSystem: true,
    sortOrder: 30,
  },
];

export const EDITOR_CAPS = [
  "cases.view", "cases.edit",
  "clients.view", "clients.edit", "clients.portal",
  "hearings.edit", "updates.edit",
  "documents.edit", "messages.reply",
  "money.view", "money.edit",
  "comms.view", "comms.edit",
  "library.view", "library.edit", "library.publish",
  "enquiries.view",
  "blog.edit", "testimonials.edit",
];

export const ASSOCIATE_CAPS = [
  "cases.view", "cases.edit",
  "clients.view", "clients.edit",
  "hearings.edit", "updates.edit",
  "documents.edit", "messages.reply",
  "comms.view", "comms.edit",
  "library.view", "library.edit",
  "enquiries.view",
];

/** Every default grant, as rows ready to write. */
export function defaultGrants(): { roleKey: string; cap: string }[] {
  return [
    ...EDITOR_CAPS.map((cap) => ({ roleKey: "editor", cap })),
    ...ASSOCIATE_CAPS.map((cap) => ({ roleKey: "associate", cap })),
  ];
}

/**
 * Gives one chamber its starting roles and capabilities.
 *
 * Idempotent, so it is safe on a re-seed as well as on a fresh chamber.
 * The Principal holds everything through `requireCap` whatever `role_caps`
 * says, which is why no grants are written for it.
 */
export async function seedChamberRoles(db: FirmClient, firmId: number): Promise<void> {
  for (const role of DEFAULT_ROLES) {
    await db.role.upsert({
      where: { firmId_roleKey: { firmId, roleKey: role.roleKey } },
      create: { ...role, firmId },
      update: role,
    });
  }

  for (const grant of defaultGrants()) {
    await db.roleCap.upsert({
      where: { firmId_roleKey_cap: { firmId, ...grant } },
      create: { ...grant, firmId },
      update: {},
    });
  }
}

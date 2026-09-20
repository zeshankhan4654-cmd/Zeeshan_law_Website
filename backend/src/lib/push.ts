import { env } from "../config/env.js";
import { ROOT_ROLE } from "./capabilities.js";
import { prisma } from "./prisma.js";

/**
 * Push notifications, through Expo's service.
 *
 * Two rules about *content*, which matter more here than anywhere else in
 * this codebase: a notification is rendered on a lock screen, in public, by
 * an operating system that does not know what a case is.
 *
 *  - A client is never told anything about their matter in a notification.
 *    "You have a hearing tomorrow" is useful; naming the case on the screen
 *    of a phone lying on a table is a disclosure the client did not agree
 *    to. The detail is in the app, behind the sign-in.
 *  - Staff are told how many matters are listed, not which. Same reasoning:
 *    a cause list glimpsed over a shoulder in a corridor is still a
 *    disclosure.
 *
 * Delivery is best effort by nature. Nothing here is allowed to fail the
 * request that triggered it — a client's message must be saved whether or
 * not the office's phones can be reached.
 */

export type Audience = "client" | "staff";

export type PushMessage = {
  title: string;
  body: string;
  /** Where tapping it should land, e.g. "/cases/12". */
  path?: string;
};

/** Expo's own shape, which is what actually goes over the wire. */
type ExpoPush = {
  to: string;
  title: string;
  body: string;
  sound: "default";
  data: { path?: string };
};

type ExpoTicket = { status: "ok" | "error"; id?: string; details?: { error?: string } };

/** Expo accepts at most 100 messages in one request. */
const CHUNK = 100;

/** Registers a device to the party that is signed in on it. */
export async function registerDevice(
  kind: Audience,
  subjectId: number,
  token: string,
  platform: string
): Promise<void> {
  // The token is unique across the table. A handset signing in as somebody
  // else is *reassigned*, which is what stops the previous holder's
  // notifications following the phone to its new owner.
  await prisma.pushToken.upsert({
    where: { token },
    create: { token, kind, subjectId, platform },
    update: { kind, subjectId, platform },
  });
}

/** Signing out takes the device off the list. */
export async function forgetDevice(token: string): Promise<void> {
  await prisma.pushToken.deleteMany({ where: { token } });
}

/** Every device currently registered to these parties. */
async function tokensFor(kind: Audience, subjectIds: number[]): Promise<string[]> {
  if (subjectIds.length === 0) return [];
  const rows = await prisma.pushToken.findMany({
    where: { kind, subjectId: { in: subjectIds } },
    select: { token: true },
  });
  return rows.map((r) => r.token);
}

function toExpo(token: string, message: PushMessage): ExpoPush {
  return {
    to: token,
    title: message.title,
    body: message.body,
    sound: "default",
    data: { path: message.path },
  };
}

/**
 * Hands a batch to Expo. Returns the tokens Expo says are dead, so they can
 * be dropped — an uninstalled app leaves a token behind that would otherwise
 * be retried forever.
 */
async function deliver(messages: ExpoPush[]): Promise<string[]> {
  const dead: string[] = [];

  for (let i = 0; i < messages.length; i += CHUNK) {
    const batch = messages.slice(i, i + CHUNK);

    const res = await fetch(env.push.apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(batch),
    });

    if (!res.ok) {
      console.error(`Push: Expo returned ${res.status}`);
      continue;
    }

    const payload = (await res.json()) as { data?: ExpoTicket[] };
    payload.data?.forEach((ticket, index) => {
      if (ticket.status !== "error") return;
      const reason = ticket.details?.error;
      // The app was uninstalled, or the token was rotated by the OS.
      if (reason === "DeviceNotRegistered") {
        const target = batch[index]?.to;
        if (target) dead.push(target);
      } else {
        console.error(`Push: ${reason ?? "unknown error"}`);
      }
    });
  }

  return dead;
}

/**
 * Sends one message to every device of the given parties.
 *
 * Never throws: a failure to notify is logged, not propagated. Returns how
 * many devices were addressed, which is what the reminder job reports.
 */
export async function notify(
  kind: Audience,
  subjectIds: number[],
  message: PushMessage
): Promise<number> {
  try {
    if (env.push.transport === "off") return 0;

    const tokens = await tokensFor(kind, subjectIds);
    if (tokens.length === 0) return 0;

    if (env.push.transport === "log") {
      console.log(
        `Push (log only) -> ${tokens.length} ${kind} device(s): ${message.title} — ${message.body}` +
          (message.path ? ` [${message.path}]` : "")
      );
      return tokens.length;
    }

    const dead = await deliver(tokens.map((t) => toExpo(t, message)));
    if (dead.length > 0) {
      await prisma.pushToken.deleteMany({ where: { token: { in: dead } } });
    }

    return tokens.length;
  } catch (err) {
    console.error("Push: could not notify", err);
    return 0;
  }
}

/** The staff who should hear about a client's question. */
export async function staffWithCapability(cap: string): Promise<number[]> {
  const grants = await prisma.roleCap.findMany({ where: { cap }, select: { roleKey: true } });
  const roles = grants.map((g) => g.roleKey);

  const users = await prisma.user.findMany({
    // The Principal always holds every capability, whatever role_caps says.
    where: { OR: [{ role: ROOT_ROLE }, { role: { in: roles } }] },
    select: { id: true },
  });
  return users.map((u) => u.id);
}

import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { apiFetch } from "./api";
import type { Audience } from "./session";

/**
 * Registering this handset to be told about its own matters.
 *
 * Everything here is best effort. A client who refuses notifications, or is
 * running in a simulator, or on the web, must still have a working app —
 * so every failure resolves to "no token" rather than an error the person
 * has to read.
 */

const ROUTES: Record<Audience, string> = { client: "/api/portal", staff: "/api/office" };

/**
 * Foreground behaviour: show it, since the app may be open in a pocket.
 * Skipped on the web target, which has no notification handler to set.
 */
if (Platform.OS !== "web") {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

/** Android needs a channel declared before anything will appear. */
async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync("default", {
    name: "Chamber notifications",
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 250, 250, 250],
  });
}

/**
 * This device's Expo push token, or null if it cannot have one.
 *
 * Null is an ordinary outcome: a simulator has no push service, the web
 * target has no token of this kind, and a person is entitled to refuse.
 */
export async function getPushToken(): Promise<string | null> {
  try {
    if (Platform.OS === "web") return null;
    // A simulator cannot receive a push, and asking produces an error
    // rather than a token.
    if (!Device.isDevice) return null;

    await ensureAndroidChannel();

    const existing = await Notifications.getPermissionsAsync();
    const granted =
      existing.granted || (await Notifications.requestPermissionsAsync()).granted;
    if (!granted) return null;

    // EAS builds carry the project id; without it Expo cannot mint a token.
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    const { data } = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    return data;
  } catch {
    // Not being reachable by notification is never worth an error on screen.
    return null;
  }
}

/** Tells the server this handset belongs to whoever just signed in. */
export async function registerDevice(audience: Audience, token: string): Promise<void> {
  const pushToken = await getPushToken();
  if (!pushToken) return;

  await apiFetch(`${ROUTES[audience]}/devices`, {
    method: "POST",
    token,
    body: JSON.stringify({ token: pushToken, platform: Platform.OS }),
  }).catch(() => undefined);
}

/**
 * Takes this handset off the list, before the session is dropped.
 *
 * This is the one that matters for privacy: a phone that is handed on, or
 * shared in a household, must stop receiving the previous holder's
 * notifications. The server also reassigns a token when somebody else signs
 * in on it, so this is the belt to that pair of braces.
 */
export async function unregisterDevice(audience: Audience, token: string): Promise<void> {
  const pushToken = await getPushToken();
  if (!pushToken) return;

  await apiFetch(`${ROUTES[audience]}/devices`, {
    method: "DELETE",
    token,
    body: JSON.stringify({ token: pushToken }),
  }).catch(() => undefined);
}

import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import { useSession } from "./session";

/**
 * Tapping a notification should land on the thing it is about.
 *
 * Two arrivals to handle: one tapped while the app is running, and one
 * tapped from cold, which the OS hands over as the "last response" once the
 * app has started.
 *
 * The path is only ever followed for a *signed-in* session, and each route
 * group gates itself anyway — so a notification that outlives its session
 * lands on the sign-in screen rather than anywhere it should not.
 */
export function useNotificationRouting(): void {
  const router = useRouter();
  const session = useSession();
  const handled = useRef<string | null>(null);

  const signedIn = session.status === "signed-in";

  useEffect(() => {
    if (!signedIn) return;
    // expo-notifications has no response API on the web target — asking for
    // one throws. The web build is a development convenience; notifications
    // are an iOS and Android feature.
    if (Platform.OS === "web") return;

    const go = (response: Notifications.NotificationResponse | null) => {
      if (!response) return;
      // The same cold-start response is handed over on every render; act once.
      const id = response.notification.request.identifier;
      if (handled.current === id) return;
      handled.current = id;

      const path = response.notification.request.content.data?.path;
      // Only in-app paths, and nothing that could be read as a URL.
      if (typeof path !== "string" || !path.startsWith("/") || path.startsWith("//")) return;

      router.push(path as never);
    };

    // A notification that arrived while the app was closed is handed over
    // once, after start. A failure to read it is not worth an error screen.
    void Notifications.getLastNotificationResponseAsync().then(go).catch(() => undefined);

    const subscription = Notifications.addNotificationResponseReceivedListener(go);
    return () => subscription.remove();
  }, [signedIn, router]);
}

import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import { useEffect } from "react";

/**
 * An advocate's client link, opened on a phone that has the app.
 *
 * An advocate sends their clients `https://<site>/client/login/<chamber>`.
 * On a phone with the app installed, Android and iOS hand that path here
 * instead of to the browser, and the client lands on the sign-in screen
 * with the chamber already filled in — which matters, because the chamber
 * is half of what identifies them and it is not something they should have
 * to read out of a URL.
 *
 * Also accepts the app's own scheme, `arbitratorlaw://client/<chamber>`,
 * which is what a QR code in a chamber's waiting room would carry.
 *
 * Nothing here signs anybody in. It fills in one field.
 */
const WEB_PATH = /^\/?client\/login\/([a-z0-9-]{1,64})\/?$/i;
const APP_PATH = /^\/?client\/([a-z0-9-]{1,64})\/?$/i;

export function chamberFromUrl(url: string): string | null {
  let path: string;
  try {
    path = Linking.parse(url).path ?? "";
  } catch {
    return null;
  }

  const match = WEB_PATH.exec(path) ?? APP_PATH.exec(path);
  // Lower-cased to match the slug as it is stored; a link typed by hand or
  // mangled by a messaging app should still work.
  return match?.[1]?.toLowerCase() ?? null;
}

export function useChamberLink(): void {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    const go = (url: string | null) => {
      if (cancelled || !url) return;
      const chamber = chamberFromUrl(url);
      if (chamber) router.push(`/sign-in?chamber=${encodeURIComponent(chamber)}`);
    };

    // The link that launched the app, if it was launched by one.
    void Linking.getInitialURL().then(go);

    // And any that arrives while it is already running.
    const subscription = Linking.addEventListener("url", (event) => go(event.url));

    return () => {
      cancelled = true;
      subscription.remove();
    };
  }, [router]);
}

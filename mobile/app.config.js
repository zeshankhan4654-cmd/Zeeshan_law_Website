/**
 * Expo config, as JavaScript rather than app.json so one setting can depend
 * on which profile is being built — see `usesCleartextTraffic` below.
 */

/**
 * Whether this build has to be allowed to speak plain HTTP.
 *
 * Android has refused it by default since Android 9, and a build talking to
 * a laptop on the office wifi (http://192.168.x.x) needs the exception or
 * every request fails with no useful error.
 *
 * Derived from the address the build will actually call, not from the
 * profile's name. Naming was the obvious way and it was wrong: it asked
 * whether the profile was called "production", so `apk` — the profile that
 * points at the live HTTPS API and goes onto real phones — shipped with the
 * exception enabled. A profile can be renamed or added; what decides
 * whether cleartext is needed is whether the API is reached over http, and
 * now that is what is asked.
 *
 * Unset means a developer running the dev server over the local network,
 * which does need it.
 */
const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? "";
const needsCleartext = apiUrl === "" || apiUrl.startsWith("http://");

/**
 * The domain the advocates' client links live on.
 *
 * An advocate sends a client `https://<site>/client/login/<chamber>`. The
 * declarations below ask Android and iOS to hand that path to the app
 * instead of the browser, so the client lands on the sign-in screen with
 * their chamber already filled in.
 *
 * Both platforms only honour this once the site serves a file proving it
 * agrees — `/.well-known/assetlinks.json` on Android and
 * `/.well-known/apple-app-site-association` on iOS, each naming this
 * application. Until those exist the link simply opens in the browser,
 * which still works; nothing breaks, the client just gets the web page.
 */
const SITE_HOST = process.env.EXPO_PUBLIC_SITE_HOST || "arbitratorandlaw.com";

/** @type {import('expo/config').ExpoConfig} */
module.exports = {
  /**
   * The product's name, in one place.
   *
   * Every screen reads this through `Constants.expoConfig.name` rather
   * than writing it out, so it is changed here and nowhere else.
   */
  name: "Lawyer360",
  slug: "lawyer360",
  scheme: "lawyer360",
  version: "0.1.0",
  orientation: "portrait",
  userInterfaceStyle: "light",
  newArchEnabled: true,
  icon: "./assets/icon.png",
  splash: {
    image: "./assets/splash-icon.png",
    resizeMode: "contain",
    backgroundColor: "#17140F",
  },
  ios: {
    supportsTablet: true,
    // Permanent once the app is in a store: Apple and Google will not let
    // it change afterwards. Set before the first submission, deliberately.
    bundleIdentifier: "com.lawyer360.app",
    associatedDomains: [`applinks:${SITE_HOST}`],
  },
  android: {
    // As with iOS: fixed for the life of the listing, and it is visible in
    // the Play Store address.
    package: "com.lawyer360.app",
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#17140F",
    },
    // See needsCleartext above: true only when this build's own API address
    // is plain http, so a build aimed at the live server cannot ship with
    // the exception however the profile is named.
    usesCleartextTraffic: needsCleartext,
    intentFilters: [
      {
        action: "VIEW",
        autoVerify: true,
        data: [{ scheme: "https", host: SITE_HOST, pathPrefix: "/client/login/" }],
        category: ["BROWSABLE", "DEFAULT"],
      },
    ],
  },
  web: {
    bundler: "metro",
    /**
     * One page; the router handles the rest in the browser.
     *
     * "static" writes a page per route and is better for a plain web host
     * — a refresh on /sign-in then works. It is set to "single" here
     * because the demonstration is served from a host that serves one
     * page, and every screen is reached by tapping rather than by URL.
     * Switch it back for a normal deployment.
     */
    output: "single",
    favicon: "./assets/favicon.png",
  },
  plugins: [
    "expo-router",
    "expo-secure-store",
    [
      "expo-notifications",
      {
        icon: "./assets/adaptive-icon.png",
        color: "#9a7622",
      },
    ],
    [
      "expo-av",
      {
        // Shown in the system permission dialogue, so it has to say why in
        // the client's terms rather than the app's.
        microphonePermission:
          "Allow the chamber to use the microphone so you can send a spoken note about your case.",
      },
    ],
  ],
  extra: {
    eas: {
      /**
       * Filled in the first time `eas build` runs.
       *
       * `eas init` writes this itself into an app.json, but cannot write
       * into a config file that is JavaScript, so it prints the id and
       * leaves it to you. This is where it goes — either set
       * EAS_PROJECT_ID in the environment, or replace this line with the
       * id in quotes.
       *
       * It is not only a build setting. The app reads it at runtime to
       * register the device for hearing reminders; see
       * src/lib/push-registration.ts, which falls back to the id baked
       * into an EAS build when this is empty.
       */
      projectId: process.env.EAS_PROJECT_ID,
    },
  },

  experiments: {
    typedRoutes: true,
  },
};

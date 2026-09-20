/**
 * Expo config, as JavaScript rather than app.json so one setting can depend
 * on which profile is being built — see `usesCleartextTraffic` below.
 */

// EAS sets this during a cloud build; it is undefined when running locally.
const profile = process.env.EAS_BUILD_PROFILE;
const isProduction = profile === "production";

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
    /**
     * Android has refused plain-HTTP traffic by default since Android 9.
     * A test build talking to a laptop on the office wifi (http://192.168.x.x)
     * needs this allowed, or every request fails with no useful error.
     *
     * It is derived from the build profile rather than hardcoded, so a
     * production build cannot ship with cleartext enabled even if somebody
     * forgets — production must reach the API over HTTPS.
     */
    usesCleartextTraffic: !isProduction,
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
  experiments: {
    typedRoutes: true,
  },
};

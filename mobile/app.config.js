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

/**
 * A build that answers from data inside itself, with no server behind it.
 *
 * It exists so the app can be installed and used — camera, file picker and
 * all — before the API is deployed, and so it can be handed to somebody
 * without giving them an account.
 */
const isDemo = process.env.EXPO_PUBLIC_DEMO === "1";

/**
 * A demonstration build makes no request of any kind, so it needs no
 * exception for plain HTTP. Without the first clause it got one: the rule
 * below reads an unset API address as "a developer on the office wifi",
 * which is right for a development build and wrong for this one. An APK
 * that permits cleartext for a network it never touches is a weakening
 * with nothing on the other side of it.
 */
const needsCleartext = !isDemo && (apiUrl === "" || apiUrl.startsWith("http://"));

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

/**
 * The EAS project id, which `eas init` prints and cannot write down itself.
 *
 * It writes the id into app.json, and this project's config is JavaScript,
 * so there is nothing for it to write into: it prints the id and leaves it
 * to a person to place. That is a step easily missed, and the build fails
 * afterwards with a message about a project that cannot be found, which
 * does not say what to do.
 *
 * So it can be put in a plain file next to this one — one line, the id and
 * nothing else — and is read from there when the environment does not
 * supply it. The file is ignored by git: an id belongs to whoever is
 * building, not to the repository.
 */
function easProjectId() {
  if (process.env.EAS_PROJECT_ID) return process.env.EAS_PROJECT_ID;
  try {
    const id = require("node:fs")
      .readFileSync(require("node:path").join(__dirname, "eas-project-id.txt"), "utf8")
      .trim();
    return id || undefined;
  } catch {
    return undefined;
  }
}

/** @type {import('expo/config').ExpoConfig} */
module.exports = {
  /**
   * The product's name, in one place.
   *
   * Every screen reads this through `Constants.expoConfig.name` rather
   * than writing it out, so it is changed here and nowhere else.
   */
  //
  // A demonstration build is a separate application on the handset, under
  // its own name and its own package. Sharing them would mean the sample
  // app and the real one could not both be installed: Android refuses to
  // put one over the other when the signing keys differ, which they do —
  // one is signed by the build service, the other by Play — and the error
  // it gives ("App not installed") says nothing about why.
  name: isDemo ? "Lawyer360 (sample)" : "Lawyer360",
  slug: "lawyer360",
  scheme: "lawyer360",
  /**
   * What the store listing shows. The build number beside it — Android's
   * versionCode, Apple's buildNumber — is kept by EAS and raised on every
   * build, which is why neither appears here (see appVersionSource in
   * eas.json). This is the number a person reads; that one only has to
   * increase.
   */
  version: "1.0.0",
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
    package: isDemo ? "com.lawyer360.app.demo" : "com.lawyer360.app",
    /**
     * Draw behind the status and navigation bars.
     *
     * Not a style choice. Android 16, which this build declares (API 36, see
     * expo-build-properties below), draws every app this way and no longer
     * lets one opt out. Saying so here is what installs the theme and the
     * window flags that go with it, and — the part that matters — what makes
     * react-native-safe-area-context report the real insets. Left unsaid,
     * Expo assumes the old behaviour, the inset readings disagree with what
     * the system is actually doing, and content slides under the clock.
     *
     * Every screen already keeps clear of the bars: the headers come from
     * the navigator, which applies the top inset itself, and the tab bar in
     * src/components/BottomNav.tsx adds the bottom one.
     */
    edgeToEdgeEnabled: true,
    /**
     * Permissions the build must not ask for.
     *
     * An app should ask for what it uses and nothing else, and the Play
     * Console asks a chamber to justify each of these by name.
     *
     * SYSTEM_ALERT_WINDOW is React Native's, for its developer menu, which
     * a release build has no use for. WRITE_EXTERNAL_STORAGE is declared by
     * the image picker and is legacy: nothing here writes outside the app's
     * own directories on any Android this build runs on.
     *
     * READ_EXTERNAL_STORAGE was blocked too and is no longer, because the
     * picker now exists and declares it for itself. On Android 13 and later
     * the system photo picker needs no permission at all and this one is
     * ignored; on Android 12 and earlier it is how a file is chosen, and
     * stripping a permission a library says it needs would have left
     * "choose a file" doing nothing on an older handset — which is not a
     * thing this machine can test for, and so not a thing to be clever
     * about. One declared permission that newer Androids ignore is the
     * cheaper mistake.
     */
    blockedPermissions: [
      "android.permission.SYSTEM_ALERT_WINDOW",
      "android.permission.WRITE_EXTERNAL_STORAGE",
    ],
    /**
     * Android 13's predictive back gesture — the peek at the screen behind
     * while a back swipe is held. Off, as Expo's own template has it: the
     * navigator has not opted into it, and turning it on without that makes
     * the peek show the wrong screen.
     */
    predictiveBackGestureEnabled: false,
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#17140F",
    },
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
      /**
       * The Android version the build is compiled and declared against.
       *
       * Google Play refuses an upload that declares an older Android than
       * its current floor, and that floor moves every August: since 31
       * August 2026 a new app has to declare Android 16 (API level 36) or
       * higher — see developer.android.com/google/play/requirements/target-sdk.
       *
       * The Expo SDK this project is on already defaults to 36, so this
       * block changes nothing today. It is written out because the number
       * is a store requirement rather than a preference: stated here, an
       * upgrade or a downgrade of the SDK cannot quietly drop the build
       * below what Play accepts, and the number to raise next August is in
       * the repository where it can be found.
       */
      "expo-build-properties",
      {
        android: {
          compileSdkVersion: 36,
          targetSdkVersion: 36,
          /**
           * See needsCleartext above: true only when this build's own API
           * address is plain http, so a build aimed at the live server
           * cannot ship with the exception however the profile is named.
           *
           * It belongs here rather than under `android` in this config,
           * where it sat until the generated manifest was read back. Expo
           * has no `android.usesCleartextTraffic` key: it was accepted in
           * silence and dropped, and the manifest came out the same either
           * way. The Play build was unharmed — cleartext is off by default
           * at this API level, which is what that build wants — but the
           * apk-local profile, whose whole purpose is to reach a laptop
           * over http on the office wifi, would have failed every request
           * with no useful error. A setting that is quietly ignored is
           * worse than one that is absent, because the comment beside it
           * says it is working.
           */
          usesCleartextTraffic: needsCleartext,
        },
      },
    ],
    [
      "expo-notifications",
      {
        icon: "./assets/adaptive-icon.png",
        color: "#9a7622",
      },
    ],
    [
      "expo-image-picker",
      {
        // Shown in the system dialogue, so it is written for the person
        // holding the telephone rather than for the developer.
        cameraPermission:
          "Allow the chamber to use the camera so a document can be photographed onto a case file.",
        photosPermission:
          "Allow the chamber to choose a picture so it can be put on a case file.",
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
  /**
   * Typed routes: `router.push("/cases/3")` is checked against the files in
   * app/, so a link to a screen that does not exist is a build error rather
   * than a blank screen. Expo still reads this flag, and the route
   * declarations in .expo/types are only written while it is set — removing
   * it silently turns the checking off, which is why it is still here.
   */
  experiments: {
    typedRoutes: true,
  },

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
      projectId: easProjectId(),
    },
  },
};

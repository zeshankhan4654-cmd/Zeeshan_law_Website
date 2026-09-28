# Building the phone app

The `.aab` for Google Play, and the `.apk` for putting on a handset now.

The native configuration below was generated from `app.config.js` and read
back on 28 September 2026, so these are the values a build actually
produces, not the ones the config appears to ask for. (Those two differed —
see `usesCleartextTraffic` in `app.config.js`.)

---

## What a build will produce

    package            com.lawyer360.app        (fixed for the life of the listing)
    version            1.0.0, versionCode 1     (EAS raises the code each build)
    compileSdk         36
    targetSdk          36                       Play's floor since 31 Aug 2026
    legacy packaging   false                    what 16 KB page alignment needs
    cleartext HTTP     false for the live server, true only for an http address

    permissions asked for:
        INTERNET
        READ_EXTERNAL_STORAGE      choosing a file on Android 12 and earlier
        RECORD_AUDIO               a client's spoken note
        MODIFY_AUDIO_SETTINGS      playing one back
        VIBRATE                    hearing reminders

    permissions stripped at merge:
        SYSTEM_ALERT_WINDOW        React Native's developer menu
        WRITE_EXTERNAL_STORAGE     legacy; nothing writes outside the app

Play asks you to justify each permission by name. That list is the answer.

---

## What you need first

1. **A free Expo account** — expo.dev. Email and a password.
   **Keep that password. Do not send it to me or to anyone.**
2. **Node on the server**, which cPanel's Node.js App already gives you.
3. The **server deployed** and `/privacy` live (see `docs-deploy.md`).
   A build points at the live API; if the server is behind, the app is
   broken on the screens that need the new endpoints.

---

## The build

In cPanel Terminal, in the repository folder:

    cd mobile
    npx eas-cli@latest login          # your Expo account
    npx eas-cli@latest init           # once; prints a project id

`init` prints a project id and cannot write it into `app.config.js`,
because that file is JavaScript. Put it in the environment instead:

    export EAS_PROJECT_ID=<the id it printed>

and add the same line to `backend/.env`-style startup config, or to your
shell profile, so later builds find it. The app also reads it at runtime to
register for hearing reminders.

Then, for the Play Store:

    npx eas-cli@latest build --platform android --profile production

or, for a file you can install on a handset today:

    npx eas-cli@latest build --platform android --profile apk

Expo builds it on their machines and prints a download link when it is
done — typically 10 to 25 minutes. The `.apk` link opens on the phone
directly; Android will ask you to allow installing from that source.

**Signing.** On the first build EAS offers to generate an upload keystore
and keep it. Say yes. That keystore is what proves later uploads are from
you: if it is lost, Google will not accept an update to the same listing.
EAS holds it; you can also download a copy with
`npx eas-cli@latest credentials`. Keep that copy somewhere you will still
have in five years.

---

## Uploading to Play

1. Play Console → **Create app**.
2. Fill the listing from `mobile/store/play-listing.md`. The screenshots,
   the feature graphic and the 512 icon are in `mobile/store/`.
3. **App access** — the reviewer's sign-in. Make it on the server first:

       cd backend
       npm run review:chamber

   This builds a separate chamber of invented matters and issues an
   associate account for it. It refuses to run against the chamber holding
   your real records. It prints the password once — put it in the Console
   and nowhere else.

4. **Data safety**, **Content rating** — answers are in the listing pack.
5. Upload the `.aab` to a **closed test** track first.

---

## The 14-day rule

A personal developer account registered after 13 November 2023 must run a
closed test with **at least 12 testers who remain opted in for 14
continuous days** before Google will grant production access.

Twelve real people with twelve Google accounts, who accept the invitation
and leave the app installed. It is the longest single step, and it cannot
be shortened. Start collecting the twelve email addresses while the
developer account is still being verified.

---

## If a build fails

Read the log link EAS prints; it names the failing step.

- **"Project id not found"** — `EAS_PROJECT_ID` is not set in the shell
  running the build.
- **"Keystore not configured"** — let EAS generate one when it asks.
- **Anything about SDK 36 or page size** — it should not happen; the values
  above are already what Play wants. Send me the log.

Do not work around a build failure by lowering `targetSdkVersion`. Play
refuses the upload, and the failure moves from your terminal to the
Console, where it costs a day.

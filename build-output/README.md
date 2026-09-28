# Lawyer360 — the file for Google Play

`Lawyer360-playstore.aab` is the app, packaged in the format the Play
Console accepts. Download it from this page and upload it to Play.

Built 28 September 2026 from the commit this branch points at.

    package        com.lawyer360.app
    version        1.0.0 (versionCode 1)
    targets        Android 16 (API 36)
    talks to       https://api.arbitratorandlaw.com
    signed with    the upload key whose certificate fingerprint is
                   D0:0C:11:A9:9E:03:66:E7:94:A1:93:33:CC:EF:11:49:
                   09:D4:B2:B1:C6:A5:0E:72:C1:73:0B:AE:03:61:E0:05

## The signing key is not in here, on purpose

The keystore and its password were sent separately and are deliberately
kept out of this repository. Anyone holding both can publish an update in
your name.

Keep them. If they are lost, Google will not accept an update to this
listing — not a new version, not a bug fix, ever. The listing would have
to be abandoned and started again under a new package name, and every
existing installation would be orphaned.

Somewhere you will still have in five years. Not only this laptop.

---

# `Lawyer360-sample-for-your-phone.apk` — to try on a handset

Download it **on the phone**, tap it, and allow the install when Android
asks. Android warns about files from outside the Play Store; that warning
is about where the file came from, not about this file.

    name on the phone   Lawyer360 (sample)
    package             com.lawyer360.app.demo
    built for           arm64 phones (every handset of the last decade)
    talks to            nothing — the sample data is inside it

A separate package from the store app on purpose, so this and the real
Lawyer360 can sit on the phone at once. Android refuses to install one
over the other when the signing keys differ, and says only "App not
installed", which explains nothing.

Everything in it is invented: no real client, no real matter, no real fee.
Nothing is saved — close it and open it again and it is as it was. Unlike
the browser demonstration, the camera and the file picker work.

Permissions it asks for, and nothing besides: internet, camera, microphone
and audio settings (for a client's spoken note), reading a file to attach,
vibration, and restarting reminders after the phone reboots.

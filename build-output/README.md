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

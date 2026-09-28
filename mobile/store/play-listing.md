# Lawyer360 — Google Play submission pack

Everything the Play Console asks for that can be written before the account
exists. Fill the Console from this; nothing here needs inventing twice.

Nothing in this file may be changed to claim a feature the app does not
have. A store listing is read as a representation, and an advocate's
listing more so than most.

---

## Store listing

**App name** (Play allows 30 characters)

    Lawyer360: Chamber Diary

**Short description** (80 characters)

    Your cause list, case files, fees and clients — on your chamber's own server.

**Full description** (Play allows 4000 characters)

    Lawyer360 is the working diary of a legal chamber, on the telephone in
    your pocket.

    YOUR DAY
    Open it and see the day: what is listed, what has to be done, what is
    overdue, and how many matters are live. Today, tomorrow, this week or
    this month — the same question with different dates. Add a thing to be
    done in one line and tick it off with one tap.

    YOUR MATTERS
    A case file holds what a case file holds: the case number, the court,
    the judge, the sections, the FIR particulars, which side you are on and
    who is against you, the stage it has reached, when it was filed and who
    in the chamber carries it. Hearings are recorded with the order sheet,
    who appeared, and the date given. Correct a hearing written up in haste
    without disturbing the cause list.

    YOUR CLIENTS
    A client with a father's name and a CNIC, so the right person is found
    when two share a name. Each client may be given a portal of their own:
    they see their own hearing dates and what you have chosen to post to
    them, and nothing else. Your internal notes, the order sheet, the
    outcome and any document you have not shared stay inside the chamber.

    FEES AND MONEY
    What was agreed, what has come in, what is still outstanding. Court fees
    the chamber lays out and recovers, marked until they are recovered.
    Expenses against a matter. A printable statement for a case or a client,
    and a record of when a client was last reminded.

    CALLS AND ENQUIRIES
    Who rang, which way round, what was said, and when to follow it up.
    Enquiries that arrive from your website land in the same log.

    YOUR LIBRARY
    Judgments, writing and recordings, on shelves you name. Keep a piece to
    the chamber, publish it to your own website, or share it.

    WHERE YOUR RECORDS LIVE
    On your own server. Lawyer360 connects to a chamber's own installation;
    your case files are not held by us and are not pooled with any other
    chamber's. A chamber's records are visible only to that chamber.

    WHO IT IS FOR
    Advocates, and the people who work with them. Staff accounts are issued
    by the chamber and each is given only what that person needs. Client
    accounts are issued by the chamber to its own clients.

    Lawyer360 requires an account on a chamber's Lawyer360 server. It is not
    a legal advice service, does not provide legal advice, and does not file
    anything with any court.

**Category**: Business
**Tags**: legal, diary, case management
**Contact email**: (the chamber's own — fill in the Console)
**Website**: https://arbitratorandlaw.com
**Privacy policy URL**: https://api.arbitratorandlaw.com/privacy

    This page is served by the backend (backend/src/routes/privacy.route.ts)
    and must be live and publicly reachable before submitting — the Console
    checks it. The deletion section is at #deletion, which is what the
    "account deletion" question wants.

---

## Screenshots

In `mobile/store/screenshots/`, 1080 x 1920, which is what Play wants for a
phone. Play requires at least 2 and allows 8; all eight are there.

They are taken from the demonstration build, so every name, matter and
figure in them is invented. That is deliberate: a store listing must not
carry a real client's name, a real case number or a real fee. The
demonstration banner is hidden in them because it is not part of the app
being listed.

Also in this folder:
- **`app-icon-512.png`** — 512 x 512, no transparency, which is what the
  Console requires. Made from `mobile/assets/icon.png`.
- **`feature-graphic.png`** — 1024 x 500. Required by Play, and shown at the
  head of the listing.

---

## Data safety form

Answer it from this. Every answer below is what the code actually does; if
the code changes, this changes with it.

| Question | Answer |
|---|---|
| Does the app collect or share user data? | Yes, collects. Does not share with third parties. |
| Is data encrypted in transit? | Yes — HTTPS. |
| Can a user request deletion? | Yes — the privacy page's deletion section says how. |
| Personal info — name | Collected. Purpose: app functionality. Required. |
| Personal info — email address | Collected. Purpose: app functionality, account management. |
| Personal info — phone number | Collected. Purpose: app functionality. |
| Personal info — other (CNIC, father's name) | Collected. Purpose: app functionality — identifying a client. |
| Files and docs | Collected. Purpose: app functionality — documents put on a case file. |
| Audio | Collected. Purpose: app functionality — a spoken note from a client. |
| Photos | Collected. Purpose: app functionality — photographing a document. |
| App activity / app info and performance | Not collected. |
| Location | Not collected. |
| Financial info | Fee amounts are recorded against a matter. These are the chamber's own accounting records, not the user's payment details. No payment information is collected; the app takes no payments. |
| Is any of it shared with third parties? | No. |
| Is data processed ephemerally? | No — it is stored, on the chamber's own server. |

A sentence for the "why" box, if asked: *Lawyer360 is installed by a legal
chamber on its own server. Records entered in the app are stored there, not
on infrastructure controlled by the developer, and are not pooled across
chambers.*

---

## App access

Play requires a working sign-in for the reviewer, because nothing past the
sign-in screen can be reached without one.

- Choose: **All or some functionality is restricted**
- Provide a staff account on the live server, created for this purpose:
  - Username / email: (to be created)
  - Password: (to be created — put it in the Console only, never in the repository)
  - Instructions: "Open the app, choose Advocate or staff, and sign in with
    the details above. Everything in the app is reached from the five tabs
    at the foot of the screen."

The reviewer's account should be a real account in a chamber holding only
invented matters, so that a reviewer never sees a real client's file.

---

## Content rating questionnaire

- Category: **Utility, Productivity, Communication or Other**
- Violence, sexual content, profanity, controlled substances: **No** to all
- Does the app allow users to interact or exchange content? **Yes** — a
  client and their chamber exchange messages about the client's own matter.
  It is not a social feature: a client can write only to their own chamber,
  about their own case, and to nobody else.
- Does it share the user's location? **No**
- Does it allow purchases? **No**

Expected outcome: rated for everyone / PEGI 3, which is right for it.

---

## Before the first upload

1. The privacy page must be live at the URL above.
2. The server must be running the current code, including the four
   migrations added for the diary, shelves, statements and reminders.
   An app built against an older server will fail on those screens.
3. The reviewer's account must exist and be tested by signing in with it.
4. `EAS_PROJECT_ID` must be set, or the id written into app.config.js —
   see the note there.

## What only the account holder can do

- Open the Google Play developer account (one-off fee, identity
  verification, takes a few days).
- A personal developer account registered after 13 November 2023 must run a
  closed test with at least 12 testers who stay opted in for 14 days before
  production access is granted. Twelve real people, on twelve devices.
- Create the Expo account the build runs under.

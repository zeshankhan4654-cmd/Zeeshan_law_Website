# The Play Store listing

Every field Google Play asks for, and the answer. The pictures beside this
file are made to the sizes Play accepts: `icon-512.png` (512x512),
`feature-1024x500.png` (1024x500), and eight phone screenshots at 1080x1920
in `screenshots/`, numbered in the order they should appear.

Nothing here may be changed once the app is published: the application id is
`com.lawyer360.app` and the first version is 1.0.0.

## Main store listing

**App name** (9 of 30)

```
Lawyer360
```

**Short description** (76 of 80)

```
Your cause list, your case files and your fees — your chamber's own records.
```

**Full description** (2688 of 4000)

```
Lawyer360 is the office system of a legal chamber, on the telephone the advocate already carries.

It is built around the way a practice actually runs: a cause list that has to be right before the court rises, a file that has to be found while standing in the corridor, a fee that has to be recorded before it is forgotten.


WHAT AN ADVOCATE GETS

• Cause list — what is listed today and across the coming fortnight, in the order the days fall, with the court and the purpose of each hearing.
• Case files — every matter in the chamber, searchable. Client, court, case type, next date, the history of hearings and what each one decided.
• Record a hearing — the date, the purpose, and afterwards the outcome, written while it is still fresh.
• Clients — who they are, how to reach them, and every matter the chamber acts for them in.
• Money — fees agreed and fees received, court fees and the chamber's own expenses, with what is still outstanding.
• Calls and enquiries — a note of what was said and when, which is what settles a dispute a year later about what the chamber advised.
• Your library — the chamber's own judgments, writing and recordings, kept privately or offered to the shared library.
• Your colleagues — who works in the chamber, and what each of them is allowed to see and do.


WHAT A CLIENT GETS

A sign-in issued by their own advocate, never signed up for here. It shows them their own matters and nothing else: the next date, what has happened so far, the documents the chamber has chosen to share, and a way to ask the office a question in writing or by speaking it.

What stays inside the chamber stays inside the chamber. Internal notes, and the chamber's own record of what a hearing decided, are never shown to a client.


THE SHARED LIBRARY

Legal research and reported judgments contributed by chambers across the country, open to every advocate, each entry naming the chamber that contributed it. Nothing appears there until it has been checked. Material in the library is general information, not advice on your matter.


YOUR RECORDS STAY YOURS

Every chamber on Lawyer360 has its own records, and no other chamber can reach them. That is not a promise about conduct: every record carries the chamber it belongs to, and the database refuses a query that reaches outside it.

Records are not sold, not shared with advertisers, and not used to train anything.


WHAT YOU NEED

A chamber account. An advocate can register one, or staff and clients are given a sign-in by the chamber they belong to.

Lawyer360 is a tool for keeping a practice's own records. It does not give legal advice, and nothing in it is a substitute for an advocate's own judgement.
```

**Release notes, 1.0.0** (161 of 500)

```
The first release.

The chamber's cause list, case files, clients, fees, contact log and library, and a client portal showing each client only their own matters.
```

## Store settings

| Field | Answer |
| --- | --- |
| App or game | App |
| Free or paid | Free |
| Category | Business |
| Tags | Legal, Business tools, Document management, Productivity, Note taking |
| Email address | The chamber's own, and one that is answered |
| Website | https://arbitratorandlaw.com |
| External marketing | Off |

## App content

| Section | Answer |
| --- | --- |
| Privacy policy | https://api.arbitratorandlaw.com/privacy |
| App access | Restricted. A working sign-in must be given to the reviewer. |
| Ads | None |
| Target audience | 18 and over; not appealing to children |
| News app | No |
| Government app | No |
| Financial features | None. The app records what a chamber has been paid; it takes no payments. |
| Health | No |
| Data deletion | https://api.arbitratorandlaw.com/privacy#deletion |

**App access is the one that fails reviews.** Almost everything here is behind
a sign-in, so a reviewer who is given none sees an empty shell and rejects the
app. The account made for them should be a chamber of its own with sample
matters, never the chamber's real records.

## Content rating

| Question | Answer |
| --- | --- |
| Category | Utility, productivity, communication or other |
| Violence, sexuality, language, controlled substances, crude humour, gambling, horror | No to all |
| Do users interact or exchange content? | Yes - a client and their own chamber exchange written and spoken messages |
| Is that interaction public? | No. A client sees only their own chamber and their own matters. |
| Can users share content they create? | Yes - a chamber may offer its own legal writing to a library other advocates read |
| Is that shared content reviewed? | Yes - nothing appears in the shared library until it is approved |
| Location shared? | No |
| Purchases? | No |

Expected outcome: Everyone / PEGI 3, with a note that users can interact.

## Data safety

Taken from what the code does, not from a template.

| Opening question | Answer |
| --- | --- |
| Collects or shares any required data type? | Yes |
| All data encrypted in transit? | Yes |
| A way to request deletion? | Yes |
| Processed only in memory? | No |

For every row below: collected **yes**, processed ephemerally **no**, required
**yes** (the microphone is optional), purpose **App functionality**. Only the
last row is shared.

| Type | What it is | Shared |
| --- | --- | --- |
| Name | The advocate's, the staff member's, the client's | No |
| Email address | Sign-in for an advocate or staff; a client's, if they have one | No |
| Phone number | The client's, so the office can ring them | No |
| Address | The client's, when recorded | No |
| User IDs | The username a chamber issues to a client | No |
| Other financial info | Fees agreed and received, court fees, chamber expenses | No |
| Voice or sound recordings | A spoken note a client sends about their own case | No |
| Other user-generated content | Case files, hearing records, messages, library writing | No |
| Device or other IDs | The notification token, so a hearing reminder can reach the phone | Yes - to Expo's notification service, for app functionality only |

Not collected, and the form should say so: location, contacts, photos,
calendar, browsing history, advertising identifier, and analytics of any kind.
There is no advertising SDK and no crash reporting service in the app.

## Still to be done by a person

1. Open the Google Play developer account. 25 US dollars once, with identity
   verification that takes a few days.
2. A new personal developer account must run a closed test with at least 12
   testers for 14 continuous days before the app may go public.
3. Deploy, so that the two privacy addresses above answer. Play checks them.
4. Build the .aab with EAS, which needs a free Expo account.
5. Make the reviewer's account and put it in the App access form.

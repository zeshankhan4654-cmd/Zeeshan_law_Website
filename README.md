# The Arbitrator & Law Associates — website, client portal & office system

A rebuild of the firm's chambers system on a modern stack, replacing the
original PHP/MariaDB build. Delivered in phases; each phase is one pushed,
working increment.

## Stack

| Layer | Choice |
|---|---|
| Frontend | Next.js 16 (App Router) + React 19 + TypeScript |
| Data fetching | TanStack Query |
| Styling | Tailwind CSS v4 (brand tokens in `frontend/src/app/globals.css`) |
| Icons | lucide-react |
| Motion | Framer Motion |
| Backend | Express + TypeScript |
| Validation | Joi |
| Database | PostgreSQL, via Prisma |
| Auth | JWT in an httpOnly cookie, bcrypt-hashed passwords |

## Monorepo layout

```
backend/     Express API — src/routes, src/middleware, src/lib, prisma/
frontend/    Next.js app — src/app (routes), src/lib, src/components
mobile/      Expo / React Native app — app (routes), src/lib
```

`backend` and `frontend` are npm workspaces under the root `package.json`.
No Lerna/Turborepo — the project doesn't need that weight yet.

**`mobile` is deliberately *not* a workspace.** React Native 0.76 requires
React 18.3.1 while the Next.js app requires React 19, so the two cannot share
a hoisted dependency tree — npm ends up nesting Expo's own packages where
Expo's Metro config can't resolve them. The mobile app installs its own
`node_modules` instead. It shares no code with the web app, only the HTTP API
contract, so nothing is lost by keeping the trees separate.

```bash
npm install                  # backend + frontend
npm run install:mobile       # mobile, separately
```

## Running it locally

Prerequisites: Node 22+, a local PostgreSQL server.

```bash
npm install                       # installs both workspaces from the root

# backend/.env — copy backend/.env.example, fill in DATABASE_URL with your
# own Postgres credentials and a random JWT_SECRET. Never commit this file.
#   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
cd backend
npx prisma migrate dev            # creates all 21 tables
npx prisma db seed                # seeds roles, capabilities, and a first
                                   # account: admin / admin123 — the app
                                   # forces a password change on first use
cd ..
npm run dev:backend               # http://localhost:4000

# frontend/.env.local — copy frontend/.env.example
npm run dev:frontend              # http://localhost:3000
```

Open `http://localhost:3000` — the home page confirms the frontend can reach
the backend and the backend can reach Postgres.

Try the API directly:

```bash
curl -c /tmp/c.txt -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

curl -b /tmp/c.txt http://localhost:4000/api/auth/me
```

## Chambers

Every advocate who uses this has their own chamber, and a chamber's work is
visible to nobody outside it. That is the single most important property in
the system: a query that forgets which chamber it is in does not return a
wrong number, it hands one advocate another advocate's privileged client
file.

**Every table that holds a chamber's work carries `firm_id`.** Twenty-one of
them do. The two that do not are `firms` itself and `rate_limits`, which is
deliberately global — somebody working through usernames is one attacker
whichever chamber they are guessing at, and the throttle runs before a
sign-in has said which chamber that would be.

**The scoping is not left to call sites.** `backend/src/lib/tenant.ts`
returns a Prisma client, built per request from the session's chamber, that
injects the firm into every query through a client extension. A route asks
for it with `tenant(req)` and then writes ordinary Prisma; a forgotten
`WHERE` is impossible rather than merely unlikely.

```ts
const { db, firmId } = tenant(req);
const cases = await db.case.findMany();   // this chamber's, always
```

Three things the extension does beyond filtering reads:

- A **create must name its chamber** — `data: { firmId, ... }`. The
  extension would happily inject it, and did in the first draft; requiring
  it is better, because the type system then makes every create site say
  which chamber the row belongs to, and a reviewer reading the line can see
  the scoping instead of trusting that a wrapper is doing it. Naming the
  *wrong* chamber throws.
- An **update cannot move a row** into another chamber. `firmId` is stripped
  from write payloads, because letting a row walk across the wall is the
  same leak by a different route.
- **Unfiltered `deleteMany({})` stops at the chamber's own records.**

Two limits, both of which fail loudly rather than silently: **nested writes**
into a scoped relation are not reached by the extension and hit the NOT NULL
constraint on `firm_id`; **`$queryRaw` bypasses extensions entirely** and is
never used on chamber data.

The list of scoped models is derived from the schema
(`Prisma.dmmf.datamodel`), not hand-written, so a model added later with a
`firmId` is protected the moment it exists rather than once somebody
remembers.

### Proving it, rather than arguing it

```bash
cd backend && npm run check:isolation
```

It creates two throwaway chambers, gives each real records — a client, a
case, a privileged message, a document, a fee, a setting, an article — and
then has each of them try to reach the other's by every route Prisma offers:
by id, by `findUniqueOrThrow`, through a list, through `count`, through a
`_sum` of fees, through `groupBy`, through both composite unique keys,
through `update`, `delete`, `updateMany`, `deleteMany`, an unfiltered
`deleteMany`, a create claiming the other chamber, an update trying to move a
row across, and an `upsert` aimed at the other chamber's row. Both
directions, because a one-way test passes on a bug that scopes the first
chamber correctly and the second not at all. It also fails if a model exists
with neither a `firmId` nor a stated reason.

51 checks. They all have to pass, and it cleans up after itself, so it is
safe against a development database.

### The public pages

Behind a sign-in the chamber comes from the session. The public website has
no session, so it is told: `PLATFORM_FIRM_SLUG` names the chamber this
deployment serves, and `backend/src/lib/platform.ts` resolves it once. Every
public query — settings, testimonials, articles, the library, and the
enquiry form's write — runs on that chamber's scoped client. Without it, the
moment a second advocate published an article it would appear on the first
one's website under the first one's name.

The public library is scoped the same way for now. The shared library, where
every chamber may contribute and the platform admin moderates what appears,
is a later milestone; until that moderation exists, another chamber
publishing an entry must not put it on this website unreviewed.

### What is still global

`users.username` and `clients.portal_username` remain unique across the
platform, not per chamber, because they are still how everyone signs in.
Sign-in therefore runs on the unscoped client — it is how we learn which
chamber somebody belongs to — and refuses a chamber that is not active,
after the password has been verified. Moving sign-in to email, so usernames
can be per-chamber, is the next milestone.

Push tokens are keyed by the token, which is global on purpose: one handset
is one device wherever its owner practises, and a phone signing in as
somebody else — including somebody in another chamber — is reassigned. The
row it writes still names its chamber, and notifications are only ever sent
to devices within one.

## Authentication & roles

No public sign-up, by design — client and staff accounts are both issued, not
self-registered, the same reasoning as the original build: a public
"create an account" page controlling access to real case files is a
liability, not a feature.

- A **role** (`admin`, `editor`, `associate`, or a custom one) grants a set of
  **capabilities** — `cases.view`, `money.edit`, `blog.edit`, and so on — via
  the `role_caps` table. The full list lives in
  `backend/src/lib/capabilities.ts`.
- The **admin** role is the one fixed point: `requireCap()` always lets it
  through, whatever `role_caps` says, so there is no way to lock the account
  that grants access out of granting it.
- A freshly created account carries `mustChangePassword: true`. Every route
  except `/api/auth/change-password` and `/api/auth/logout` refuses it with
  403 until that is cleared — enforced server-side
  (`requireNoPendingPasswordChange`), not just hidden in a UI.
- Eight wrong passwords in a row lock that identity out for fifteen minutes
  (`backend/src/lib/login-throttle.ts`), scoped by identity **and** IP so one
  bad actor doesn't lock out everyone else signing in from elsewhere.

### Two audiences, two kinds of session

Staff are rows in `users`; clients are rows in `clients`. Their ids overlap —
user 1 and client 1 both exist — so a session token carries the **kind** of
party it belongs to, and `SessionPayload` is a discriminated union rather than
a shared shape with an optional field. TypeScript then refuses `session.role`
on a client session, and a staff-only check cannot be written against a client
token by accident.

| | Office | Client portal |
|---|---|---|
| Sign in at | `POST /api/auth/login` | `POST /api/portal/login` |
| Guard | `requireStaff` | `requireClient` |
| Browser cookie | `session` | `portal_session` |
| Throttle scope | `office` | `client` |
| Holds capabilities | yes, via its role | never — access follows from whose case it is |

Presenting a client token to a staff route is a 403, and the reverse likewise.
There is deliberately **no "any signed-in party" guard**: every protected route
has to name the audience it serves, so none can be left open to both by
omission. A token in the pre-A2 shape, with no kind at all, is refused —
failing closed costs one sign-in, whereas guessing would hand a client a staff
session.

Two separate cookies matter for the browser: signing into the client portal in
the same browser must not sign you out of the office.

### Issuing a client a sign-in

There is no self-registration. Until Phase 5 puts this behind the Clients
screen, portal credentials are issued from the command line:

```bash
cd backend
npm run portal:issue -- "Fazal ur Rehman"
```

Every one of these commands acts on one chamber. It defaults to the chamber
this deployment's own website serves — `PLATFORM_FIRM_SLUG` — and any other
is named explicitly:

```bash
npm run portal:issue -- --firm some-other-chamber "Fazal ur Rehman"
```

The chamber it acted on is printed back above the password, so it can be
checked before anything is read down a telephone.

It creates the client if needed, switches the portal on, generates a password
and prints it **once** — only a bcrypt hash is stored, so it cannot be shown
again; run it again to issue a fresh one. The client is made to choose their
own password before they can go any further.

A chamber account is issued the same way, with the role it is to hold:

```bash
npm run staff:issue -- "Naveed Ahmad" associate
```

To see the portal and the diary doing their job before Phase 5 builds the
office screens that create real cases, there is one worked example:

```bash
npm run demo:data -- "Fazal ur Rehman"
```

Everything it writes is labelled `[DEMO]`, it refuses to run with
`NODE_ENV=production`, and re-running it replaces its own rows. It
deliberately includes an internal case note, an internal hearing outcome and
an unshared document — none of which should ever appear in the client's app —
and lists three further matters so the staff cause list has something on it,
one of them today.

## Design system & the office shell

`frontend/src/components/ui/` holds the primitives every later phase builds
pages from — Button, Card, Field, Badge, Table, Modal, Spinner, Skeleton —
each reading its colors and radii from the brand tokens in `globals.css`
rather than one-off values. The Modal is built on the native `<dialog>`
element (focus trapping, Escape-to-close and the backdrop all come from the
browser), so no dialog/overlay dependency was needed.

Three shells:

- **`(public)`** — the header, nav and footer every marketing page will sit
  inside once Phase 3 writes their real content.
- **`office/login`** and **`office/change-password`** — outside the
  protected shell, reachable even by an account that still owes a password
  change.
- **`office/(protected)`** — the sidebar shell. Its `layout.tsx` is a Server
  Component that calls `getSessionUser()` **before anything renders**: no
  cookie → redirect to login; a pending password change → redirect there;
  otherwise render `OfficeShell` with the signed-in user. This is a real
  gate, not a client-side check that flashes protected content first — it
  works with JavaScript disabled, and was verified with a fresh browser
  session hitting `/office` directly.

The sidebar nav (`frontend/src/lib/office-nav.ts`) is capability-driven, the
same way the old PHP app's was: each item optionally names a capability, and
`canSeeNavItem()` hides it unless the signed-in user's role holds that
capability (or the role is `admin`, which sees everything). Verified with two
real accounts — the Principal saw the full sidebar, and a Colleague account
saw Money and Website sections disappear entirely and Office reduced to just
Enquiries, matching `role_caps` exactly.

## The public site

Home, practice areas, the chamber, the library, writing, contact and a
client-portal page, all Server Components. A marketing site has no reason
to ship a data-fetching library to a visitor: only the enquiry form and the
narrow-screen menu are client components. Rendered pages revalidate every
five minutes, so a review or an article the office adds appears without a
redeploy.

**Everything renders with JavaScript switched off**, which is verified
rather than assumed. Two earlier attempts at the section animation failed
that test in instructive ways, and the comments in
`components/site/Reveal.tsx` record both:

- Framer Motion's `initial` is inlined during server rendering, so the
  page's own content was delivered at `opacity: 0` and stayed invisible
  until JavaScript hydrated — a blank practice-areas section for a crawler
  or a blocked script.
- A CSS scroll-driven timeline fixed that and broke the other end: an
  element already on screen at load never completes its `entry` range,
  because the page cannot be scrolled up any further, so the hero sat
  permanently half-faded.

What ships is a CSS load-time fade with no scroll position and no script to
wait on, skipped entirely for anyone who has asked for less motion.

## The office

Clients, cases, hearings, money, documents and the enquiries that arrive
from the website. Server Components with small client islands for the
actions, each refreshing the route on success so the server's copy stays
the only copy.

**This is what retires the command-line scripts.** A clerk adds a client,
switches their portal on and reads out the password, opens a case, records
a hearing and shares a document without touching a terminal. The whole
chain was tested that way in a browser, and then the client it created
signed in and saw exactly what had been shared with them.

### Issuing a password from a screen

The password is generated on the server, shown **once**, and stored only as
a bcrypt hash. The screen says so plainly, because a clerk who expects to
look it up later will write it down somewhere worse. `npm run portal:issue`
still exists for a database with no office running; both use the same
`lib/credentials.ts`, so they cannot drift.

### What a client sees is three separate decisions

Nothing about a case reaches a client by default:

- `Case.notes` and `Hearing.outcome` are the chamber's own and never leave
  it, whatever anyone ticks.
- A **document** is private until the office deliberately shares it — one
  click on the file, reversible.
- **Fees** are a per-client setting, off unless switched on.

All three were checked from both ends: the office sharing a document and
the client then seeing it; the office ticking the fees box and the fees
appearing; and the chamber's strategy note remaining absent throughout.

### Site Settings, and the end of the empty contact details

`/office/settings` is where the firm's real telephone number, email,
WhatsApp number, map link and social accounts go. Only the keys the site
reads may be written — an open key/value endpoint would let a typo sit in
the table looking as though it worked — and a social or map field must be
a whole `http(s)` URL, because a half-typed one renders as a broken icon on
every page.

Saving is verified end to end: a number entered here appeared on the public
contact page, and the floating WhatsApp button and Facebook link appeared
with it.

### Reviews and writing

Reviews are typed in from what clients actually wrote; the screen says so,
and nothing is seeded. Articles carry a slug derived from the title, a
cover photo, and a draft/published switch — unpublishing takes the article
**and its cover** off the website, which is checked.

A cover is served at `/api/site/posts/:slug/cover` rather than from the
upload directory, so the folder's contents are not part of the site's
public surface. (The Phase 3 blog card pointed at a `/uploads/...` path
that was never served; that is fixed here.)

### Accounts and roles

Both can lock people out, so both carry rules that cannot be turned off:

- The chamber must always keep at least one Principal. Demoting or deleting
  the last one is refused, and nobody can delete their own account.
- The Principal's own grants are not editable, because that role holds
  every capability in application code — including ones added later.
- A capability that the application does not define is dropped rather than
  stored, so a typo cannot sit in `role_caps` looking like a grant.

**A role change takes real effect**, which is tested rather than assumed:
granting the Reader role `money.view` through the screen made fees appear
on a case file for that user — while still offering them no way to record
one.

### Showing only what a role may do

The office screens now hide controls the signed-in role cannot use, the way
the mobile app already did. This was a real gap: a reader granted
`money.view` was being shown the add-fee form, which the API would always
have refused. Hiding it is a courtesy to the person, never the control —
every write is still checked server-side.

The same reasoning fixed the new-account form, which defaulted to the first
role in the list and so made **Principal** the default. A clerk clicking
briskly would have created an administrator without choosing to; the role
must now be picked explicitly.

### The diary, the ledgers and the library

The office is now complete: the communications diary (with overdue
follow-ups flagged, because that is the reason to open it), professional
fees read across every matter, official fees, office expenses totalled by
category, and editors for judgments, research and recordings.

Professional fees are read-only here on purpose. A fee belongs to a matter
and is recorded on that matter's own file, where the context is; this
screen answers "what is outstanding" across everything.

### The citation rule, enforced rather than remembered

**A judgment cannot be published without its citation.** That is the
chamber's own rule — nothing goes on the public site that has not been
checked against the report — and it lives in the API, so it holds whoever
is typing and whatever screen they are using. A draft may be as incomplete
as you like; a published entry may not. A recording likewise needs a link
before it can go up.

**Publishing is a capability of its own.** `library.edit` writes a draft;
`library.publish` puts it on the firm's public website under the firm's
name. A colleague holds the first and not the second, which is tested:
they may draft an article and are refused when they try to publish it, or
to take a published one down.

### The sidebar

Every screen the chamber has, grouped as the original build grouped them,
each item naming the capability that makes it visible — so a colleague's
sidebar is shorter than the Principal's.

## The client portal

At `/client`, gated the same way the office is: a Server Component reads
the session **before anything renders**, so a visitor never sees a flash of
somebody's case and it works with JavaScript disabled. It is a convenience,
not the control — the API refuses every one of these requests without a
valid client session regardless of what the page chooses to draw.

A client sees their matters, one matter in full (progress, hearings, shared
documents, and fees where the office has switched them on), and a thread for
asking the office a question. The office's own working notes, unshared
documents and hearing outcomes are absent, which the tests assert on the
rendered page rather than only in the JSON.

**Both audiences can be signed in at once in one browser.** The office holds
`session` and the portal holds `portal_session`, so a solicitor signed into
the office is *not* signed into the portal, signing into one does not
disturb the other, and neither cookie authenticates at the other's
endpoints. That was designed in phase A2 and is now actually exercised:
the test signs into both in the same browser and checks each still works.

**Voice notes work in the browser too**, through `MediaRecorder` — the same
feature as the app, for a client at a laptop. Playback needs the cookie to
ride with the media request, which takes `crossOrigin="use-credentials"` on
the audio element and a credentialed CORS allowance on the API. Unlike the
mobile app, this one could be tested properly: Chromium's fake audio device
produced a real 29 KB recording, which was stored under a generated name and
played back at 200 with the cookie and 401 without.

### Contact details are absent, not invented

`SITE_DEFAULTS` in `backend/src/lib/site-settings.ts` ships the firm's name,
tagline, address and hours. Every telephone number, email address, WhatsApp
number and social account is **deliberately empty**, and each element that
depends on one renders only once it is set.

A wrong telephone number on a law firm's website is worse than no telephone
number: it sends someone in difficulty to a stranger. The same reasoning
applies to reviews — none are seeded, because a fabricated client review is
not a placeholder, it is a lie about a real firm. Both are filled in from
Site Settings in Phase 6.

### The enquiry form

The only place an unauthenticated stranger writes to the database, so it
has three guards, none of which asks a person in difficulty to prove they
are human:

- a **honeypot** field hidden from people, answered exactly like a real
  submission so a script learns nothing from the response;
- Joi on the shape and length, including "leave a telephone number *or* an
  email address" — written as a value check rather than `.or()`, because
  Joi applies defaults first and both keys are then always present;
- **five an hour per address**, counted in the same `rate_limits` table the
  sign-in throttle uses. Rate limits are keyed on `req.ip`, so
  `TRUST_PROXY_HOPS` must match the deployment exactly — trusting
  `X-Forwarded-For` blindly would let a caller choose their own address.

## Going live

### The server refuses a development configuration

`backend/src/config/production-checks.ts` runs before anything else at
boot. With `NODE_ENV=production` it refuses to start on a short, guessable
or placeholder `JWT_SECRET`, a `DATABASE_URL` still carrying the example
password, a `CORS_ORIGIN` that allows `localhost` or plain `http://`, or a
push endpoint that is not https. It reports **everything** wrong at once,
with the command to generate a real secret, rather than one problem per
restart.

The checks are on configuration only — starting up never depends on
another service being awake.

> An earlier version of this also rejected any secret containing the word
> "password", which threw out a perfectly good database password. A check
> that blocks a correct deployment is worse than the mistake it guards
> against, so weakness is judged by length and character variety, not
> vocabulary.

### Backups

```bash
cd backend && npm run backup -- /path/to/backups
```

```cron
15 2 * * *  cd /path/to/backend && ./scripts/backup.sh /backups >> /var/log/chambers-backup.log 2>&1
```

It takes **both** halves — the database and the uploaded files — because
either alone is useless: a dump restores a case file pointing at a document
nobody can open, and the uploads are a folder of hex filenames with no idea
what they are. It verifies the dump is readable and contains the tables it
should before deleting anything old, keeps 30 days
(`BACKUP_KEEP_DAYS`), and never prints the connection URL, because it runs
from cron into a log file and that URL carries the password.

**The restore is tested, not assumed.** The dump was restored into a
scratch database and compared against the live one: same 23 tables, same
row counts, content intact.

### Deploying

```bash
# 1. Bring the code across, then install only what is needed to run
npm ci --omit=dev

# 2. Build
npm run build:backend        # TypeScript -> backend/dist
npm run build:frontend       # Next.js production build

# 3. Apply migrations — deploy, never `migrate dev`, which can prompt
cd backend && npx prisma migrate deploy && npx prisma generate

# 4. Seed a first account, once, on an empty database
npx prisma db seed           # admin / admin123 — change it immediately

# 5. Start
npm run start -w backend     # node dist/index.js
npm run start -w frontend    # next start
```

Both processes need a supervisor that restarts them — systemd, pm2, or the
Node app manager in a hosting panel — and a reverse proxy terminating TLS
in front. Set `TRUST_PROXY_HOPS` to the number of proxies actually in
front of the API: rate limits are keyed on the caller's address, and
trusting `X-Forwarded-For` blindly lets a caller choose their own.

`UPLOAD_DIR` should point **outside** the repository, so a redeployment
cannot delete the clients' documents.

### Dependencies

`npm audit` reports **no vulnerabilities**.

Getting there meant moving to Next 16. Next 15 pinned `postcss` at exactly
`8.4.31`, which carried four advisories and which no `overrides` entry
could shift — the only fix was the major upgrade. It was done on its own,
after everything else worked, so that a regression would have an obvious
cause. Two things needed changing:

- **The ESLint config.** Next 15 had no flat config, so this project
  translated the old one through `FlatCompat`. Next 16's config contains a
  circular reference that the eslintrc validator cannot serialise, and lint
  died with a stack trace rather than a lint error. Next 16 ships real flat
  configs, which are now imported directly.
- **One genuine finding** from Next 16's stricter React rules: the mobile
  menu closed itself with `setState` inside an effect, which renders the
  page once with the menu still open and again without it. It now adjusts
  during render, which React documents as the alternative — and which also
  catches the back button, where a click handler would not.

Every browser suite was re-run afterwards: the public site, the client
portal including a recorded voice note, the whole office, capability
gating, rendering with JavaScript switched off, and both audiences signed
in at once. All passed, with no page errors.

## Conventions

- **TypeScript everywhere**, `strict: true`. No `any` without a comment
  explaining why.
- **Naming:** `camelCase` for variables/functions, `PascalCase` for React
  components and TypeScript types, `kebab-case` for file names except React
  component files (`PascalCase.tsx`), `SCREAMING_SNAKE_CASE` for environment
  variables.
- **No hardcoded config or secrets.** Anything environment-specific (URLs,
  credentials, ports) comes from `process.env`, validated once at startup
  (see `backend/src/config/env.ts`) rather than read ad hoc.
- **Server is the source of truth for validation.** Joi schemas on the
  backend are authoritative; any client-side checks are a courtesy, not the
  security boundary.
- **Errors:** the backend throws `ApiError` for expected failures (bad input,
  not found, unauthorized); everything else is logged in full server-side and
  reduced to a generic message before it reaches the client.
- **Commits:** one logical change per commit, imperative mood
  (`Add case detail route`, not `Added` or `Adding`).

## Phases

- [x] **Phase 0** — monorepo scaffold, tooling, walking skeleton
- [x] **Phase 1** — Postgres schema (Prisma, 21 tables) + authentication & roles
- [x] **Phase 2** — design system, shared UI primitives, office login &
      protected shell (client shell deferred to Phase 4, once client-portal
      auth exists to build it against)
- [x] **Phase 3** — public marketing site
- [x] **Phase 4** — client portal + login flows
- [x] **Phase 5** — office core: clients, cases, hearings, money, documents, enquiries
- [x] **Phase 6** — Site Settings, reviews, writing, accounts & roles,
      the communications diary, the money ledgers and the library editors
- [x] **Phase 7** — hardening & deployment

### The mobile app

Android and iOS, built on Expo, against the same Express API. Three
audiences: the public (a searchable case-law library, open to any lawyer —
no sign-in), clients (their own cases), and staff (the diary, at court).

- [x] **A0** — Expo app, brand tokens, navigation, talking to the live API
- [x] **A1** — Bearer-token auth on the API + the public Library (research
      searchable; judgments await verified citations)
- [x] **A2** — sign-in for clients and staff, tokens in the device keychain
- [x] **A3** — client tier: cases, hearings, documents, native voice notes
- [x] **A4** — staff tier: cause list and case files on the phone
- [x] **A5** — push notifications for hearing dates and new messages
- [x] **A6 (part)** — app icon, splash, EAS build profiles, installable
      preview APK. Store listings and privacy policy still to do, and are
      only needed for Play Store / App Store submission, not for the
      preview build.

#### What a client can see

`/api/portal/cases` and below. Three rules run through every route:

1. **Ownership is part of the query, never a check afterwards.** Every lookup
   carries `clientId` from the token in its `WHERE`, so there is no path that
   fetches a row first and remembers to compare second.
2. **A case that is not yours is 404, not 403.** A client should not be able
   to learn that case 812 exists from the shape of the refusal.
3. **Columns are listed, never spread.** `Case.notes` and `Hearing.outcome`
   are the office's own working notes; a `select` that names its columns
   cannot leak one added later either.

Documents are private unless the office deliberately marked one Shared, and
fees appear only for a client whose `portalShowFees` is on.

On the phone, `app/(client)/_layout.tsx` is the counterpart to the web's
Server Component gate: a deep link straight to `/cases/3`, or a token that
expired in a pocket, lands on the sign-in screen instead of a spinner that
never resolves. It is convenience — the API refuses the request either way.

#### What the chamber sees

`/api/office/...`, and the boundary is the opposite of the portal's. A client
is limited by *whose* case it is; staff are limited by *what their role may
do*. Money is the clearest case: a colleague can work a matter in full and
never see a rupee of it.

- `GET /diary` — the cause list, grouped by day. What the phone is actually
  for: standing in a corridor at half past eight wanting to know what is
  listed, where, and whose it is, with the client's number one tap away.
- `GET /cases`, `GET /cases/:id` — every matter, working notes included.
- `POST /cases/:id/updates` — a progress note the client sees.
- `POST /hearings/:id/outcome` — what happened. Internal, always.
- `POST /cases/:id/messages` — answering a client, which marks their
  outstanding questions on that case answered in the same transaction.
- `GET /messages/unanswered` — the list that ought to be empty.

`requireCap` decides what may be *done*; where a capability decides what to
*include* instead, the route asks `holdsCap` and omits the section. The app
hides a control the role does not hold, but that is a courtesy to the person
— the server checks the same capability on every request either way.

These routes are not mobile-specific: Phase 5's web office is built on them.

Verified across three roles against one case file:

| | Principal | Colleague | a custom "Reader" role |
|---|---|---|---|
| Open the file | yes | yes | yes |
| Chamber's own note | yes | yes | yes |
| Fees | yes | **no** | **no** |
| Record an outcome | yes | yes | **no** |
| Post a client update | yes | yes | **no** |
| Answer a client | yes | yes | **no** |

The Reader role was made by hand, holding `cases.view` and nothing else —
which is the schema's claim that a role of the chamber's own making is as
real as a shipped one, actually tested.

#### Voice notes

A client walking out of court will say in twenty seconds what they would
never sit down and type. That is the clearest reason this app is native
rather than a wrapped website.

Recordings are uploaded to `UPLOAD_DIR` under a **generated** name — a name
that arrives with an upload can contain `../`, a null byte, or simply collide
with someone else's file, so the original is kept in the database as a label
rather than used as a path. Every read goes back through `resolveStoredPath`,
which refuses anything landing outside the upload directory. Only audio types
on an allow-list are written at all, the extension comes from that list rather
than the filename, and `VOICE_NOTE_MAX_MB` (10 by default) caps the size — a
note to the office is a sentence, not a recording of the hearing. An upload
that is then found not to belong to the sender is deleted from disk again.

`backend/uploads/` is git-ignored: real client material never belongs in the
repository.

**One limitation worth knowing.** On iOS and Android the player sends the
bearer token with the media request, so a recording is as protected as
everything else. The web target cannot — an HTML audio element has no way to
carry headers — so playback fails there and says so. That affects
`expo start --web` only, never a built app.

#### Notifications

Through Expo's push service. Four things are sent: the chamber hears when a
client writes in, the client hears when the chamber replies or posts a
progress note, and both hear the evening before a hearing.

**What a notification is allowed to say** matters more here than anywhere
else in this codebase, because it is rendered on a lock screen, in public, by
an operating system that does not know what a case is.

- A client is never told anything *about* their matter. "You have a hearing
  tomorrow" is useful; naming the case on a phone lying on a table is a
  disclosure they did not agree to.
- Staff are told how many matters are listed, not which — a cause list
  glimpsed over a shoulder is still a disclosure.
- A client's question never appears in the notification the office receives.

The detail is in the app, behind the sign-in. Tapping carries you to it.

**A phone that changes hands.** The push token is unique in the table, so a
handset that somebody else signs in on is *reassigned*, not shared — the
previous holder's notifications stop reaching it at that moment. Signing out
also deregisters the device explicitly, before the session token it needs to
do so is dropped. Both halves were tested.

Delivery is best effort by design: `notify()` never throws, so a client's
message is saved whether or not the office's phones can be reached. A token
Expo reports as `DeviceNotRegistered` — an uninstalled app — is deleted
rather than retried for ever, and batches are split at Expo's limit of 100.

**Hearing reminders** are a daily job rather than anything in-process:

```bash
cd backend && npm run notify:hearings
```

```cron
30 16 * * *  cd /path/to/backend && /usr/bin/npm run notify:hearings
```

Each hearing carries `reminderSentAt`, set in the same step as the send, so a
second run the same day tells nobody twice — the failure mode of a cron entry
is running more often than you meant, not less.

The one entry sweeps every active chamber in turn. A chamber that errors is
logged and the sweep continues, because one bad record must not mean nobody
on the platform hears about tomorrow; the job then exits non-zero, which is
what makes cron send the mail. A suspended chamber is skipped.

`PUSH_TRANSPORT=log` prints what would be sent and sends nothing, which is
what a development machine wants; `expo` sends for real. `PUSH_API_URL` is
configurable so a test can point the real code path at a local stub.

Notifications are an iOS and Android feature. The web target has no
notification API and is guarded out of every call.

#### How the phone holds a session

React Native has no cookie jar, so the app keeps its token in the platform
keychain — Keychain Services on iOS, Keystore-backed encrypted preferences on
Android — via `expo-secure-store`, and presents it as `Authorization: Bearer`.
Same token, same signature, same expiry as the web's cookie; only the envelope
differs. It is restored on launch and re-checked against `/me`, so a token the
office has since revoked resolves to "signed out" rather than a broken screen.
Signing out drops the token *and* clears the TanStack Query cache, so nothing
fetched as one identity can be shown to the next.

`expo-secure-store` has no web implementation, so `expo start --web` falls back
to `localStorage`. That is a genuinely weaker store and is used only in
development, never in a shipped build.

**On Apple's review.** App Store guideline 4.2 rejects apps that are only a
wrapped website. The searchable library, offline case files, native voice
recording and push notifications are what carry the app past that bar — they
are the point of building native at all, not extras to add later if there is
time.

#### The app icon

`mobile/assets/` holds the launcher icon, the Android adaptive-icon
foreground, the splash mark and the web favicon — the same scales of justice
as the website, in brand gold on ink, drawn from the same 120-unit grid as
`logo.svg` so the mark on the phone is the mark on the site. Regenerate them
with `scripts/make-icons.php` if the mark ever changes.

The Android foreground is kept well inside the safe zone, because launchers
crop an adaptive icon to a circle or squircle and anything near the edge is
cut off.

**You will not see this icon in Expo Go.** Expo Go is a container running
your JavaScript, so it shows its own icon. Yours appears only in a real
standalone build (`eas build`), which is phase A6.

#### Getting a real installable APK on your phone

Expo Go is fine for looking at the app, but it shows Expo's icon and needs
the dev server running. A **preview build** is a real `.apk` you install and
keep — with your own icon on the home screen.

**This costs nothing and needs no Google Play account.** Only publishing to
the Play Store needs the $25 registration; a preview build is distributed
internally, straight from a download link.

You need a free Expo account (expo.dev), and the build runs on Expo's
servers — it cannot be produced from inside this repository alone.

```bash
cd mobile

npm run lan-ip          # prints this computer's address on your wifi
```

Put the address it prints into `mobile/eas.json`, under
`build.preview.env.EXPO_PUBLIC_API_URL`. Then:

```bash
npx eas login           # your free expo.dev account
npx eas build:configure # first time only — links the project to your account
npm run build:apk       # builds on Expo's servers, prints a download link
```

Open that link on the phone, install, done.

**Three things that will otherwise waste an evening:**

- **`localhost` is the phone.** A standalone build has no dev server to ask,
  so the API address has to be your computer's wifi address — that is what
  `npm run lan-ip` is for, and why `EXPO_PUBLIC_API_URL` is set per build
  profile. `npm run dev:backend` now prints the same address on startup.
- **Android blocks plain HTTP.** Since Android 9, `http://` is refused by
  default and the request fails with nothing useful in the log.
  `app.config.js` allows it — but only when the build profile is not
  `production`, so a shipped build cannot go out with it enabled. Production
  must reach the API over HTTPS.
- **Phone and computer must be on the same wifi**, and the backend running.

#### Running the app

```bash
npm run dev:backend          # the API it talks to
npm run dev:mobile           # Expo — scan the QR code with Expo Go
```

On a handset the API address is derived from whatever host Expo is served
from, so scanning the QR code is enough; no configuration. Set
`EXPO_PUBLIC_API_URL` to point somewhere else.

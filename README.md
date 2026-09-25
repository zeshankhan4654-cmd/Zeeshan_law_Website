# Lawyer360 — chambers, client portals and a shared library

A platform any advocate can register on: their own diary, their clients'
files, their chamber's accounts and their own library, private to their
chamber and reachable from a phone in a corridor outside court. Alongside
it, a library of judgments and research that every chamber contributes to
and every advocate can read.

It began as a rebuild of **The Arbitrator & Law Associates**' own chambers
system, replacing the original PHP/MariaDB build, and that chamber is
still the first tenant — this deployment also serves its public website at
arbitratorandlaw.com. Everything a chamber does is walled off from every
other; see **Chambers** below, which is the most important section here.

Delivered in phases; each phase is one pushed, working increment.

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
                                   # account. It PRINTS that account's
                                   # password once and keeps it nowhere;
                                   # copy it. The app forces a change on
                                   # first use.
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
  -d '{"username":"admin","password":"THE-ONE-THE-SEED-PRINTED"}'

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

It then checks what M2 added: that both chambers really do hold a
`naveed.ahmad` and a `fazal.rehman`, that two accounts still cannot share an
email address, that a chamber cannot reuse its own handle, that each
address resolves to its own chamber, and that one chamber's portal password
does not open the other chamber's identically-named client.

Then the platform-admin cases above, and the shared library's gate: that
publishing on a chamber's own site shares nothing, that offering is not
appearing, that an unverified chamber's work cannot be approved, that an
approved entry appears while an unoffered one does not, that suspending a
chamber or withdrawing its verification takes its contributions down and
restoring them brings them back, and that even an approved entry is still
not reachable through another chamber's own client.

83 checks. They all have to pass, and it cleans up after itself, so it is
safe against a development database.

### The shared library

The reason an advocate who already keeps a diary would download this: a
library of judgments and research that every chamber contributes to and
every chamber can read.

It is also the sharpest thing on the platform. An entry here is a legal
citation another advocate may carry into court on the strength of its
being here, and a wrong one — a misremembered number, a principle stated
too widely, a judgment since overruled — does damage a wrong telephone
number on a website does not. So the gate is real, and it has four parts:

1. **Nothing is shared by default.** A chamber's library is its own.
   Publishing an entry on the chamber's *own* website is a different
   decision and does not put it here — `published` and `share_state` are
   deliberately separate columns.
2. **Offering is deliberate, and reversible by the chamber.** An advocate
   may withdraw their own work at any time, approved or not, without
   asking anybody. It is their work.
3. **Only the platform admin approves**, one entry at a time, never in
   bulk, with the citation, the court and the principle in front of them
   and a standing reminder to check it against the report.
4. **Only for a verified chamber.** This is what verification is *for*. A
   chamber's own private work needs nothing from anybody; putting a legal
   citation in front of advocates who cannot check who wrote it needs
   somebody to have confirmed the name is real.

```
     private  --offer-->  pending  --approve-->  approved
        ^                    |                      |
        |                    +-----send back----> rejected
        +--------withdraw / take out----------------+
```

A rejection **must** say why — the API refuses one without a reason. A
chamber told only "no" cannot put the entry right, and will either give up
contributing or send the same thing again. The reason appears on their own
library screen, and offering it again clears it, because it belonged to
the version that was turned down.

Offering needs `library.publish`, not `library.edit`: it puts the
chamber's name in front of advocates who have never met them, which is the
same kind of decision as publishing on their own website, not the same
kind as writing a draft. What must be filled in to offer is stricter than
what must be filled in to publish — a shared judgment needs its citation,
its court, and a statement of what it decides, because it has to stand on
its own in front of somebody who cannot ask who wrote it.

**Approval is not permanent.** What the public actually sees is
`APPROVED_AND_STANDING`: approved, *and* the chamber still verified, *and*
the chamber still active. Both are re-checked at read time rather than
swept over rows, so suspending a chamber takes its contributions down with
it and restoring the chamber brings them back whole, with nothing written
either way. Withdrawing verification does the same.

Every entry carries **the chamber that contributed it**, on the list and
on the page. An advocate deciding whether to rely on a note needs to know
whose note it is, and the library now holds work from chambers a reader
has never heard of. The public detail routes name their fields explicitly
rather than returning whole rows: a whole row would carry `share_note`,
which can hold a moderator's reason, and `submitted_by`, which is a member
of another chamber's staff.

The moderation queue is the one screen in the console that shows a
chamber's content — and only content that chamber asked to put in front of
every advocate on the platform. Reading it is the point of being asked to
approve it.

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

### Registering a chamber

`POST /api/signup`, and the page at `/signup`, is the one place on the
platform where a stranger creates an account — deliberately, because the
product is that any advocate can register and keep their diary the same
afternoon. What it creates is a new, empty chamber: its own roles, its own
capabilities, its own Principal, and the wall above applying from its first
query. It is not a way into anybody else's.

Staff and clients *inside* a chamber are still issued, never self-
registered. An advocate adds their colleagues and sends their clients a
link. Only the advocate signs themselves up.

Every chamber starts **unverified**, with whatever enrolment number the
advocate typed stored as given and treated as proof of nothing. Anybody can
write "advocate" in a form. Verification deliberately restricts nothing
about a chamber's own private work — gating that on a manual check would
mean nobody could start on the day they joined — but it is what the
platform admin acts on, and what anything published in a chamber's name
will depend on.

**`PUBLIC_SIGNUP=off` closes the door entirely.** A deployment that is one
chamber's office rather than a platform — or one whose owner would rather
open gradually — sets it and nothing else changes: existing chambers carry
on, staff and clients are issued as before, and the platform admin can
still create a chamber by hand. The guard sits on the signup router rather
than its one handler, so another way in added later cannot be left open by
forgetting it, and it answers 403 rather than 404 because the refusal is a
decision worth stating to an advocate who may be welcome later. The website
and the app read the flag from `/api/site/settings` and stop offering what
the API would refuse. The default is on.

The rate limit on sign-up is loose on purpose (ten per address per six
hours). Mobile carriers here put very large numbers of people behind one
address and a courts building shares one, so a tight limit would turn away
real advocates far more often than it would stop anybody. What answers a
flood of invented chambers is that each starts unverified and can be
suspended, not the throttle.

### Who signs in with what

The two audiences differ, so their sign-ins do.

**Advocates and their staff sign in with an email address**, unique across
the platform. An address is already one person's and needs no chamber named
beside it, which is what lets `users.username` become a *handle* — unique
within the chamber, and what signs a case update. Two chambers may each
have a `naveed.ahmad`; before this, the second advocate to join would have
been told the name was taken by somebody in a chamber they cannot see.

**Clients sign in with a username, inside a chamber named by their link.**
A client may well have no email at all — an elderly litigant very often
does not — so they keep a username, unique within their advocate's chamber,
and the chamber comes from the link they were sent:
`/client/login/<chamber-slug>`. The office shows that link beside the
username and password when portal access is issued, and copies all three
together. It is also why a client of one chamber cannot reach another's:
the username alone does not identify anybody.

An unknown chamber at sign-in is answered exactly like a wrong password, so
the form cannot be used to find out who is on the platform. Sign-in
throttling for the portal is keyed by chamber *and* username, so a client
of one advocate cannot be locked out by somebody guessing at the same
common name in another chamber.

#### Accounts that pre-date email sign-in

The migration gave every existing account an address of
`<username>@<chamber-slug>.invalid`. `.invalid` is reserved by RFC 2606, so
it can never be a real domain and can never collide with somebody's real
address. It signs in perfectly well, but nothing can be sent to it, so the
office carries one line at the top of every screen for whoever holds one,
pointing at **My Account** — the one office screen that needs no capability
at all, because a person must always be able to change their own sign-in
without asking anybody. Changing the address needs the password as well as
the session: an unattended signed-in screen must not be enough to move
somebody's sign-in to an address the person at the keyboard controls.

Push tokens are keyed by the token, which is global on purpose: one handset
is one device wherever its owner practises, and a phone signing in as
somebody else — including somebody in another chamber — is reassigned. The
row it writes still names its chamber, and notifications are only ever sent
to devices within one.

### Running the platform

A handful of people run the platform itself. `users.platform_admin` says
who, and it is deliberately a property of a **person**, not of a chamber:
tying it to "any Principal of the first chamber" would mean that the day a
colleague is made Principal, they silently acquire the power to suspend
other advocates' practices.

It is granted only from a terminal, never through a screen — this is access
to the server, not merely an office session somebody left signed in:

```bash
cd backend
npm run platform:grant  -- zeshan@arbitratorandlaw.com
npm run platform:revoke -- somebody@example.com
npm run platform:grant  -- --list
```

Revoking the last one is refused, so the console cannot be made
unreachable.

The console is at `/platform`, and it shows every chamber, its size, when
it was last worked in, whether it is verified and whether it is active.
Two things can be done to a chamber: **verification**, which is a statement
that somebody checked this is really an advocate, and **suspension**, which
stops everybody in that chamber signing in — the advocate, their colleagues
and their clients.

A suspension requires a reason, because the reason is what the advocate is
shown when they try to sign in. Their clients are told only that the
chamber is not currently signing people in and to telephone it: why a
chamber is suspended is between the platform and the advocate, and it is
the advocate's to explain to their own clients. Nothing is deleted; the
work comes back whole on restore.

Every verification and suspension is written to `platform_audit` with who
did it and the reason they gave, and shown in the console. The power to
stop an advocate working should not be usable quietly. That table has no
foreign keys on purpose: the record must outlive both the admin's account
and the chamber it concerns.

A platform admin cannot suspend their own chamber — the console is reached
through a session in it, so they would be locking themselves out of the
thing that undoes it.

Deleting a chamber is deliberately **not** offered. It would erase an
advocate's entire practice on a cascade, with no undo and nothing exported
first. Suspension stops whatever a deletion would be reached for and leaves
the work intact. A real deletion needs an export beside it, and that is its
own piece of work.

#### What a platform admin cannot do

**Read inside a chamber.** Not as a matter of the console showing less than
it could — as a matter of there being nothing to show it with.

- Every read the console makes goes through
  `backend/src/lib/platform-stats.ts`, which returns counts, dates and
  chamber metadata. The rule is stated at the top of that file: no function
  in it may return a row, or a field of a row, from a chamber-scoped table.
  Chamber sizes come back through Prisma's `_count`, which cannot be coaxed
  into carrying a field of a related row, and "last activity" through a
  `groupBy` `_max` over a timestamp, which cannot carry a case title.
- There is no route anywhere on the platform that takes a chamber id and
  returns its records. A platform admin signed into the office reaches
  their own chamber and no other, exactly like everybody else, because the
  scoped client comes from their own session. Being a platform admin adds
  the console; it does not widen the office.
- The chamber search matches the chamber's own name, slug and enrolment
  number. It deliberately does not search clients or cases — a console that
  can answer "which chamber acts for X" is a console that reads inside
  chambers.

`npm run check:isolation` checks both halves: that a platform admin's
ordinary queries still see only their own chamber, and that nothing the
console returns contains a client name, a case title, a message body, a
document title or a setting value. It serialises the console's whole
response and searches it, so a field added later without thought fails the
check rather than shipping.

Someone who is not a platform admin is answered **404**, not 403, so the
console's existence is not confirmed to anybody poking at the address.

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

Clients do not register themselves — their advocate issues the sign-in. The
Clients screen does it in two clicks for anyone with `clients.portal`, and
shows the chamber's own link beside the username and password, with a
button that copies all three. From the command line:

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
own password before they can go any further. It prints the chamber's sign-in
link too: the username alone will not get a client anywhere, which is exactly
what stops another chamber's client reaching this one.

A chamber account is issued the same way, with the role it is to hold and the
address it will sign in with:

```bash
npm run staff:issue -- "Naveed Ahmad" associate naveed@example.com
```

The address is required for a new account and optional when resetting an
existing one, which then keeps the address it has. The handle it prints is
what signs their entries inside the chamber; the address is what they type
at sign-in.

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

Offering an entry to the **shared library** is stricter again, for a
reason spelled out there: a judgment then also needs its court and a
statement of what it decides, because it has to stand on its own in front
of an advocate who cannot ask who wrote it.

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
./scripts/deploy.sh
```

That is the whole of it. The script checks the configuration before it
changes anything, backs the database up, installs, builds, migrates,
seeds if the database is new, and then stops and tells you what to start
— deliberately, because on a hosting panel starting processes is the
panel's job and a script that fights it leaves two copies running.

What it does, and the two things worth knowing about each:

```bash
npm ci                       # everything, including devDependencies
npm run build:backend        # TypeScript -> backend/dist
npm run build:frontend       # Next.js production build
cd backend
npx prisma migrate deploy    # deploy, never `migrate dev`, which can prompt
npx prisma generate
npx prisma db seed           # only does anything on an empty database
```

**`npm ci`, not `npm ci --omit=dev`, and nothing is pruned afterwards.**
Omitting devDependencies is the usual instinct and it is wrong here
twice over. It removes `typescript` and `tailwindcss`, so neither build
runs at all; and it removes `prisma` and `tsx`, which this deployment
needs for the rest of its life — `prisma migrate deploy` on every future
release, and `tsx` for every operational script, including the daily
hearing-reminder cron and `platform:grant`, which is the only way anybody
becomes a platform admin. A pruned install fails at the first build, and
had it not, would have failed silently at half past four every afternoon.
The cost of keeping them is disk; none of it is reachable from the
running server.

**`NEXT_PUBLIC_*` is baked in at build time, not read at run time.** The
website's API address is compiled into the bundle, so `frontend/.env.production`
has to be right *before* `npm run build:frontend`, not before `next start`.
Getting this wrong produces a site that builds cleanly and then calls
`localhost` from the visitor's browser.

Both processes need a supervisor that restarts them — systemd, pm2, or the
Node app manager in a hosting panel — and a reverse proxy terminating TLS
in front. Set `TRUST_PROXY_HOPS` to the number of proxies actually in
front of the API: rate limits are keyed on the caller's address, and
trusting `X-Forwarded-For` blindly lets a caller choose their own.

`UPLOAD_DIR` should point **outside** the repository, so a redeployment
cannot delete the clients' documents. The deploy script refuses to run if
it points inside, and refuses again if the directory does not exist.

#### Once only, on a new deployment

```bash
cd backend
npm run platform:grant -- you@example.com   # the only way to make one
npm run platform:grant -- --list            # check
```

Then sign in as the seeded account and change its password. The API will
not let it do anything else until you have — and its address is a
`.invalid` placeholder, so change that too, from **My Account**.

**The seed prints that password once and stores only its hash.** It used to
be a fixed word written in `prisma/seed.ts`, which is safe only while
nobody outside can read the file. This repository is public, so it was not:
the account exists from the moment the database is seeded until somebody
signs in and changes the password, and the one thing `mustChangePassword`
still permits is that change. A starting password anyone can look up hands
that window, and the chamber's admin account with it, to whoever reaches
the deployment first. Copy it out of the deploy output; if you lose it
before signing in, delete the row and seed again.

Add the daily reminder sweep to cron:

```cron
30 16 * * *  cd /path/to/backend && /usr/bin/npm run notify:hearings
```

On a hosting panel that manages Node itself (cPanel's Node.js Selector and
the like), `npm` is inside the environment the panel made and is not on
cron's PATH, so that line finds nothing and the job fails every day in
silence. Activate the environment first — the panel shows the exact line,
and the Node version is part of the path:

```cron
30 16 * * *  . /home/<user>/nodevenv/<app root>/<version>/bin/activate && cd /path/to/backend && npm run notify:hearings
```

#### The app links

`frontend/public/.well-known/` holds the two files Android and iOS read
before they will hand a client's link to the app instead of the browser.
Both ship with placeholders and **neither works until you fill it in**:

- `assetlinks.json` needs the SHA-256 fingerprint of the Android signing
  key, from `eas credentials` after the first build.
- `apple-app-site-association` needs the Apple Team ID, as
  `TEAMID.com.lawyer360.app`.

Apple refuses that second file unless it is served as `application/json`,
and it has no extension, so Next guesses `application/octet-stream` and
iOS ignores it without saying why. `next.config.ts` sets the header
explicitly. Both files are served from the site root; check with
`curl -I https://<site>/.well-known/apple-app-site-association` and look
at the content type, not just the 200.

Until they are filled in, a client's link opens the web portal instead of
the app. Nothing breaks — they simply get the page.

#### Checking the deployment from outside

```bash
curl https://<api>/api/health                    # {"status":"ok","database":"connected"}
curl https://<site>/api/site/settings            # the chamber's own details
curl -I https://<site>/.well-known/apple-app-site-association
```

The API refuses to start in production on a configuration copied from a
development machine — a short or placeholder `JWT_SECRET`, a `localhost`
or `http://` origin — and prints everything wrong at once rather than one
thing at a time. If it will not start, read the message; it says what to
fix.

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

#### Signing in on the phone

The app carries all three audiences, and each signs in with what suits it.

An **advocate or member of staff** signs in with their email address, the
same as on the website. An **advocate with no chamber yet** registers one
from the phone — the one place in the app where somebody creates their own
account, and the reason an advocate who finds this in a store would keep
it: download, register, and the diary is there the same afternoon. The
screen afterwards gives them the link for their clients and a share sheet
to send it, because what an advocate actually does with that link is put it
into WhatsApp.

A **client** signs in with their username *and their chamber*. The chamber
comes from the link their advocate sent them, and the app claims that path:
tapping `https://<site>/client/login/<chamber>` on a phone with the app
installed opens the sign-in screen with the chamber already filled in
rather than the browser. `lawyer360://client/<chamber>` does the same,
which is what a QR code in a waiting room would carry. Typed by hand
otherwise — the field says it is the last part of the link.

Both platforms only honour the web link once the site serves a file saying
it agrees: `/.well-known/assetlinks.json` on Android and
`/.well-known/apple-app-site-association` on iOS, each naming the
application. **Neither is hosted yet.** Until they are, the link opens in
the browser, which still works — the client gets the web page instead of
the app, and nothing breaks.

Each account screen names its own chamber, warns an advocate whose address
is still a `.invalid` placeholder, and says plainly when a chamber is not
yet verified and what that does and does not restrict.

#### The product's name

The platform is **Lawyer360**. It is written in exactly two places:
`name` in `mobile/app.config.js`, which every screen of the app reads
through `Constants.expoConfig.name`, and `PLATFORM_NAME` in
`frontend/src/lib/platform-brand.ts`, which sign-up and the console read.
Renaming it is those two lines.

It is deliberately kept apart from any chamber's name. A chamber's public
website is that advocate's and carries their name from Site Settings;
sign-up and the console belong to the platform every chamber sits on. The
office in between shows whichever chamber you are signed into. The three
must not drift into each other, which is why none of them writes a name
out in place.

The store identifiers — `com.lawyer360.app` on both platforms — were set
before the first submission on purpose. Apple and Google both fix them
for the life of a listing, and the Android one is visible in the Play
Store address. They use the product's name rather than the first
chamber's domain, which is a choice worth knowing about: reverse-DNS
convention would use a domain the publisher controls.

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

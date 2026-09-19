# The Arbitrator & Law Associates — website, client portal & office system

A rebuild of the firm's chambers system on a modern stack, replacing the
original PHP/MariaDB build. Delivered in phases; each phase is one pushed,
working increment.

## Stack

| Layer | Choice |
|---|---|
| Frontend | Next.js (App Router) + TypeScript |
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

It creates the client if needed, switches the portal on, generates a password
and prints it **once** — only a bcrypt hash is stored, so it cannot be shown
again; run it again to issue a fresh one. The client is made to choose their
own password before they can go any further.

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
- [ ] Phase 3 — public marketing site
- [ ] Phase 4 — client portal + login flows
- [ ] Phase 5 — office core (cases, clients, money, diary)
- [ ] Phase 6 — office content tools (blog, reviews, settings, roles)
- [ ] Phase 7 — hardening & deployment

### The mobile app

Android and iOS, built on Expo, against the same Express API. Three
audiences: the public (a searchable case-law library, open to any lawyer —
no sign-in), clients (their own cases), and staff (the diary, at court).

- [x] **A0** — Expo app, brand tokens, navigation, talking to the live API
- [x] **A1** — Bearer-token auth on the API + the public Library (research
      searchable; judgments await verified citations)
- [x] **A2** — sign-in for clients and staff, tokens in the device keychain
- [ ] A3 — client tier: cases, hearings, documents, native voice notes
- [ ] A4 — staff tier: cause list and case files on the phone
- [ ] A5 — push notifications for hearing dates and new messages
- [x] **A6 (part)** — app icon, splash, EAS build profiles, installable
      preview APK. Store listings and privacy policy still to do, and are
      only needed for Play Store / App Store submission, not for the
      preview build.

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

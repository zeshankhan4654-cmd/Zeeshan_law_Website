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
```

Two npm workspaces under one root `package.json`. No Lerna/Turborepo — the
project doesn't need that weight yet.

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
- [ ] Phase 2 — design system: shared UI primitives, app shells
- [ ] Phase 3 — public marketing site
- [ ] Phase 4 — client portal + login flows
- [ ] Phase 5 — office core (cases, clients, money, diary)
- [ ] Phase 6 — office content tools (blog, reviews, settings, roles)
- [ ] Phase 7 — hardening & deployment

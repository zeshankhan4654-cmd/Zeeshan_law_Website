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
| Database | PostgreSQL, via Prisma (added Phase 1) |
| Auth | JWT in an httpOnly cookie (added Phase 1) |

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

# backend/.env — copy backend/.env.example and fill in your Postgres
# credentials. Never commit this file.
npm run dev:backend               # http://localhost:4000

# frontend/.env.local — copy frontend/.env.example
npm run dev:frontend              # http://localhost:3000
```

Open `http://localhost:3000` — Phase 0's home page confirms the frontend can
reach the backend and the backend can reach Postgres.

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
- [ ] Phase 1 — Postgres schema (Prisma) + authentication & roles
- [ ] Phase 2 — design system: shared UI primitives, app shells
- [ ] Phase 3 — public marketing site
- [ ] Phase 4 — client portal + login flows
- [ ] Phase 5 — office core (cases, clients, money, diary)
- [ ] Phase 6 — office content tools (blog, reviews, settings, roles)
- [ ] Phase 7 — hardening & deployment

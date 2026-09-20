#!/usr/bin/env bash
#
# Deploy Lawyer360 to a server.
#
#   ./scripts/deploy.sh
#
# Run from the repository root on the server, with backend/.env already
# filled in for production. It builds, migrates, and tells you what to
# start — it deliberately does not start or restart anything itself,
# because on a hosting panel that is the panel's job and a script that
# fights it leaves two copies running.
#
# Safe to run again on every deployment. The only step that is not is the
# seed, which refuses to do anything to a database that already has a
# Principal.

set -euo pipefail

cd "$(dirname "$0")/.."

say() { printf '\n\033[1m==> %s\033[0m\n' "$1"; }
die() { printf '\n\033[31mStopped: %s\033[0m\n\n' "$1" >&2; exit 1; }

# ---------------------------------------------------------------------------
# Before anything is changed
# ---------------------------------------------------------------------------
[ -f backend/.env ] || die "backend/.env is missing. Copy backend/.env.example and fill it in."

# Read it the same way the app will, so a mistake here is found before the
# build rather than at the first request.
set -a; . ./backend/.env; set +a

[ "${NODE_ENV:-}" = "production" ] || die "NODE_ENV in backend/.env is not 'production'."
[ -n "${DATABASE_URL:-}" ]         || die "DATABASE_URL is not set."
[ -n "${PLATFORM_FIRM_SLUG:-}" ]   || die "PLATFORM_FIRM_SLUG is not set. It names the chamber whose public website this serves."

# Anything a deployment must not be able to destroy has to live outside
# the tree the deployment replaces. Both of these have bitten before.
outside_repo() {
  case "${2:-}" in
    "")       die "$1 is not set in backend/.env." ;;
    /*)       ;;
    *)        die "$1 ($2) is a relative path, so it is inside the repository. A deployment would destroy it. Use an absolute path." ;;
  esac
  case "$2" in
    "$PWD"|"$PWD"/*)
      die "$1 ($2) is inside the repository. A deployment would destroy it. Move it elsewhere." ;;
  esac
  [ -d "$2" ] || die "$1 ($2) does not exist. Create it first."
}

outside_repo UPLOAD_DIR "${UPLOAD_DIR:-}"
outside_repo BACKUP_DIR "${BACKUP_DIR:-}"

say "Backing up the database before touching it"
# The destination is passed explicitly. Left to itself the backup script
# writes to ./backups — inside the repository, where this deployment
# would destroy the very thing it is there to roll back to.
[ -x backend/scripts/backup.sh ] || die "backend/scripts/backup.sh is missing or not executable."
( cd backend && ./scripts/backup.sh "$BACKUP_DIR" )

# ---------------------------------------------------------------------------
# Build
# ---------------------------------------------------------------------------
say "Installing"
#
# Everything, including devDependencies — deliberately, and not pruned
# afterwards.
#
# `--omit=dev` is the usual instinct and it is wrong here, twice over.
# It removes typescript and tailwindcss, so the build below cannot run at
# all; and it removes prisma and tsx, which this deployment needs for the
# rest of its life — `prisma migrate deploy` on every future release, and
# tsx for every operational script, including the daily hearing-reminder
# cron and `platform:grant`, which is the only way anybody becomes a
# platform admin. A pruned install fails at the first build and, if it
# somehow got past that, would fail silently at 4:30pm every day.
#
# The cost is disk. None of it is reachable from the running server.
npm ci

say "Building the API"
npm run build:backend

say "Building the website"
# NEXT_PUBLIC_* are baked in at build time, not read at run time, so they
# have to be present here or the built site will call the wrong address.
[ -f frontend/.env.production ] || [ -n "${NEXT_PUBLIC_API_URL:-}" ] \
  || die "frontend/.env.production is missing and NEXT_PUBLIC_API_URL is unset. The built site would call localhost."
npm run build:frontend

# ---------------------------------------------------------------------------
# Database
# ---------------------------------------------------------------------------
say "Applying migrations"
# deploy, never `migrate dev`: dev can prompt, and can reset.
( cd backend && npx prisma migrate deploy && npx prisma generate )

say "Seeding, if this is a new database"
# Idempotent: it skips the account and the articles if either already exists.
#
# DATABASE_URL is exported above, which matters — `prisma db seed` also
# loads backend/.env itself, and a stale one there would otherwise decide
# which database gets seeded.
( cd backend && npx prisma db seed )

# ---------------------------------------------------------------------------
# What is left for a person
# ---------------------------------------------------------------------------
say "Built. Start or restart these two, under something that keeps them up:"
cat <<'NEXT'

    backend    node dist/index.js          (from backend/)
    website    npx next start              (from frontend/)

  Then, once only, on a brand-new deployment:

    cd backend && npm run platform:grant -- you@example.com

  which is the only way anybody becomes a platform admin. Check it with
  `npm run platform:grant -- --list`.

  And sign in to change the seeded password immediately — the API refuses
  to let that account do anything else until you do.

NEXT

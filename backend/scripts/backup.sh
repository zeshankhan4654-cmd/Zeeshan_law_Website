#!/usr/bin/env bash
#
# A backup of everything the chamber cannot reconstruct: the database, and
# the uploaded files the database only holds names for.
#
#   ./scripts/backup.sh /path/to/backups
#
# Both halves matter. A database dump alone restores a case file that
# references a document nobody can open; the uploads alone are a folder of
# hex filenames with no idea what they are.
#
# For a nightly backup, a cron entry:
#   15 2 * * *  cd /path/to/backend && ./scripts/backup.sh /backups >> /var/log/chambers-backup.log 2>&1
#
set -euo pipefail

DEST="${1:-./backups}"
KEEP_DAYS="${BACKUP_KEEP_DAYS:-30}"
STAMP="$(date -u +%Y-%m-%d_%H%M)"

here="$(cd "$(dirname "$0")/.." && pwd)"
cd "$here"

# Read one value from .env without sourcing the whole file — a value
# containing a space or a quote would otherwise break the shell.
#
# One awk, not a pipeline: under `set -o pipefail`, `grep ... | head -1`
# closes the pipe early, grep dies of SIGPIPE, and the whole script exits 1
# before printing anything. Which is exactly what it did.
read_env() {
  awk -F= -v key="$1" '
    $1 == key {
      sub(/^[^=]*=/, "")
      gsub(/^"|"$/, "")
      print
      exit
    }
  ' .env 2>/dev/null || true
}

DATABASE_URL="${DATABASE_URL:-$(read_env DATABASE_URL)}"
UPLOAD_DIR="${UPLOAD_DIR:-$(read_env UPLOAD_DIR)}"
UPLOAD_DIR="${UPLOAD_DIR:-./uploads}"

if [ -z "${DATABASE_URL}" ]; then
  echo "No DATABASE_URL — set it in the environment or in backend/.env." >&2
  exit 1
fi

# Prisma's connection URL carries `?schema=`, which libpq does not
# understand — pg_dump refuses the whole URL with "invalid URI query
# parameter". Lift it out and pass it as pg_dump's own flag, so a chamber
# using a non-default schema still gets the right tables rather than
# silently the wrong ones.
PG_SCHEMA="$(printf '%s' "$DATABASE_URL" | sed -n 's/.*[?&]schema=\([^&]*\).*/\1/p')"
PG_URL="$(printf '%s' "$DATABASE_URL" | sed 's/[?&]schema=[^&]*//; s/?$//')"
SCHEMA_FLAG=()
if [ -n "$PG_SCHEMA" ]; then
  SCHEMA_FLAG=(--schema="$PG_SCHEMA")
fi

mkdir -p "$DEST"

DB_FILE="$DEST/chambers-db-$STAMP.sql.gz"
FILES_FILE="$DEST/chambers-uploads-$STAMP.tar.gz"

echo "Backing up the database…"
# --clean --if-exists so the dump can be restored over an existing database.
pg_dump --clean --if-exists --no-owner --no-privileges "${SCHEMA_FLAG[@]}" "$PG_URL" | gzip -9 > "$DB_FILE"

echo "Backing up uploaded files…"
if [ -d "$UPLOAD_DIR" ]; then
  tar -czf "$FILES_FILE" -C "$(dirname "$UPLOAD_DIR")" "$(basename "$UPLOAD_DIR")"
else
  echo "  (no upload directory at $UPLOAD_DIR — nothing to archive)"
  : > "$FILES_FILE"
fi

# A backup nobody has restored is a hope, not a backup. Check the dump is at
# least readable and contains the tables it should.
echo "Checking the dump…"
if ! gzip -t "$DB_FILE"; then
  echo "The database dump is corrupt. Not deleting anything." >&2
  exit 1
fi
# Read the table list once.
#
# Not `gzip -dc ... | grep -q` per table: grep -q exits on the first match,
# gzip takes a SIGPIPE, and `set -o pipefail` reports the whole pipeline as
# a failure — intermittently, depending on how much gzip had already
# written. It reported a table missing that was plainly in the dump.
schema_name="${PG_SCHEMA:-public}"
tables_in_dump="$(gzip -dc "$DB_FILE" | grep -o "CREATE TABLE ${schema_name}\.[a-z_]*" || true)"

for table in users clients cases case_messages documents; do
  case "$tables_in_dump" in
    *"${schema_name}.${table}"*) ;;
    *)
      echo "The dump is missing the '$table' table. Not deleting anything." >&2
      exit 1
      ;;
  esac
done

echo "Removing backups older than $KEEP_DAYS days…"
find "$DEST" -name 'chambers-*' -type f -mtime "+$KEEP_DAYS" -delete

echo
echo "  $DB_FILE    ($(du -h "$DB_FILE" | cut -f1))"
echo "  $FILES_FILE ($(du -h "$FILES_FILE" | cut -f1))"
echo
# The URL is NOT printed: this script runs from cron with its output going
# to a log file, and the connection URL carries the database password.
echo "To restore:"
echo '  gzip -dc '"$DB_FILE"' | psql "$DATABASE_URL"'
echo "  tar -xzf $FILES_FILE -C $(dirname "$UPLOAD_DIR")"

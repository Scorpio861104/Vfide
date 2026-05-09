#!/usr/bin/env bash
#
# v19.3 OP-5 complement: standalone restore-test for archived backups.
#
# `backup-db.sh` already has an in-line restore-test mode that verifies
# a backup at the moment it's created. That catches "the dump path
# itself is broken right now". It does NOT catch "a backup we made
# 30 days ago has bit-rotted on S3" or "the restore procedure works
# in cold-call drill conditions, not just in the warm cache of a
# fresh backup".
#
# This script runs the second kind of check: pick an archived backup
# (latest by default; specific filename or S3 key on request),
# download it, restore into a throwaway database, and verify schema +
# row counts look sane. Exit 0 if the backup is verifiably restorable,
# non-zero otherwise.
#
# Usage:
#   ./scripts/restore-test.sh                        # latest backup in ./backups/
#   ./scripts/restore-test.sh ./backups/vfide-X.sql.gz   # specific local file
#   BACKUP_S3_BUCKET=s3://... ./scripts/restore-test.sh  # latest S3 backup
#   ./scripts/restore-test.sh s3://bucket/key.sql.gz      # specific S3 key
#
# Required env:
#   RESTORE_TEST_DATABASE_URL — throwaway DB to restore into. The script
#     drops + recreates the schema in this DB. NEVER point this at
#     production. The script refuses to run if the URL contains
#     'prod' or matches DATABASE_URL exactly.
#
# Optional env:
#   BACKUP_S3_BUCKET — for S3-mode latest-backup discovery
#   MIN_EXPECTED_TABLES — minimum tables that must exist post-restore
#     (default: 20). Catches catastrophic schema-loss backups.
#   MIN_EXPECTED_ROWS_USERS — minimum rows in users table (default: 1).
#     Catches "we backed up an empty database" failures.
#
# Recommended cron:
#   Run weekly. Page on failure. The drill-frequency tradeoff: more
#   frequent = stronger guarantees but more S3 egress costs; weekly
#   is a good default.
#
# Requires: pg_restore (or psql), gzip, optional aws cli
set -euo pipefail

# ---------------------- safety: refuse production ----------------------

if [[ -z "${RESTORE_TEST_DATABASE_URL:-}" ]]; then
  echo "FATAL: RESTORE_TEST_DATABASE_URL not set." >&2
  echo "  Point this at a throwaway database (NOT production)." >&2
  exit 2
fi

if [[ "${RESTORE_TEST_DATABASE_URL,,}" == *prod* ]]; then
  echo "FATAL: RESTORE_TEST_DATABASE_URL contains 'prod'. Refusing." >&2
  exit 2
fi

if [[ -n "${DATABASE_URL:-}" ]] && [[ "$RESTORE_TEST_DATABASE_URL" == "$DATABASE_URL" ]]; then
  echo "FATAL: RESTORE_TEST_DATABASE_URL == DATABASE_URL. Refusing to overwrite production." >&2
  exit 2
fi

MIN_EXPECTED_TABLES="${MIN_EXPECTED_TABLES:-20}"
MIN_EXPECTED_ROWS_USERS="${MIN_EXPECTED_ROWS_USERS:-1}"

# ---------------------- locate the backup file ----------------------

BACKUP_TARGET="${1:-}"
TMPDIR="$(mktemp -d)"
trap 'rm -rf "$TMPDIR"' EXIT
LOCAL_DUMP=""

if [[ -z "$BACKUP_TARGET" ]]; then
  # No arg: pick latest from ./backups/ or S3 (if configured)
  if [[ -n "${BACKUP_S3_BUCKET:-}" ]]; then
    if ! command -v aws >/dev/null 2>&1; then
      echo "FATAL: BACKUP_S3_BUCKET set but 'aws' CLI not on PATH." >&2
      exit 2
    fi
    echo "[restore-test] discovering latest backup in $BACKUP_S3_BUCKET..."
    LATEST_KEY="$(aws s3 ls "$BACKUP_S3_BUCKET" | sort | tail -n1 | awk '{print $4}')"
    if [[ -z "$LATEST_KEY" ]]; then
      echo "FATAL: no backups found in $BACKUP_S3_BUCKET" >&2
      exit 2
    fi
    BACKUP_TARGET="${BACKUP_S3_BUCKET}${LATEST_KEY}"
  else
    LATEST_LOCAL="$(ls -1t ./backups/vfide-*.sql.gz 2>/dev/null | head -n1 || true)"
    if [[ -z "$LATEST_LOCAL" ]]; then
      echo "FATAL: no backup files found in ./backups/" >&2
      exit 2
    fi
    BACKUP_TARGET="$LATEST_LOCAL"
  fi
fi

# Resolve to local file
if [[ "$BACKUP_TARGET" == s3://* ]]; then
  if ! command -v aws >/dev/null 2>&1; then
    echo "FATAL: S3 target but 'aws' CLI not on PATH." >&2
    exit 2
  fi
  echo "[restore-test] downloading $BACKUP_TARGET..."
  LOCAL_DUMP="$TMPDIR/$(basename "$BACKUP_TARGET")"
  aws s3 cp "$BACKUP_TARGET" "$LOCAL_DUMP"
else
  if [[ ! -f "$BACKUP_TARGET" ]]; then
    echo "FATAL: backup file not found: $BACKUP_TARGET" >&2
    exit 2
  fi
  LOCAL_DUMP="$BACKUP_TARGET"
fi

echo "[restore-test] backup file: $LOCAL_DUMP ($(du -h "$LOCAL_DUMP" | cut -f1))"

# ---------------------- restore into throwaway DB ----------------------

echo "[restore-test] dropping + recreating throwaway schema..."
psql "$RESTORE_TEST_DATABASE_URL" -c "DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;" >/dev/null

echo "[restore-test] restoring dump..."
gunzip -c "$LOCAL_DUMP" | psql "$RESTORE_TEST_DATABASE_URL" >/dev/null 2>"$TMPDIR/restore.err"

if [[ -s "$TMPDIR/restore.err" ]]; then
  ERROR_LINES="$(grep -ci 'ERROR' "$TMPDIR/restore.err" || true)"
  if [[ "$ERROR_LINES" -gt 0 ]]; then
    echo "FATAL: $ERROR_LINES errors during restore. First 20:" >&2
    grep -i ERROR "$TMPDIR/restore.err" | head -20 >&2
    exit 3
  fi
fi

# ---------------------- verify shape ----------------------

TABLE_COUNT="$(psql "$RESTORE_TEST_DATABASE_URL" -tA -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public'")"
echo "[restore-test] tables in restored schema: $TABLE_COUNT"
if [[ "$TABLE_COUNT" -lt "$MIN_EXPECTED_TABLES" ]]; then
  echo "FATAL: only $TABLE_COUNT tables (expected >= $MIN_EXPECTED_TABLES). Backup is incomplete." >&2
  exit 4
fi

USERS_COUNT="$(psql "$RESTORE_TEST_DATABASE_URL" -tA -c "SELECT COUNT(*) FROM users" 2>/dev/null || echo 0)"
echo "[restore-test] rows in users table: $USERS_COUNT"
if [[ "$USERS_COUNT" -lt "$MIN_EXPECTED_ROWS_USERS" ]]; then
  echo "FATAL: only $USERS_COUNT users (expected >= $MIN_EXPECTED_ROWS_USERS). Backup may be empty." >&2
  exit 4
fi

# ---------------------- verify a few critical tables ----------------------

# These are tables whose absence would indicate catastrophic backup loss.
# Add more here as your schema evolves.
CRITICAL_TABLES=(users merchants invoices)
for tbl in "${CRITICAL_TABLES[@]}"; do
  EXISTS="$(psql "$RESTORE_TEST_DATABASE_URL" -tA -c "SELECT to_regclass('public.${tbl}') IS NOT NULL")"
  if [[ "$EXISTS" != "t" ]]; then
    echo "FATAL: critical table '${tbl}' missing from restored backup." >&2
    exit 4
  fi
done

echo "[restore-test] PASS — backup is verifiably restorable."
echo "[restore-test]   tables: $TABLE_COUNT"
echo "[restore-test]   users:  $USERS_COUNT"
echo "[restore-test]   critical tables present: ${CRITICAL_TABLES[*]}"
exit 0

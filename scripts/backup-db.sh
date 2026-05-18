#!/usr/bin/env bash
#
# Database Backup Script
#
# Creates a compressed pg_dump of the VFIDE database, optionally uploads
# the dump to S3-compatible remote storage, and supports a restore-test
# mode that verifies the dump can actually be loaded back.
#
# Usage:
#   ./scripts/backup-db.sh                       # local backup to ./backups/
#   BACKUP_DIR=/mnt/backups ./scripts/backup-db.sh
#
# OP-5 FIX: optional S3 upload + restore-test mode.
#
# To upload to S3 after dump (RECOMMENDED for production), set:
#   BACKUP_S3_BUCKET=s3://my-vfide-backups/db/
#   AWS_ACCESS_KEY_ID=...
#   AWS_SECRET_ACCESS_KEY=...
#   AWS_REGION=us-east-1
# Requires `aws` CLI on PATH. If aws is missing, the upload step is
# skipped with a warning so local-only operators still get a working
# backup. The S3 upload is at-least-once: a failed upload exits non-zero
# so cron/systemd will alert.
#
# To run a restore test (verify the just-dumped file is loadable), set:
#   RESTORE_TEST_DATABASE_URL=postgresql://test:test@localhost:5432/vfide_restore_test
# This runs `psql --dry-run`-style validation by piping the dump into a
# throwaway database. Does NOT modify the production DB. If this fails,
# the script exits non-zero so backups can never silently rot.
#
# Requires: pg_dump, gzip, DATABASE_URL
# Optional: aws (for BACKUP_S3_BUCKET upload), psql (for RESTORE_TEST_DATABASE_URL)
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-./backups}"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
FILENAME="vfide-${TIMESTAMP}.sql.gz"
OUTPATH="${BACKUP_DIR}/${FILENAME}"

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "ERROR: DATABASE_URL is not set" >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"

echo "Starting backup → ${OUTPATH}"
pg_dump "$DATABASE_URL" \
  --no-owner \
  --no-privileges \
  --format=plain \
  --verbose 2>/dev/null \
  | gzip -9 > "$OUTPATH"

SIZE=$(du -sh "$OUTPATH" | cut -f1)
echo "Backup complete: ${OUTPATH} (${SIZE})"

# OP-5: optional S3 upload
if [[ -n "${BACKUP_S3_BUCKET:-}" ]]; then
  if command -v aws >/dev/null 2>&1; then
    echo "Uploading ${OUTPATH} to ${BACKUP_S3_BUCKET}..."
    # Trailing slash on BACKUP_S3_BUCKET is preserved; aws cp handles either form.
    aws s3 cp "$OUTPATH" "${BACKUP_S3_BUCKET%/}/${FILENAME}" \
      --only-show-errors \
      --storage-class STANDARD_IA
    echo "Upload complete: ${BACKUP_S3_BUCKET%/}/${FILENAME}"
  else
    echo "WARNING: BACKUP_S3_BUCKET is set but 'aws' CLI not found; skipping upload." >&2
    echo "Install awscli (pip install awscli) to enable remote backup." >&2
    # Exit non-zero so cron/systemd alerts the operator that backups are not making it off-host.
    exit 2
  fi
else
  echo "INFO: BACKUP_S3_BUCKET not set; backup is local-only. Set it for production redundancy."
fi

# OP-5: optional restore test
if [[ -n "${RESTORE_TEST_DATABASE_URL:-}" ]]; then
  if command -v psql >/dev/null 2>&1; then
    echo "Running restore test against ${RESTORE_TEST_DATABASE_URL%@*}@..."
    # Wipe and reload the test DB to verify the dump is loadable.
    # We assume the test DB exists and is empty/throwaway; we DROP all
    # public objects first (idempotent) and load the dump.
    psql "$RESTORE_TEST_DATABASE_URL" -c "DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;" >/dev/null
    if gunzip -c "$OUTPATH" | psql "$RESTORE_TEST_DATABASE_URL" --quiet --set ON_ERROR_STOP=on >/dev/null; then
      echo "✅ Restore test passed: dump is loadable."
    else
      echo "❌ Restore test FAILED: dump cannot be loaded into a fresh DB." >&2
      exit 3
    fi
  else
    echo "WARNING: RESTORE_TEST_DATABASE_URL is set but 'psql' not found; skipping restore test." >&2
  fi
fi

# Prune backups older than 30 days
if [[ -d "$BACKUP_DIR" ]]; then
  PRUNED=$(find "$BACKUP_DIR" -name 'vfide-*.sql.gz' -mtime +30 -delete -print | wc -l)
  if [[ "$PRUNED" -gt 0 ]]; then
    echo "Pruned ${PRUNED} backup(s) older than 30 days."
  fi
fi

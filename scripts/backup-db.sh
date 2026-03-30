#!/usr/bin/env bash
#
# Database Backup Script
#
# Creates a compressed pg_dump of the VFIDE database.
# Designed to run as a cron job or manual pre-deploy step.
#
# Usage:
#   ./scripts/backup-db.sh                       # backup to ./backups/
#   BACKUP_DIR=/mnt/backups ./scripts/backup-db.sh  # custom output dir
#
# Requires: pg_dump, gzip, DATABASE_URL
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

# Prune backups older than 30 days
if [[ -d "$BACKUP_DIR" ]]; then
  PRUNED=$(find "$BACKUP_DIR" -name 'vfide-*.sql.gz' -mtime +30 -delete -print | wc -l)
  if [[ "$PRUNED" -gt 0 ]]; then
    echo "Pruned ${PRUNED} backup(s) older than 30 days."
  fi
fi

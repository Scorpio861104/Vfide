# Backup Restore Drill Runbook

## Backup Scope and Frequency

- Primary data scope: PostgreSQL application database and migration state.
- Backup cadence: daily logical backup plus weekly full restore verification.
- Retention guidance: keep at least 30 daily snapshots and 12 weekly snapshots.

## Restore Drill Procedure

1. Prepare a clean target database environment.
2. Restore a fresh logical backup with `pg_restore`.
3. Reinitialize local dependencies when needed with `npm run -s db:init`.
4. Verify migration state with `npm run -s migrate:status`.
5. Run integrity checks and critical user-flow validation.

Example commands:

```bash
pg_dump --format=custom --file vfide_backup.dump "$DATABASE_URL"
pg_restore --clean --if-exists --no-owner --dbname "$RESTORE_DATABASE_URL" vfide_backup.dump
npm run -s db:init
npm run -s migrate:status
```

## RPO and RTO Targets

- `RPO` target: <= 30 minutes.
- `RTO` target: <= 60 minutes.
- Every drill must capture measured RPO/RTO and compare against target thresholds.

## Evidence Capture Checklist

- Drill execution timestamp and environment.
- Backup artifact identifier or immutable reference.
- Measured RPO and measured RTO.
- Participant roster (at least three participants).
- Post-restore health-check evidence references.

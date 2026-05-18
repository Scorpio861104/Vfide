-- Rollback: Remove time locks, streams, enterprise orders tables
-- Created: 2026-01-31T09:00:00.000Z

BEGIN;

DROP TABLE IF EXISTS enterprise_orders;
DROP TABLE IF EXISTS streams;
DROP TABLE IF EXISTS time_locks;

COMMIT;

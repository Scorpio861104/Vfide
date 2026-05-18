-- Rollback: Remove subscriptions table
-- Created: 2026-01-31T12:00:00.000Z

BEGIN;

DROP TABLE IF EXISTS subscriptions;

COMMIT;

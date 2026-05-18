-- Rollback: Remove presence, subscriptions, reports tables
-- Created: 2026-01-31T10:00:00.000Z

BEGIN;

DROP TABLE IF EXISTS message_reports;
DROP TABLE IF EXISTS user_presence;

COMMIT;

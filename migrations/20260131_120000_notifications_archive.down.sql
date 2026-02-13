-- Rollback: Remove archived and updated_at columns from notifications
-- Created: 2026-01-31T12:00:00.000Z

BEGIN;

ALTER TABLE notifications DROP COLUMN IF EXISTS updated_at;
ALTER TABLE notifications DROP COLUMN IF EXISTS archived;

COMMIT;

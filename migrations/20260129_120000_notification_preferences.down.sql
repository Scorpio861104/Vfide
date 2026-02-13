-- Rollback: Remove notification preferences columns
-- Created: 2026-01-29T12:00:00.000Z

BEGIN;

ALTER TABLE notifications DROP COLUMN IF EXISTS enabled;
ALTER TABLE notifications DROP COLUMN IF EXISTS muted_until;
ALTER TABLE notifications DROP COLUMN IF EXISTS category;

COMMIT;

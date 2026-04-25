-- Migration: add archived and updated_at to notifications
-- Created: 2026-01-31T12:00:00.000Z

BEGIN;

ALTER TABLE notifications ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT FALSE;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_archived ON notifications(archived);

COMMIT;

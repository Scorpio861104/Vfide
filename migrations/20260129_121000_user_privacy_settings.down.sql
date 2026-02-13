-- Rollback: Remove user privacy settings table
-- Created: 2026-01-29T12:10:00.000Z

BEGIN;

DROP TABLE IF EXISTS user_privacy_settings;

COMMIT;

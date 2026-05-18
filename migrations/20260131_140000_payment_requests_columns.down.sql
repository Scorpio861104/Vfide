-- Rollback: Remove payment request columns
-- Created: 2026-01-31T14:00:00.000Z

BEGIN;

ALTER TABLE payment_requests DROP COLUMN IF EXISTS memo;
ALTER TABLE payment_requests DROP COLUMN IF EXISTS token;
ALTER TABLE payment_requests DROP COLUMN IF EXISTS to_user_id;
ALTER TABLE payment_requests DROP COLUMN IF EXISTS from_user_id;

COMMIT;

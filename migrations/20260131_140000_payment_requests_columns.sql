-- Migration: extend payment_requests columns
-- Created: 2026-01-31T14:00:00.000Z

BEGIN;

ALTER TABLE payment_requests ADD COLUMN IF NOT EXISTS from_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE payment_requests ADD COLUMN IF NOT EXISTS to_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE payment_requests ADD COLUMN IF NOT EXISTS token VARCHAR(20) DEFAULT 'ETH';
ALTER TABLE payment_requests ADD COLUMN IF NOT EXISTS memo TEXT;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payment_requests_from_user ON payment_requests (from_user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payment_requests_to_user ON payment_requests (to_user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payment_requests_status ON payment_requests (status);

COMMIT;

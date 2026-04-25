-- Migration: Two-factor codes for SMS/email verification
-- Created: 2026-01-30T13:10:00.000Z

BEGIN;

CREATE TABLE IF NOT EXISTS two_factor_codes (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  method VARCHAR(20) NOT NULL,
  destination TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  attempts INTEGER DEFAULT 0,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_two_factor_codes_user_method ON two_factor_codes(user_id, method);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_two_factor_codes_expires_at ON two_factor_codes(expires_at);

COMMIT;

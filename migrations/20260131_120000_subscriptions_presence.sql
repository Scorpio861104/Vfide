-- Migration: Subscriptions and user presence
-- Created: 2026-01-31T12:00:00.000Z

BEGIN;

CREATE TABLE IF NOT EXISTS subscriptions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  merchant_address VARCHAR(42) NOT NULL,
  merchant_name VARCHAR(100),
  amount DECIMAL(18, 6) NOT NULL,
  frequency VARCHAR(20) NOT NULL,
  next_payment TIMESTAMP NOT NULL,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);

-- Note: user_presence table created in 20260131_100000_presence_subscriptions_reports.sql

COMMIT;
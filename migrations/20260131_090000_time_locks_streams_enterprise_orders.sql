-- Migration: Time locks, streams, and enterprise orders
-- Created: 2026-01-31T09:00:00.000Z

BEGIN;

CREATE TABLE IF NOT EXISTS time_locks (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(20) NOT NULL,
  recipient_address VARCHAR(42) NOT NULL,
  amount DECIMAL(18, 6) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  unlock_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_time_locks_user_id ON time_locks(user_id);

CREATE TABLE IF NOT EXISTS streams (
  id SERIAL PRIMARY KEY,
  sender_address VARCHAR(42) NOT NULL,
  recipient_address VARCHAR(42) NOT NULL,
  token VARCHAR(20) NOT NULL,
  total_amount DECIMAL(18, 6) NOT NULL,
  rate_per_second DECIMAL(30, 18) NOT NULL,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  withdrawn DECIMAL(18, 6) DEFAULT 0,
  is_paused BOOLEAN DEFAULT FALSE,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_streams_sender ON streams(sender_address);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_streams_recipient ON streams(recipient_address);

CREATE TABLE IF NOT EXISTS enterprise_orders (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  order_id VARCHAR(100) NOT NULL,
  amount DECIMAL(18, 6) NOT NULL,
  metadata JSONB,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_enterprise_orders_user_id ON enterprise_orders(user_id);

COMMIT;

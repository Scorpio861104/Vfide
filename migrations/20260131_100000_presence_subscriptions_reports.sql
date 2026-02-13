-- Migration: Presence, subscriptions, and message reports
-- Created: 2026-01-31T10:00:00.000Z

BEGIN;

CREATE TABLE IF NOT EXISTS user_presence (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL,
  last_seen_at TIMESTAMP NOT NULL,
  last_activity_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS message_reports (
  id SERIAL PRIMARY KEY,
  message_id VARCHAR(100) NOT NULL,
  reporter_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_message_reports_message ON message_reports(message_id);

COMMIT;
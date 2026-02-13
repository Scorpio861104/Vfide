-- Migration: gamification onboarding + daily rewards
-- Created: 2026-01-31T13:00:00.000Z

BEGIN;

CREATE TABLE IF NOT EXISTS user_daily_rewards (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  last_claim_at TIMESTAMP,
  streak INTEGER DEFAULT 0,
  total_claims INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS onboarding_progress (
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  item_id VARCHAR(100) NOT NULL,
  completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, item_id)
);

CREATE INDEX IF NOT EXISTS idx_onboarding_progress_user ON onboarding_progress(user_id);

COMMIT;

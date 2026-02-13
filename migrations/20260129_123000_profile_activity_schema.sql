-- Migration: Profile, activity, and badge schema alignment
-- Created: 2026-01-29T12:30:00.000Z

BEGIN;

-- Users table enhancements
ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS location VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS twitter VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS github VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS reputation_score INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_council_member BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMP;

-- Activities table alignment
ALTER TABLE activities ADD COLUMN IF NOT EXISTS activity_type VARCHAR(50);
ALTER TABLE activities ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS data JSONB;
UPDATE activities
SET activity_type = COALESCE(activity_type, type),
    title = COALESCE(title, description),
    data = COALESCE(data, metadata);

-- Badges table alignment (badge definitions)
ALTER TABLE badges ADD COLUMN IF NOT EXISTS name VARCHAR(100);
ALTER TABLE badges ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE badges ADD COLUMN IF NOT EXISTS icon TEXT;
ALTER TABLE badges ADD COLUMN IF NOT EXISTS rarity VARCHAR(20);
ALTER TABLE badges ADD COLUMN IF NOT EXISTS requirements JSONB;
ALTER TABLE badges ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
UPDATE badges
SET name = COALESCE(name, badge_name),
    description = COALESCE(description, ''),
    icon = COALESCE(icon, '🏅'),
    rarity = COALESCE(rarity, 'common'),
    created_at = COALESCE(created_at, earned_at, CURRENT_TIMESTAMP);

-- User badges
CREATE TABLE IF NOT EXISTS user_badges (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  badge_id INTEGER REFERENCES badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, badge_id)
);

-- Proposals table alignment
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS proposer_id INTEGER REFERENCES users(id);
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS voting_ends_at TIMESTAMP;

COMMIT;

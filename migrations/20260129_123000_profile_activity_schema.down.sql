-- Rollback: Remove profile, activity, and badge schema changes
-- Created: 2026-01-29T12:30:00.000Z

BEGIN;

-- Remove user_badges table
DROP TABLE IF EXISTS user_badges;

-- Remove proposals columns
ALTER TABLE proposals DROP COLUMN IF EXISTS proposer_id;
ALTER TABLE proposals DROP COLUMN IF EXISTS updated_at;
ALTER TABLE proposals DROP COLUMN IF EXISTS voting_ends_at;

-- Remove badges columns
ALTER TABLE badges DROP COLUMN IF EXISTS name;
ALTER TABLE badges DROP COLUMN IF EXISTS description;
ALTER TABLE badges DROP COLUMN IF EXISTS icon;
ALTER TABLE badges DROP COLUMN IF EXISTS rarity;
ALTER TABLE badges DROP COLUMN IF EXISTS requirements;
ALTER TABLE badges DROP COLUMN IF EXISTS created_at;

-- Remove activities columns
ALTER TABLE activities DROP COLUMN IF EXISTS activity_type;
ALTER TABLE activities DROP COLUMN IF EXISTS title;
ALTER TABLE activities DROP COLUMN IF EXISTS data;

-- Remove users columns
ALTER TABLE users DROP COLUMN IF EXISTS display_name;
ALTER TABLE users DROP COLUMN IF EXISTS email;
ALTER TABLE users DROP COLUMN IF EXISTS location;
ALTER TABLE users DROP COLUMN IF EXISTS website;
ALTER TABLE users DROP COLUMN IF EXISTS twitter;
ALTER TABLE users DROP COLUMN IF EXISTS github;
ALTER TABLE users DROP COLUMN IF EXISTS reputation_score;
ALTER TABLE users DROP COLUMN IF EXISTS is_council_member;
ALTER TABLE users DROP COLUMN IF EXISTS is_verified;
ALTER TABLE users DROP COLUMN IF EXISTS last_seen_at;

COMMIT;

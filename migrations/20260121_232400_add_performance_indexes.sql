-- Add Performance Indexes Migration
-- Created: 2026-01-21
-- Purpose: Add indexes for better query performance, especially for ILIKE searches

-- Add indexes for user searches (username, email)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_username_trigram 
ON users USING gin (username gin_trgm_ops);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email_trigram 
ON users USING gin (email gin_trgm_ops);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_wallet_address_lower 
ON users (LOWER(wallet_address));

-- Add indexes for proposals queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_proposals_status
ON proposals (status);

-- Note: idx_proposals_proposer_id added after proposer_id column is created

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_proposals_created_at_desc
ON proposals (created_at DESC);

-- Add indexes for endorsements queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_endorsements_from_user_id
ON endorsements (from_user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_endorsements_to_user_id
ON endorsements (to_user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_endorsements_proposal_id 
ON endorsements (proposal_id) WHERE proposal_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_endorsements_created_at_desc 
ON endorsements (created_at DESC);

-- Add indexes for messages queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_sender_recipient
ON messages (sender_id, recipient_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_recipient_sender
ON messages (recipient_id, sender_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_group_id 
ON messages (group_id) WHERE group_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_created_at_desc 
ON messages (created_at DESC);

-- Add indexes for payment_requests queries
-- Note: Indexes on from_user_id and to_user_id added after columns are created

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payment_requests_status
ON payment_requests (status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payment_requests_created_at_desc
ON payment_requests (created_at DESC);

-- Add indexes for user_rewards queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_rewards_user_status 
ON user_rewards (user_id, status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_rewards_earned_at_desc 
ON user_rewards (earned_at DESC);

-- Add indexes for user_badges queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_badges_user_id
ON user_badges (user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_badges_badge_id
ON user_badges (badge_id);

-- Add compound indexes for common JOIN patterns
-- Note: idx_proposals_proposer_status added after proposer_id column is created

-- Add covering indexes for common SELECT queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_wallet_username_avatar 
ON users (wallet_address) INCLUDE (username, avatar_url);

-- Enable pg_trgm extension for fuzzy text search (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Add full-text search indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_proposals_title_fts 
ON proposals USING gin (to_tsvector('english', title));

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_proposals_description_fts 
ON proposals USING gin (to_tsvector('english', description));

-- Analyze tables to update statistics after adding indexes
ANALYZE users;
ANALYZE proposals;
ANALYZE endorsements;
ANALYZE messages;
ANALYZE payment_requests;
ANALYZE user_rewards;
ANALYZE monthly_leaderboard;
ANALYZE friendships;
ANALYZE user_badges;

-- Create a maintenance function to update statistics regularly
CREATE OR REPLACE FUNCTION update_table_statistics()
RETURNS void AS $$
BEGIN
  ANALYZE users;
  ANALYZE proposals;
  ANALYZE endorsements;
  ANALYZE messages;
  ANALYZE payment_requests;
  ANALYZE user_rewards;
  ANALYZE monthly_leaderboard;
  ANALYZE friendships;
  ANALYZE user_badges;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission on the maintenance function
GRANT EXECUTE ON FUNCTION update_table_statistics() TO PUBLIC;

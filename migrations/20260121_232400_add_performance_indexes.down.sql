-- Rollback Performance Indexes Migration
-- This removes all indexes created by the corresponding .sql file

-- Drop maintenance function
DROP FUNCTION IF EXISTS update_table_statistics();

-- Drop full-text search indexes
DROP INDEX CONCURRENTLY IF EXISTS idx_proposals_description_fts;
DROP INDEX CONCURRENTLY IF EXISTS idx_proposals_title_fts;

-- Drop covering indexes
DROP INDEX CONCURRENTLY IF EXISTS idx_users_wallet_username_avatar;

-- Drop compound indexes
DROP INDEX CONCURRENTLY IF EXISTS idx_endorsements_endorsed_proposer;
DROP INDEX CONCURRENTLY IF EXISTS idx_proposals_proposer_status;

-- Drop user_badges indexes
DROP INDEX CONCURRENTLY IF EXISTS idx_user_badges_badge_id;
DROP INDEX CONCURRENTLY IF EXISTS idx_user_badges_user_id;

-- Drop friendships indexes
DROP INDEX CONCURRENTLY IF EXISTS idx_friendships_friend_status;
DROP INDEX CONCURRENTLY IF EXISTS idx_friendships_user_status;

-- Drop monthly_leaderboard indexes
DROP INDEX CONCURRENTLY IF EXISTS idx_monthly_leaderboard_prize_unclaimed;
DROP INDEX CONCURRENTLY IF EXISTS idx_monthly_leaderboard_user_month;
DROP INDEX CONCURRENTLY IF EXISTS idx_monthly_leaderboard_month_score;

-- Drop user_rewards indexes
DROP INDEX CONCURRENTLY IF EXISTS idx_user_rewards_earned_at_desc;
DROP INDEX CONCURRENTLY IF EXISTS idx_user_rewards_user_status;

-- Drop payment_requests indexes
DROP INDEX CONCURRENTLY IF EXISTS idx_payment_requests_created_at_desc;
DROP INDEX CONCURRENTLY IF EXISTS idx_payment_requests_status;
DROP INDEX CONCURRENTLY IF EXISTS idx_payment_requests_to_user;
DROP INDEX CONCURRENTLY IF EXISTS idx_payment_requests_from_user;

-- Drop messages indexes
DROP INDEX CONCURRENTLY IF EXISTS idx_messages_created_at_desc;
DROP INDEX CONCURRENTLY IF EXISTS idx_messages_group_id;
DROP INDEX CONCURRENTLY IF EXISTS idx_messages_receiver_sender;
DROP INDEX CONCURRENTLY IF EXISTS idx_messages_sender_receiver;

-- Drop endorsements indexes
DROP INDEX CONCURRENTLY IF EXISTS idx_endorsements_created_at_desc;
DROP INDEX CONCURRENTLY IF EXISTS idx_endorsements_proposal_id;
DROP INDEX CONCURRENTLY IF EXISTS idx_endorsements_endorsed_id;
DROP INDEX CONCURRENTLY IF EXISTS idx_endorsements_endorser_id;

-- Drop proposals indexes
DROP INDEX CONCURRENTLY IF EXISTS idx_proposals_created_at_desc;
DROP INDEX CONCURRENTLY IF EXISTS idx_proposals_proposer_id;
DROP INDEX CONCURRENTLY IF EXISTS idx_proposals_status;

-- Drop user indexes
DROP INDEX CONCURRENTLY IF EXISTS idx_users_wallet_address_lower;
DROP INDEX CONCURRENTLY IF EXISTS idx_users_email_trigram;
DROP INDEX CONCURRENTLY IF EXISTS idx_users_username_trigram;

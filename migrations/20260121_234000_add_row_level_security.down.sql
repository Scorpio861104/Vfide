-- Rollback Row-Level Security Policies Migration
-- This removes all RLS policies and disables RLS on tables

-- Drop helper function
DROP FUNCTION IF EXISTS set_current_user_address(TEXT);

-- ============================================================
-- FRIENDSHIPS TABLE
-- ============================================================
DROP POLICY IF EXISTS friendships_update_own ON friendships;
DROP POLICY IF EXISTS friendships_insert_own ON friendships;
DROP POLICY IF EXISTS friendships_read_own ON friendships;
ALTER TABLE friendships DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- ENDORSEMENTS TABLE
-- ============================================================
DROP POLICY IF EXISTS endorsements_delete_own ON endorsements;
DROP POLICY IF EXISTS endorsements_insert_own ON endorsements;
DROP POLICY IF EXISTS endorsements_read_all ON endorsements;
ALTER TABLE endorsements DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- PROPOSALS TABLE
-- ============================================================
DROP POLICY IF EXISTS proposals_update_own ON proposals;
DROP POLICY IF EXISTS proposals_insert_own ON proposals;
DROP POLICY IF EXISTS proposals_read_all ON proposals;
ALTER TABLE proposals DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- MONTHLY_LEADERBOARD TABLE
-- ============================================================
DROP POLICY IF EXISTS monthly_leaderboard_update_own ON monthly_leaderboard;
DROP POLICY IF EXISTS monthly_leaderboard_read_all ON monthly_leaderboard;
ALTER TABLE monthly_leaderboard DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- USER_REWARDS TABLE
-- ============================================================
DROP POLICY IF EXISTS user_rewards_update_own ON user_rewards;
DROP POLICY IF EXISTS user_rewards_read_own ON user_rewards;
ALTER TABLE user_rewards DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- PAYMENT_REQUESTS TABLE
-- ============================================================
DROP POLICY IF EXISTS payment_requests_insert_own ON payment_requests;
DROP POLICY IF EXISTS payment_requests_read_own ON payment_requests;
ALTER TABLE payment_requests DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- MESSAGES TABLE
-- ============================================================
DROP POLICY IF EXISTS messages_delete_own ON messages;
DROP POLICY IF EXISTS messages_insert_own ON messages;
DROP POLICY IF EXISTS messages_read_own ON messages;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- USERS TABLE
-- ============================================================
DROP POLICY IF EXISTS users_update_own ON users;
DROP POLICY IF EXISTS users_read_public ON users;
DROP POLICY IF EXISTS users_read_own ON users;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

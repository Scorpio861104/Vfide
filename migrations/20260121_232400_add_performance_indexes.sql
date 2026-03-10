-- Add Performance Indexes Migration
-- Created: 2026-01-21
-- Purpose: Add indexes for better query performance. This migration is
-- schema-aware so clean installs do not fail when optional columns/tables are
-- introduced by later migrations.

-- Enable pg_trgm extension before creating trigram indexes.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

DO $$
BEGIN
  -- users
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'username'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_users_username_trigram ON users USING gin (username gin_trgm_ops)';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'email'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_users_email_trigram ON users USING gin (email gin_trgm_ops)';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'wallet_address'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_users_wallet_address_lower ON users (LOWER(wallet_address))';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_users_wallet_username_avatar ON users (wallet_address) INCLUDE (username, avatar_url)';
  END IF;

  -- proposals
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'proposals' AND column_name = 'status'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals (status)';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'proposals' AND column_name = 'created_at'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_proposals_created_at_desc ON proposals (created_at DESC)';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'proposals' AND column_name = 'title'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_proposals_title_fts ON proposals USING gin (to_tsvector(''english'', title))';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'proposals' AND column_name = 'description'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_proposals_description_fts ON proposals USING gin (to_tsvector(''english'', description))';
  END IF;

  -- endorsements
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'endorsements' AND column_name = 'from_user_id'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_endorsements_from_user_id ON endorsements (from_user_id)';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'endorsements' AND column_name = 'to_user_id'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_endorsements_to_user_id ON endorsements (to_user_id)';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'endorsements' AND column_name = 'proposal_id'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_endorsements_proposal_id ON endorsements (proposal_id) WHERE proposal_id IS NOT NULL';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'endorsements' AND column_name = 'created_at'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_endorsements_created_at_desc ON endorsements (created_at DESC)';
  END IF;

  -- messages
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'sender_id'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'recipient_id'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_messages_sender_recipient ON messages (sender_id, recipient_id)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_messages_recipient_sender ON messages (recipient_id, sender_id)';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'group_id'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_messages_group_id ON messages (group_id) WHERE group_id IS NOT NULL';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'created_at'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_messages_created_at_desc ON messages (created_at DESC)';
  END IF;

  -- payment_requests
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'payment_requests' AND column_name = 'status'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_payment_requests_status ON payment_requests (status)';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'payment_requests' AND column_name = 'created_at'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_payment_requests_created_at_desc ON payment_requests (created_at DESC)';
  END IF;

  -- user_rewards
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_rewards' AND column_name = 'user_id'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_rewards' AND column_name = 'status'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_user_rewards_user_status ON user_rewards (user_id, status)';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_rewards' AND column_name = 'earned_at'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_user_rewards_earned_at_desc ON user_rewards (earned_at DESC)';
  END IF;

  -- user_badges
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_badges' AND column_name = 'user_id'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_user_badges_user_id ON user_badges (user_id)';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_badges' AND column_name = 'badge_id'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_user_badges_badge_id ON user_badges (badge_id)';
  END IF;
END
$$;

DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'users',
    'proposals',
    'endorsements',
    'messages',
    'payment_requests',
    'user_rewards',
    'monthly_leaderboard',
    'friendships',
    'user_badges'
  ]
  LOOP
    IF to_regclass(format('public.%s', tbl)) IS NOT NULL THEN
      EXECUTE format('ANALYZE %I', tbl);
    END IF;
  END LOOP;
END
$$;

-- Create a maintenance function to update statistics regularly
CREATE OR REPLACE FUNCTION update_table_statistics()
RETURNS void AS $$
BEGIN
  IF to_regclass('public.users') IS NOT NULL THEN ANALYZE users; END IF;
  IF to_regclass('public.proposals') IS NOT NULL THEN ANALYZE proposals; END IF;
  IF to_regclass('public.endorsements') IS NOT NULL THEN ANALYZE endorsements; END IF;
  IF to_regclass('public.messages') IS NOT NULL THEN ANALYZE messages; END IF;
  IF to_regclass('public.payment_requests') IS NOT NULL THEN ANALYZE payment_requests; END IF;
  IF to_regclass('public.user_rewards') IS NOT NULL THEN ANALYZE user_rewards; END IF;
  IF to_regclass('public.monthly_leaderboard') IS NOT NULL THEN ANALYZE monthly_leaderboard; END IF;
  IF to_regclass('public.friendships') IS NOT NULL THEN ANALYZE friendships; END IF;
  IF to_regclass('public.user_badges') IS NOT NULL THEN ANALYZE user_badges; END IF;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission on the maintenance function
GRANT EXECUTE ON FUNCTION update_table_statistics() TO PUBLIC;

-- Row-Level Security (RLS) Policies Migration
-- Created: 2026-01-21
-- Purpose: Add Row-Level Security policies for defense in depth

-- Enable RLS on critical tables
-- This adds an additional security layer at the database level

-- ============================================================
-- USERS TABLE
-- ============================================================
-- Users can read their own data and public profiles of others
-- Users can only update their own data

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own data
CREATE POLICY users_read_own ON users
  FOR SELECT
  USING (wallet_address = current_setting('app.current_user_address', true)::text);

-- Policy: Users can read public profile info of others
CREATE POLICY users_read_public ON users
  FOR SELECT
  USING (true); -- Allow reading basic info, but sensitive fields handled by application

-- Policy: Users can update only their own data
CREATE POLICY users_update_own ON users
  FOR UPDATE
  USING (wallet_address = current_setting('app.current_user_address', true)::text);

-- ============================================================
-- MESSAGES TABLE
-- ============================================================
-- Users can only read messages they sent or received
-- Users can only create messages as themselves

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'sender_id'
  ) AND EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'recipient_id'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'messages' AND policyname = 'messages_read_own'
    ) THEN
      EXECUTE $policy$
        CREATE POLICY messages_read_own ON messages
          FOR SELECT
          USING (
            EXISTS (
              SELECT 1 FROM users
              WHERE users.id = messages.sender_id
                AND users.wallet_address = current_setting('app.current_user_address', true)::text
            )
            OR
            EXISTS (
              SELECT 1 FROM users
              WHERE users.id = messages.recipient_id
                AND users.wallet_address = current_setting('app.current_user_address', true)::text
            )
          )
      $policy$;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'messages' AND policyname = 'messages_insert_own'
    ) THEN
      EXECUTE $policy$
        CREATE POLICY messages_insert_own ON messages
          FOR INSERT
          WITH CHECK (
            EXISTS (
              SELECT 1 FROM users
              WHERE users.id = messages.sender_id
                AND users.wallet_address = current_setting('app.current_user_address', true)::text
            )
          )
      $policy$;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'messages' AND policyname = 'messages_delete_own'
    ) THEN
      EXECUTE $policy$
        CREATE POLICY messages_delete_own ON messages
          FOR DELETE
          USING (
            EXISTS (
              SELECT 1 FROM users
              WHERE users.id = messages.sender_id
                AND users.wallet_address = current_setting('app.current_user_address', true)::text
            )
          )
      $policy$;
    END IF;
  END IF;
END $$;

-- ============================================================
-- USER_REWARDS TABLE
-- ============================================================
-- Users can only read and claim their own rewards

ALTER TABLE user_rewards ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own rewards
CREATE POLICY user_rewards_read_own ON user_rewards
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = user_rewards.user_id 
        AND users.wallet_address = current_setting('app.current_user_address', true)::text
    )
  );

-- Policy: Users can update (claim) their own rewards
CREATE POLICY user_rewards_update_own ON user_rewards
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = user_rewards.user_id 
        AND users.wallet_address = current_setting('app.current_user_address', true)::text
    )
  );

-- ============================================================
-- PROPOSALS TABLE
-- ============================================================
-- All users can read proposals, proposers can update their own

ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;

-- Policy: All users can read proposals
CREATE POLICY proposals_read_all ON proposals
  FOR SELECT
  USING (true);

-- Note: proposer_id-based policies are added after the column is created in a later migration

-- ============================================================
-- ENDORSEMENTS TABLE
-- ============================================================
-- All users can read endorsements, endorsers can manage their own

ALTER TABLE endorsements ENABLE ROW LEVEL SECURITY;

-- Policy: All users can read endorsements
CREATE POLICY endorsements_read_all ON endorsements
  FOR SELECT
  USING (true);

-- Policy: Users can insert endorsements as themselves
CREATE POLICY endorsements_insert_own ON endorsements
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = endorsements.from_user_id
        AND users.wallet_address = current_setting('app.current_user_address', true)::text
    )
  );

-- Policy: Users can delete only their own endorsements
CREATE POLICY endorsements_delete_own ON endorsements
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = endorsements.from_user_id
        AND users.wallet_address = current_setting('app.current_user_address', true)::text
    )
  );

-- ============================================================
-- FRIENDSHIPS TABLE
-- ============================================================
-- Users can only see and manage their own friendships

ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own friendships
CREATE POLICY friendships_read_own ON friendships
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = friendships.user_id 
        AND users.wallet_address = current_setting('app.current_user_address', true)::text
    )
    OR
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = friendships.friend_id 
        AND users.wallet_address = current_setting('app.current_user_address', true)::text
    )
  );

-- Policy: Users can create friendships as themselves
CREATE POLICY friendships_insert_own ON friendships
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = friendships.user_id 
        AND users.wallet_address = current_setting('app.current_user_address', true)::text
    )
  );

-- Policy: Users can update their own friendships
CREATE POLICY friendships_update_own ON friendships
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = friendships.user_id 
        AND users.wallet_address = current_setting('app.current_user_address', true)::text
    )
    OR
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = friendships.friend_id 
        AND users.wallet_address = current_setting('app.current_user_address', true)::text
    )
  );

-- ============================================================
-- HELPER FUNCTION FOR APPLICATION
-- ============================================================
-- Function to set current user context in a transaction
-- This should be called at the start of each database transaction
-- with the authenticated user's wallet address

CREATE OR REPLACE FUNCTION set_current_user_address(user_address TEXT)
RETURNS void AS $$
BEGIN
  PERFORM set_config('app.current_user_address', user_address, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION set_current_user_address(TEXT) TO PUBLIC;

-- ============================================================
-- NOTES FOR APPLICATION INTEGRATION
-- ============================================================
-- To use RLS policies, the application must:
--
-- 1. At the start of each request, set the current user context:
--    await query('SELECT set_current_user_address($1)', [userAddress]);
--
-- 2. Perform database operations normally - RLS will enforce policies
--
-- 3. For operations requiring elevated privileges (admin actions),
--    use a separate database role with BYPASS RLS privilege
--
-- Example:
--   // Start transaction
--   await client.query('BEGIN');
--   
--   // Set user context
--   await client.query('SELECT set_current_user_address($1)', [authenticatedUserAddress]);
--   
--   // Perform operations - RLS automatically enforces policies
--   await client.query('SELECT * FROM messages WHERE ...');
--   
--   // Commit transaction
--   await client.query('COMMIT');

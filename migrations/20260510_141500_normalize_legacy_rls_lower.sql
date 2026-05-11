-- Migration: 20260510_141500_normalize_legacy_rls_lower.sql
--
-- Purpose:
--   The first RLS migration (20260121_234000_add_row_level_security.sql)
--   used bare equality `wallet_address = current_setting(...)`. A later
--   migration (20260430_120000_user_portfolios_and_users_insert_rls.sql)
--   adopted the better case-insensitive pattern with `LOWER()`. This
--   migration brings the legacy policies into the modern pattern so that
--   wallet-address comparisons are consistent everywhere.
--
-- Why this matters:
--   `lib/db.ts` normalizes the current-user address to lowercase before
--   calling `set_config('app.current_user_address', ...)`. As long as
--   every row's wallet_address is also stored lowercase, the bare-equality
--   policies happen to work. The moment a single row is inserted with a
--   mixed-case address (e.g. by an admin job using EIP-55 checksum form),
--   that user's data becomes invisible to RLS-protected reads even when
--   they're the owner. LOWER() on both sides closes this footgun.
--
-- Tables touched:
--   users, messages, friendships, user_rewards, endorsements
--   (user_portfolios already uses LOWER, proposals has read-all policy
--    which is fine)
--
-- Each policy is DROP IF EXISTS + CREATE for atomicity.

BEGIN;

-- ============================================================================
-- users
-- ============================================================================
DROP POLICY IF EXISTS users_read_own  ON users;
DROP POLICY IF EXISTS users_update_own ON users;

CREATE POLICY users_read_own ON users
  FOR SELECT
  USING (LOWER(wallet_address) = LOWER(current_setting('app.current_user_address', true)::text));

CREATE POLICY users_update_own ON users
  FOR UPDATE
  USING (LOWER(wallet_address) = LOWER(current_setting('app.current_user_address', true)::text))
  WITH CHECK (LOWER(wallet_address) = LOWER(current_setting('app.current_user_address', true)::text));

-- users_insert_own from 20260430 already uses bare equality but with
-- non-null guards; replace to be case-insensitive too.
DROP POLICY IF EXISTS users_insert_own ON users;
CREATE POLICY users_insert_own ON users
  FOR INSERT
  WITH CHECK (
    current_setting('app.current_user_address', true) IS NOT NULL
    AND current_setting('app.current_user_address', true) <> ''
    AND LOWER(wallet_address) = LOWER(current_setting('app.current_user_address', true)::text)
  );

-- ============================================================================
-- messages
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='messages' AND policyname='messages_read_own') THEN
    DROP POLICY messages_read_own ON messages;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='messages' AND policyname='messages_insert_own') THEN
    DROP POLICY messages_insert_own ON messages;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='messages' AND policyname='messages_delete_own') THEN
    DROP POLICY messages_delete_own ON messages;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='messages' AND column_name='sender_id')
     AND EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema='public' AND table_name='messages' AND column_name='recipient_id') THEN

    EXECUTE $p$
      CREATE POLICY messages_read_own ON messages
        FOR SELECT
        USING (
          EXISTS (
            SELECT 1 FROM users
            WHERE users.id = messages.sender_id
              AND LOWER(users.wallet_address) = LOWER(current_setting('app.current_user_address', true)::text)
          )
          OR EXISTS (
            SELECT 1 FROM users
            WHERE users.id = messages.recipient_id
              AND LOWER(users.wallet_address) = LOWER(current_setting('app.current_user_address', true)::text)
          )
        )
    $p$;

    EXECUTE $p$
      CREATE POLICY messages_insert_own ON messages
        FOR INSERT
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM users
            WHERE users.id = messages.sender_id
              AND LOWER(users.wallet_address) = LOWER(current_setting('app.current_user_address', true)::text)
          )
        )
    $p$;

    EXECUTE $p$
      CREATE POLICY messages_delete_own ON messages
        FOR DELETE
        USING (
          EXISTS (
            SELECT 1 FROM users
            WHERE users.id = messages.sender_id
              AND LOWER(users.wallet_address) = LOWER(current_setting('app.current_user_address', true)::text)
          )
        )
    $p$;
  END IF;
END$$;

-- ============================================================================
-- friendships
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='friendships' AND policyname='friendships_read_own') THEN
    DROP POLICY friendships_read_own ON friendships;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='friendships' AND policyname='friendships_insert_own') THEN
    DROP POLICY friendships_insert_own ON friendships;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='friendships' AND policyname='friendships_update_own') THEN
    DROP POLICY friendships_update_own ON friendships;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='friendships' AND column_name='user_id')
     AND EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema='public' AND table_name='friendships' AND column_name='friend_id') THEN

    EXECUTE $p$
      CREATE POLICY friendships_read_own ON friendships
        FOR SELECT
        USING (
          EXISTS (
            SELECT 1 FROM users
            WHERE users.id = friendships.user_id
              AND LOWER(users.wallet_address) = LOWER(current_setting('app.current_user_address', true)::text)
          )
          OR EXISTS (
            SELECT 1 FROM users
            WHERE users.id = friendships.friend_id
              AND LOWER(users.wallet_address) = LOWER(current_setting('app.current_user_address', true)::text)
          )
        )
    $p$;

    EXECUTE $p$
      CREATE POLICY friendships_insert_own ON friendships
        FOR INSERT
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM users
            WHERE users.id = friendships.user_id
              AND LOWER(users.wallet_address) = LOWER(current_setting('app.current_user_address', true)::text)
          )
        )
    $p$;

    EXECUTE $p$
      CREATE POLICY friendships_update_own ON friendships
        FOR UPDATE
        USING (
          EXISTS (
            SELECT 1 FROM users
            WHERE users.id = friendships.user_id
              AND LOWER(users.wallet_address) = LOWER(current_setting('app.current_user_address', true)::text)
          )
          OR EXISTS (
            SELECT 1 FROM users
            WHERE users.id = friendships.friend_id
              AND LOWER(users.wallet_address) = LOWER(current_setting('app.current_user_address', true)::text)
          )
        )
    $p$;
  END IF;
END$$;

-- ============================================================================
-- user_rewards
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_rewards' AND policyname='user_rewards_read_own') THEN
    DROP POLICY user_rewards_read_own ON user_rewards;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_rewards' AND policyname='user_rewards_update_own') THEN
    DROP POLICY user_rewards_update_own ON user_rewards;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='user_rewards' AND column_name='user_id') THEN
    EXECUTE $p$
      CREATE POLICY user_rewards_read_own ON user_rewards
        FOR SELECT
        USING (
          EXISTS (
            SELECT 1 FROM users
            WHERE users.id = user_rewards.user_id
              AND LOWER(users.wallet_address) = LOWER(current_setting('app.current_user_address', true)::text)
          )
        )
    $p$;

    EXECUTE $p$
      CREATE POLICY user_rewards_update_own ON user_rewards
        FOR UPDATE
        USING (
          EXISTS (
            SELECT 1 FROM users
            WHERE users.id = user_rewards.user_id
              AND LOWER(users.wallet_address) = LOWER(current_setting('app.current_user_address', true)::text)
          )
        )
    $p$;
  END IF;
END$$;

-- ============================================================================
-- endorsements
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='endorsements' AND policyname='endorsements_insert_own') THEN
    DROP POLICY endorsements_insert_own ON endorsements;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='endorsements' AND policyname='endorsements_delete_own') THEN
    DROP POLICY endorsements_delete_own ON endorsements;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='endorsements' AND column_name='endorser_id') THEN
    EXECUTE $p$
      CREATE POLICY endorsements_insert_own ON endorsements
        FOR INSERT
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM users
            WHERE users.id = endorsements.endorser_id
              AND LOWER(users.wallet_address) = LOWER(current_setting('app.current_user_address', true)::text)
          )
        )
    $p$;

    EXECUTE $p$
      CREATE POLICY endorsements_delete_own ON endorsements
        FOR DELETE
        USING (
          EXISTS (
            SELECT 1 FROM users
            WHERE users.id = endorsements.endorser_id
              AND LOWER(users.wallet_address) = LOWER(current_setting('app.current_user_address', true)::text)
          )
        )
    $p$;
  END IF;
END$$;

COMMIT;

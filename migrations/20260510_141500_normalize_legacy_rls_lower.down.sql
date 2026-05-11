-- Down migration for 20260510_141500_normalize_legacy_rls_lower.sql
--
-- Restores the bare-equality policies. NOT generally recommended (defeats
-- the purpose of the up migration), but provided for symmetry.

BEGIN;

-- users: revert to original users_read_own / users_update_own
DROP POLICY IF EXISTS users_read_own   ON users;
DROP POLICY IF EXISTS users_update_own ON users;
CREATE POLICY users_read_own ON users
  FOR SELECT
  USING (wallet_address = current_setting('app.current_user_address', true)::text);
CREATE POLICY users_update_own ON users
  FOR UPDATE
  USING (wallet_address = current_setting('app.current_user_address', true)::text);

-- users_insert_own: restore the 20260430 version
DROP POLICY IF EXISTS users_insert_own ON users;
CREATE POLICY users_insert_own ON users
  FOR INSERT
  WITH CHECK (
    wallet_address = current_setting('app.current_user_address', true)::text
    AND current_setting('app.current_user_address', true) IS NOT NULL
    AND current_setting('app.current_user_address', true) <> ''
  );

-- Drop the LOWER variants this migration installed; the older policies are
-- not auto-restored for messages/friendships/user_rewards/endorsements
-- because they were too verbose to re-emit here. Re-apply the original
-- migration 20260121_234000_add_row_level_security.sql to restore those.
DROP POLICY IF EXISTS messages_read_own ON messages;
DROP POLICY IF EXISTS messages_insert_own ON messages;
DROP POLICY IF EXISTS messages_delete_own ON messages;
DROP POLICY IF EXISTS friendships_read_own ON friendships;
DROP POLICY IF EXISTS friendships_insert_own ON friendships;
DROP POLICY IF EXISTS friendships_update_own ON friendships;
DROP POLICY IF EXISTS user_rewards_read_own ON user_rewards;
DROP POLICY IF EXISTS user_rewards_update_own ON user_rewards;
DROP POLICY IF EXISTS endorsements_insert_own ON endorsements;
DROP POLICY IF EXISTS endorsements_delete_own ON endorsements;

COMMIT;

-- Rollback: restore users_read_public USING (true) — P2-M-03 regression
-- WARNING: rolling back this migration re-introduces the overly-permissive read policy.

DROP POLICY IF EXISTS users_read_authenticated ON users;

CREATE POLICY users_read_public ON users
  FOR SELECT
  USING (true);

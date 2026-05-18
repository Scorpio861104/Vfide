-- Fix RLS: replace USING (true) on users_read_public with auth-scoped read
-- Remediation for P2-M-03: `users_read_public USING (true)` makes read-side RLS meaningless.
--
-- The old policy allowed ANY database connection (including bypassed-auth attacks) to enumerate
-- all user rows. The new policy requires a non-empty `app.current_user_address` session variable,
-- meaning only connections that have completed the RLS context handshake (set_config calls in
-- lib/db.ts) can read other users' rows. The vfide_admin role bypasses RLS entirely as before.

-- ============================================================
-- USERS TABLE — restrict public read to authenticated sessions
-- ============================================================

-- Drop the overly-permissive policy
DROP POLICY IF EXISTS users_read_public ON users;

-- Replace with: authenticated callers (app.current_user_address is set) may read any user row.
-- This allows looking up other users' public profiles, leaderboard data, etc., while preventing
-- unauthenticated connection-level enumeration.
CREATE POLICY users_read_authenticated ON users
  FOR SELECT
  USING (
    current_setting('app.current_user_address', true) IS NOT NULL
    AND current_setting('app.current_user_address', true) <> ''
  );

-- ============================================================
-- DOWN comment (see corresponding .down.sql for reversal)
-- ============================================================
-- To revert:
--   DROP POLICY IF EXISTS users_read_authenticated ON users;
--   CREATE POLICY users_read_public ON users FOR SELECT USING (true);

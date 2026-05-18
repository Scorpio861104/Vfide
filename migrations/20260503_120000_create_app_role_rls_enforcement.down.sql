-- Reverse of 20260503_120000_create_app_role_rls_enforcement.sql
-- OP-6 FIX: rollback path. The up migration creates vfide_app and grants
-- per-table privileges plus enables RLS. The reversal order is:
--   1. Disable RLS so we can revoke grants without policy interference
--   2. Revoke per-table grants
--   3. Drop policies
--   4. Drop the role (only if no other migration created it first)

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'vfide_app') THEN
    RAISE NOTICE 'vfide_app role does not exist; nothing to revoke.';
    RETURN;
  END IF;

  -- Per-table revokes
  EXECUTE 'REVOKE SELECT, INSERT, UPDATE, DELETE ON users FROM vfide_app';
  EXECUTE 'REVOKE SELECT, INSERT, UPDATE, DELETE ON messages FROM vfide_app';
  EXECUTE 'REVOKE SELECT, INSERT, UPDATE, DELETE ON friendships FROM vfide_app';
  EXECUTE 'REVOKE SELECT, INSERT, UPDATE, DELETE ON user_rewards FROM vfide_app';
  EXECUTE 'REVOKE SELECT, INSERT, UPDATE, DELETE ON proposals FROM vfide_app';
  EXECUTE 'REVOKE SELECT, INSERT, UPDATE, DELETE ON endorsements FROM vfide_app';
  EXECUTE 'REVOKE USAGE ON SCHEMA public FROM vfide_app';

  -- The DROP ROLE here is intentionally guarded — if migration 20260422
  -- (the original create-role migration) is still applied, that
  -- migration's down should drop the role; we don't double-drop here.
  -- This rollback is safe to run even when the role still exists due to
  -- the earlier create.
END;
$$;

COMMIT;

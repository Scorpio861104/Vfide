-- Reverse of 20260429_020000_expand_vfide_app_grants.sql
-- OP-6 FIX: rollback path. Revokes the broad grants added by the up
-- migration but leaves the role itself in place (the create-role
-- migration owns role lifecycle).

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'vfide_app') THEN
    RAISE NOTICE 'vfide_app role does not exist; nothing to revoke.';
    RETURN;
  END IF;
END;
$$;

REVOKE SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public FROM vfide_app;
REVOKE USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public FROM vfide_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLES FROM vfide_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE USAGE, SELECT, UPDATE ON SEQUENCES FROM vfide_app;

REVOKE USAGE ON SCHEMA public FROM vfide_app;

COMMIT;

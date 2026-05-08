-- Reverse of 20260422_010000_create_vfide_app_role.sql
-- OP-6 FIX: rollback path for vfide_app role creation.
--
-- DESTRUCTIVE WARNING: this drops the application role. After dropping
-- you must update DATABASE_URL to a different role (e.g., the migration
-- owner) BEFORE running this rollback, otherwise the application will
-- lose DB access immediately.
--
-- Order matters:
--   1. Revoke connect from the database
--   2. Revoke schema usage
--   3. Drop the role (only succeeds if all grants are revoked first)

BEGIN;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'vfide_app') THEN
    -- Revoke any object-level grants that may have been added by
    -- the expand grants migration. We don't know the exact DB name at
    -- rollback time, so we use the current_database() function.
    EXECUTE format('REVOKE CONNECT ON DATABASE %I FROM vfide_app', current_database());
    REVOKE USAGE ON SCHEMA public FROM vfide_app;
    REVOKE ALL ON ALL TABLES IN SCHEMA public FROM vfide_app;
    REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM vfide_app;
    -- Drop the role only if no objects still depend on it.
    DROP ROLE IF EXISTS vfide_app;
  END IF;
END;
$$;

COMMIT;

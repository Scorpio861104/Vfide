-- Migration: expand vfide_app grants to all application tables/sequences in public schema
-- Fixes: N-C1 (incomplete grants causing runtime permission failures or superuser fallback)

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'vfide_app') THEN
    RAISE EXCEPTION 'vfide_app role does not exist; run 20260422_010000_create_vfide_app_role.sql first';
  END IF;
END;
$$;

GRANT USAGE ON SCHEMA public TO vfide_app;

-- Grant DML on all current tables used by the application.
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO vfide_app;

-- Grant sequence access for SERIAL/IDENTITY-backed inserts.
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO vfide_app;

-- Ensure future objects created by the migration owner are granted as well.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO vfide_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO vfide_app;

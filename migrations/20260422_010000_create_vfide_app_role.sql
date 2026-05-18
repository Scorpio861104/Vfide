-- Migration: create dedicated application role with NOBYPASSRLS
-- Fixes: P2-H-04 — RLS policies bypassed by application connection role
--
-- After applying this migration, set DATABASE_URL to connect as `vfide_app`
-- (not as `postgres` or any superuser/owner role) so Row-Level Security
-- policies are actually enforced at runtime.
--
-- This migration is intentionally idempotent via conditional role creation.

DO $$
BEGIN
  -- Create the role if it does not already exist
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'vfide_app') THEN
    CREATE ROLE vfide_app LOGIN NOBYPASSRLS NOSUPERUSER NOCREATEDB NOCREATEROLE;
  END IF;

  -- Explicitly set NOBYPASSRLS in case the role existed with BYPASSRLS
  ALTER ROLE vfide_app NOBYPASSRLS;
END;
$$;

-- Grant connection to the application database
GRANT CONNECT ON DATABASE vfide_testnet TO vfide_app;

-- Grant schema usage
GRANT USAGE ON SCHEMA public TO vfide_app;

-- Grant DML on tables the application needs to access
-- (Expand this list if new tables are added that vfide_app must access)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  users,
  messages,
  friendships,
  user_rewards,
  proposals,
  endorsements,
  security_violations,
  schema_migrations
TO vfide_app;

-- Allow vfide_app to use sequences owned by the tables above
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO vfide_app;

-- Ensure future tables created by migration runners also grant usage
-- Operators should re-run this section or add explicit GRANTs after each
-- migration that creates a new table.

-- Runtime startup check (for reference in application code):
-- SELECT current_user, rolbypassrls
-- FROM pg_roles
-- WHERE rolname = current_user;
-- → must return rolbypassrls = false in production

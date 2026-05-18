-- Migration: Create dedicated application role with RLS enforcement
-- Purpose: Establish a non-privileged PostgreSQL role that RLS cannot bypass
-- When: Application migration to dedicated service account

-- Create the dedicated application role if it doesn't exist
CREATE ROLE vfide_app WITH LOGIN;

-- Revoke dangerous privileges explicitly
ALTER ROLE vfide_app NOBYPASSRLS;
ALTER ROLE vfide_app NOSUPERUSER;
ALTER ROLE vfide_app NOCREATEROLE;
ALTER ROLE vfide_app NOCREATEDB;

-- Grant necessary permissions on tables for VFIDE
-- These grant SELECT/INSERT/UPDATE/DELETE but NOT owner-level privileges
GRANT USAGE ON SCHEMA public TO vfide_app;

-- Grant on tables requiring RLS protection
GRANT SELECT, INSERT, UPDATE, DELETE ON users TO vfide_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON messages TO vfide_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON friendships TO vfide_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_rewards TO vfide_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON proposals TO vfide_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON endorsements TO vfide_app;

-- Grant on system tables needed for RLS context and auditing
GRANT SELECT, INSERT, UPDATE, DELETE ON security_account_events TO vfide_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON security_account_locks TO vfide_app;

-- Grant sequence permissions for SERIAL columns
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO vfide_app;

-- If there are any other tables the application needs access to, add explicit grants
-- This follows the principle of least privilege - deny by default, grant explicitly

-- Documentation comment:
COMMENT ON ROLE vfide_app IS 'Application service account for VFIDE. Has NOBYPASSRLS enforced to ensure RLS cannot be circumvented.';

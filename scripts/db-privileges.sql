-- =============================================================
-- VFIDE Database Privilege Hardening Script
-- =============================================================
-- Run this ONCE against your PostgreSQL instance after initial
-- schema migration to enforce least-privilege access for the
-- application database user.
--
-- Usage:
--   psql $DATABASE_URL -f scripts/db-privileges.sql
--
-- Replace 'vfide_app' with the actual username from DATABASE_URL.
-- =============================================================

-- ----------------------------------------------------------------
-- 0. Variables — edit these before running
-- ----------------------------------------------------------------
-- App user (connect string user from DATABASE_URL)
\set APP_USER 'vfide_app'
-- Database name
\set APP_DB   'vfide'

-- ----------------------------------------------------------------
-- 1. Revoke all default public-schema privileges
-- ----------------------------------------------------------------
REVOKE ALL ON DATABASE :APP_DB FROM PUBLIC;
REVOKE ALL ON SCHEMA public FROM PUBLIC;

-- ----------------------------------------------------------------
-- 2. Grant only what the application actually needs
-- ----------------------------------------------------------------

-- Allow the app user to use the public schema
GRANT USAGE ON SCHEMA public TO :APP_USER;

-- DML on all current tables
GRANT SELECT, INSERT, UPDATE, DELETE
  ON ALL TABLES IN SCHEMA public
  TO :APP_USER;

-- Allow sequences (needed for SERIAL / BIGSERIAL PKs)
GRANT USAGE, SELECT
  ON ALL SEQUENCES IN SCHEMA public
  TO :APP_USER;

-- ----------------------------------------------------------------
-- 3. Apply the same grants to any FUTURE tables/sequences
--    created by migration tools (e.g. running db-migrate or
--    a later psql -f schema.sql)
-- ----------------------------------------------------------------
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO :APP_USER;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO :APP_USER;

-- ----------------------------------------------------------------
-- 4. Explicitly deny DDL and superuser operations
-- ----------------------------------------------------------------
-- The app user must NOT be able to create/drop tables, truncate,
-- or alter schema.  These operations belong to a separate
-- migrations user only.
REVOKE CREATE ON SCHEMA public FROM :APP_USER;

-- ----------------------------------------------------------------
-- 5. Verify (run as superuser to inspect)
-- ----------------------------------------------------------------
-- \du :APP_USER
-- SELECT grantee, table_name, privilege_type
--   FROM information_schema.role_table_grants
--  WHERE grantee = :'APP_USER'
--  ORDER BY table_name, privilege_type;

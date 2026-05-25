-- Reverse of 20260410_020000_loans_base.sql
-- Rollback: destructive — drops loans and flash_loans tables (CASCADE). Gated for use in development/staging or with ALLOW_DESTRUCTIVE=1 in production.
-- OP-6 FIX: rollback path for the loans + flash_loans tables.
--
-- DESTRUCTIVE: drops both loans and flash_loans tables and all their
-- rows. Operators should take a pg_dump backup before running this
-- rollback.

BEGIN;

DROP INDEX IF EXISTS idx_loans_status;
DROP INDEX IF EXISTS idx_loans_borrower;
DROP INDEX IF EXISTS idx_loans_lender;

DROP TABLE IF EXISTS flash_loans CASCADE;
DROP TABLE IF EXISTS loans CASCADE;

COMMIT;

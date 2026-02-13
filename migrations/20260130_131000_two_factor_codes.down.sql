-- Rollback: Remove two factor codes table
-- Created: 2026-01-30T13:10:00.000Z

BEGIN;

DROP TABLE IF EXISTS two_factor_codes;

COMMIT;

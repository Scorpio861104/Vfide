-- Reverse of 20260410_010000_merchants_base.sql
-- OP-6 FIX: rollback path for the base merchants table.
--
-- ALLOW_DESTRUCTIVE: drops the merchants table and all its rows. Many other
-- migrations may reference merchants by foreign key (merchant_locations,
-- merchant_withdrawals, merchant_orders, etc.); CASCADE the drop so
-- dependent rows are also removed. Operators should take a pg_dump
-- backup before running this rollback.

BEGIN;

DROP INDEX IF EXISTS idx_merchants_registered;
DROP INDEX IF EXISTS idx_merchants_category;
DROP INDEX IF EXISTS idx_merchants_wallet;

DROP TABLE IF EXISTS merchants CASCADE;

COMMIT;

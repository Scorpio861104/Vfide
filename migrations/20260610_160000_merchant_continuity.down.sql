-- Down migration for 20260610_160000_merchant_continuity.sql
DROP POLICY IF EXISTS merchant_operators_owner_all ON merchant_operators;
DROP POLICY IF EXISTS merchant_succession_owner_all ON merchant_succession;
DROP INDEX IF EXISTS idx_merchant_operators_merchant;
DROP TABLE IF EXISTS merchant_operators;
DROP TABLE IF EXISTS merchant_succession;

-- Down migration for 20260610_140000_merchant_verification.sql
DROP INDEX IF EXISTS idx_merchant_profiles_verified_at;
ALTER TABLE merchant_profiles DROP COLUMN IF EXISTS verified_at;

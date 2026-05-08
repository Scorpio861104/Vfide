-- Reverse of 20260505_041000_merchant_training_progress.sql
-- OP-6 FIX: rollback path.
--
-- DESTRUCTIVE: drops the merchant_training_progress table and all
-- training progress data.

BEGIN;

DROP INDEX IF EXISTS idx_merchant_training_progress_updated;
DROP TABLE IF EXISTS merchant_training_progress;

COMMIT;

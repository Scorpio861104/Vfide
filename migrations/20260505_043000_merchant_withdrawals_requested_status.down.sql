-- Reverse of 20260505_043000_merchant_withdrawals_requested_status.sql
-- OP-6 FIX: rollback path.
--
-- The up migration:
--   - Set status DEFAULT 'requested'
--   - Updated existing 'pending' rows (where completed_at IS NULL) to 'requested'
--
-- The reversal:
--   - Restore status DEFAULT to 'pending' (the prior default)
--   - Update 'requested' rows back to 'pending' (only those still
--     incomplete; completed_at IS NULL rows that were originally
--     'pending' before the up migration ran)
--
-- WARNING: this rollback may merge legitimate post-migration 'requested'
-- writes back into 'pending'. If the application has been writing
-- 'requested' since the up migration, those will be re-mapped. Operators
-- should suspend writes before rolling back.

BEGIN;

ALTER TABLE merchant_withdrawals
  ALTER COLUMN status SET DEFAULT 'pending';

UPDATE merchant_withdrawals
   SET status = 'pending'
 WHERE status = 'requested'
   AND completed_at IS NULL;

COMMIT;

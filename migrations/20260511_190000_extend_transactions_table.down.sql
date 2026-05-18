-- Down migration for 20260511_190000_extend_transactions_table.sql
--
-- Removes the columns and indexes added above. Does NOT convert `id`
-- back to SERIAL (that's destructive and not reversible without data
-- loss; if you really need to revert, restore from a backup).

BEGIN;

DROP POLICY IF EXISTS transactions_party_access ON transactions;

DROP INDEX IF EXISTS idx_transactions_timestamp;
DROP INDEX IF EXISTS idx_transactions_to;
DROP INDEX IF EXISTS idx_transactions_from;
DROP INDEX IF EXISTS idx_transactions_user_address;

ALTER TABLE transactions
  DROP COLUMN IF EXISTS created_at,
  DROP COLUMN IF EXISTS metadata,
  DROP COLUMN IF EXISTS fee,
  DROP COLUMN IF EXISTS message,
  DROP COLUMN IF EXISTS currency,
  DROP COLUMN IF EXISTS token_amount,
  DROP COLUMN IF EXISTS to_address,
  DROP COLUMN IF EXISTS from_address,
  DROP COLUMN IF EXISTS user_address;

COMMIT;

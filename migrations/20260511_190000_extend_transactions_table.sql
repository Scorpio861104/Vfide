-- Migration: extend the `transactions` table with the columns the
-- `saveTransaction()` flow in `lib/crypto.ts` wants to log.
--
-- The original schema (initial_schema.sql) was minimal:
--   id, user_id, tx_hash, type, amount, status, timestamp
--
-- The frontend has been sending a richer payload (from/to addresses,
-- token amount, currency, message, fee, metadata) and the receiving
-- POST /api/crypto/transactions endpoint didn't exist, so the data has
-- been silently discarded since the feature was added.
--
-- This migration adds the missing columns, makes `id` a TEXT primary
-- key (so the frontend-generated random IDs work for idempotent upsert),
-- and adds an index for lookups by either party's address.

BEGIN;

-- 1. Add the columns the API expects.  All optional except those that
-- the existing GET path also already returns.
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS user_address  TEXT,
  ADD COLUMN IF NOT EXISTS from_address  TEXT,
  ADD COLUMN IF NOT EXISTS to_address    TEXT,
  ADD COLUMN IF NOT EXISTS token_amount  DECIMAL(36, 18),
  ADD COLUMN IF NOT EXISTS currency      TEXT,
  ADD COLUMN IF NOT EXISTS message       TEXT,
  ADD COLUMN IF NOT EXISTS fee           DECIMAL(36, 18),
  ADD COLUMN IF NOT EXISTS metadata      JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 2. Convert the legacy `id SERIAL` to TEXT so frontend-generated random
-- IDs work. Existing serial values stay as their stringified form.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transactions' AND column_name = 'id' AND data_type = 'integer'
  ) THEN
    ALTER TABLE transactions ALTER COLUMN id TYPE TEXT USING id::TEXT;
  END IF;
END $$;

-- 3. Indexes for the dual-party query pattern (a buyer can look up a
-- send they received, a merchant can look up a transfer in).
CREATE INDEX IF NOT EXISTS idx_transactions_user_address ON transactions(LOWER(user_address));
CREATE INDEX IF NOT EXISTS idx_transactions_from         ON transactions(LOWER(from_address));
CREATE INDEX IF NOT EXISTS idx_transactions_to           ON transactions(LOWER(to_address));
CREATE INDEX IF NOT EXISTS idx_transactions_timestamp    ON transactions(timestamp DESC);

-- 4. Grants and RLS.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'vfide_app') THEN
    GRANT SELECT, INSERT, UPDATE ON transactions TO vfide_app;
  END IF;
END$$;

-- 5. RLS — owner is either party. The existing policy (if any) covers
-- user_id-based reads; the new policy adds address-based read so the
-- buyer can see incoming transfers without having a users.id row.
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS transactions_party_access ON transactions;
CREATE POLICY transactions_party_access ON transactions
  FOR ALL
  USING (
    LOWER(COALESCE(user_address, '')) = LOWER(current_setting('app.current_user_address', true)::text)
    OR LOWER(COALESCE(from_address, '')) = LOWER(current_setting('app.current_user_address', true)::text)
    OR LOWER(COALESCE(to_address, '')) = LOWER(current_setting('app.current_user_address', true)::text)
  )
  WITH CHECK (
    LOWER(COALESCE(user_address, '')) = LOWER(current_setting('app.current_user_address', true)::text)
  );

COMMIT;

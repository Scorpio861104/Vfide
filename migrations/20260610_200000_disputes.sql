-- Migration: 20260610_200000_disputes.sql
--
-- Purpose:
--   Off-chain DISPUTE RECORD layer (Fraud & Abuse + Marketplace Trust inputs). Mirrors the on-chain
--   FraudRegistry philosophy: this system RECORDS and TRACKS disputes — it never holds, delays, or
--   seizes funds, and it never unilaterally "convicts". A dispute is opened by a buyer against a
--   merchant payment, the merchant can respond, and it resolves (settled / refunded / withdrawn /
--   upheld). Confirmed-fraud punishment remains the on-chain FraudJury's job; this just surfaces the
--   human-readable dispute trail and feeds the Seer's risk signals.
--
-- Visibility: both parties to a dispute can read it (opener OR respondent). Writes are role-scoped in
-- the API (opener opens; respondent responds; either can withdraw their side). RLS below allows a
-- party to SELECT rows where they are opener or respondent.

CREATE TABLE IF NOT EXISTS disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- The buyer/opener and the merchant/respondent.
  opener_address TEXT NOT NULL,
  respondent_address TEXT NOT NULL,
  -- Anchor to a real payment when available (tx_hash from merchant_payment_confirmations) + order.
  tx_hash TEXT,
  order_id TEXT,
  reason TEXT NOT NULL CHECK (char_length(reason) BETWEEN 1 AND 80),
  detail TEXT CHECK (detail IS NULL OR char_length(detail) <= 2000),
  -- Lifecycle. 'open' → ('responded') → resolved states. No state holds funds.
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'responded', 'resolved_refunded', 'resolved_settled', 'resolved_upheld', 'withdrawn')),
  merchant_response TEXT CHECK (merchant_response IS NULL OR char_length(merchant_response) <= 2000),
  resolution_note TEXT CHECK (resolution_note IS NULL OR char_length(resolution_note) <= 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

-- Indexes for the two participant lookups + status filtering. (Run CONCURRENTLY outside a txn.)
CREATE INDEX IF NOT EXISTS idx_disputes_opener ON disputes(opener_address);
CREATE INDEX IF NOT EXISTS idx_disputes_respondent ON disputes(respondent_address);
CREATE INDEX IF NOT EXISTS idx_disputes_status ON disputes(status);

DO $$
BEGIN
  PERFORM 1 FROM pg_roles WHERE rolname = 'vfide_app';
  IF FOUND THEN
    EXECUTE 'GRANT SELECT, INSERT, UPDATE ON disputes TO vfide_app';
  ELSE
    RAISE NOTICE 'Role vfide_app does not exist; skipping grant (dev).';
  END IF;
END $$;

ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- Either party to the dispute can read it.
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'disputes' AND policyname = 'disputes_party_select') THEN
    EXECUTE $p$
      CREATE POLICY disputes_party_select ON disputes
      FOR SELECT USING (
        opener_address = current_setting('app.current_user_address', true)
        OR respondent_address = current_setting('app.current_user_address', true)
      )
    $p$;
  END IF;
  -- Either party may write (API enforces which fields each role may change).
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'disputes' AND policyname = 'disputes_party_write') THEN
    EXECUTE $p$
      CREATE POLICY disputes_party_write ON disputes
      FOR ALL USING (
        opener_address = current_setting('app.current_user_address', true)
        OR respondent_address = current_setting('app.current_user_address', true)
      )
      WITH CHECK (
        opener_address = current_setting('app.current_user_address', true)
        OR respondent_address = current_setting('app.current_user_address', true)
      )
    $p$;
  END IF;
END $$;

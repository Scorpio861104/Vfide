-- Migration: 20260611_120000_merchant_business_transfer.sql
--
-- Purpose:
--   MERCHANT SUCCESSION EXECUTION (Phase 1). Continuity already records WHO inherits (merchant_succession)
--   and WHO can operate in an emergency (merchant_operators). What was missing is EXECUTION: actually
--   handing the business to the successor. This adds the transfer state machine.
--
--   Non-custodial / participant-controlled by construction:
--     • Voluntary path: the OWNER initiates a transfer; the SUCCESSOR must ACCEPT; then it executes.
--     • Emergency path: a configured emergency operator OR the designated successor may REQUEST an
--       emergency transfer, which enters a mandatory waiting period (the owner can VETO during it).
--       Only after the window with no veto can it execute. No automatic seizure; the owner always has
--       the veto. This mirrors the on-chain recovery/inheritance delay+veto pattern.
--
--   IMPORTANT: this transfers the off-chain BUSINESS RECORDS (catalog, subscriptions, payment config,
--   staff, etc.). The on-chain FUNDS/vault are a SEPARATE handover via the existing inheritance flow
--   (useInheritance / CardBoundVault) — this migration never touches funds.

CREATE TABLE IF NOT EXISTS merchant_business_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- The current owner and the successor receiving the business.
  from_address TEXT NOT NULL,
  to_address TEXT NOT NULL,
  -- 'voluntary' = owner-initiated; 'emergency' = operator/successor-initiated (incapacity), with veto window.
  kind TEXT NOT NULL CHECK (kind IN ('voluntary', 'emergency')),
  status TEXT NOT NULL DEFAULT 'initiated' CHECK (status IN (
    'initiated',        -- created, awaiting successor acceptance (voluntary) or in veto window (emergency)
    'accepted',         -- successor accepted (voluntary) — ready to execute
    'veto_window',      -- emergency request waiting out the owner-veto period
    'vetoed',           -- owner vetoed an emergency request
    'executed',         -- ownership of business records reassigned
    'cancelled'         -- owner/successor cancelled before execution
  )),
  -- Emergency veto window: execution not allowed before this time; owner may veto until then.
  veto_until TIMESTAMPTZ,
  note TEXT CHECK (note IS NULL OR char_length(note) <= 2000),
  -- Snapshot of what was transferred, recorded at execution for the audit trail.
  transferred_summary JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  executed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_mbt_from ON merchant_business_transfers(from_address);
CREATE INDEX IF NOT EXISTS idx_mbt_to ON merchant_business_transfers(to_address);
CREATE INDEX IF NOT EXISTS idx_mbt_status ON merchant_business_transfers(status);
-- Only one active (non-terminal) transfer per merchant at a time.
CREATE UNIQUE INDEX IF NOT EXISTS idx_mbt_one_active
  ON merchant_business_transfers(from_address)
  WHERE status IN ('initiated', 'accepted', 'veto_window');

DO $$
BEGIN
  PERFORM 1 FROM pg_roles WHERE rolname = 'vfide_app';
  IF FOUND THEN
    EXECUTE 'GRANT SELECT, INSERT, UPDATE ON merchant_business_transfers TO vfide_app';
  ELSE
    RAISE NOTICE 'Role vfide_app does not exist; skipping grant (dev).';
  END IF;
END $$;

ALTER TABLE merchant_business_transfers ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- Both parties to a transfer can read it.
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'merchant_business_transfers' AND policyname = 'mbt_party_select') THEN
    EXECUTE $p$
      CREATE POLICY mbt_party_select ON merchant_business_transfers
      FOR SELECT USING (
        from_address = current_setting('app.current_user_address', true)
        OR to_address = current_setting('app.current_user_address', true)
      )
    $p$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'merchant_business_transfers' AND policyname = 'mbt_party_write') THEN
    EXECUTE $p$
      CREATE POLICY mbt_party_write ON merchant_business_transfers
      FOR ALL USING (
        from_address = current_setting('app.current_user_address', true)
        OR to_address = current_setting('app.current_user_address', true)
      )
      WITH CHECK (
        from_address = current_setting('app.current_user_address', true)
        OR to_address = current_setting('app.current_user_address', true)
      )
    $p$;
  END IF;
END $$;

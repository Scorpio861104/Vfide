-- Migration: 20260611_100000_dao_override_ledger.sql
--
-- Purpose:
--   The DAO OVERRIDE LEDGER (Phase 2 - "the DAO governs the Seer; both must be auditable").
--   An append-only, PUBLIC record of every time the DAO overrides a Seer decision (a cooldown call, a
--   fraud classification, an emergency denial, a lending recommendation, a marketplace penalty, etc.).
--   It answers: what was overridden, why, by whom/which proposal, and what the impact was.
--
--   This ledger does NOT grant override authority - that comes from on-chain governance. It is the
--   transparency/audit layer over those decisions. Recording is admin/governance-gated in the API;
--   reads are PUBLIC (anyone can audit the DAO). Append-only: no UPDATE/DELETE policy is granted.
--
-- Conventions: append-only, public SELECT, service/admin INSERT only, TIMESTAMPTZ.

CREATE TABLE IF NOT EXISTS dao_override_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- What kind of Seer decision was overridden.
  override_type TEXT NOT NULL CHECK (override_type IN (
    'cooldown', 'stabilization_fee', 'emergency_decision', 'fraud_classification',
    'marketplace_penalty', 'lending_recommendation', 'extraction_classification', 'other'
  )),
  -- Who/what the override applies to (a wallet, a merchant, a request id...). Optional.
  subject_identity TEXT,
  -- The Seer's original decision and the DAO's replacement, in plain language.
  original_decision TEXT NOT NULL CHECK (char_length(original_decision) BETWEEN 1 AND 1000),
  override_decision TEXT NOT NULL CHECK (char_length(override_decision) BETWEEN 1 AND 1000),
  -- Why. Required - no silent overrides.
  reason TEXT NOT NULL CHECK (char_length(reason) BETWEEN 1 AND 2000),
  -- Governance provenance: which proposal authorized this, and vote tally if known.
  proposal_ref TEXT,
  votes_for INTEGER,
  votes_against INTEGER,
  -- Who recorded it (admin/governance actor address), and the observed impact.
  recorded_by TEXT NOT NULL,
  impact TEXT CHECK (impact IS NULL OR char_length(impact) <= 1000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dao_override_type ON dao_override_ledger(override_type);
CREATE INDEX IF NOT EXISTS idx_dao_override_subject ON dao_override_ledger(subject_identity);
CREATE INDEX IF NOT EXISTS idx_dao_override_created ON dao_override_ledger(created_at DESC);

DO $$
BEGIN
  PERFORM 1 FROM pg_roles WHERE rolname = 'vfide_app';
  IF FOUND THEN
    -- INSERT + SELECT only. No UPDATE/DELETE grant -> append-only at the privilege level.
    EXECUTE 'GRANT SELECT, INSERT ON dao_override_ledger TO vfide_app';
  ELSE
    RAISE NOTICE 'Role vfide_app does not exist; skipping grant (dev).';
  END IF;
END $$;

ALTER TABLE dao_override_ledger ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- PUBLIC transparency: anyone may read the ledger (auditing the DAO).
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'dao_override_ledger' AND policyname = 'dao_override_public_select') THEN
    EXECUTE 'CREATE POLICY dao_override_public_select ON dao_override_ledger FOR SELECT USING (true)';
  END IF;
  -- INSERT allowed at the RLS layer; the API gates it to admins via requireAdmin. (No UPDATE/DELETE policy.)
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'dao_override_ledger' AND policyname = 'dao_override_insert') THEN
    EXECUTE 'CREATE POLICY dao_override_insert ON dao_override_ledger FOR INSERT WITH CHECK (true)';
  END IF;
END $$;

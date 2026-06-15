-- Migration: 20260610_220000_sanctum_requests.sql
--
-- Purpose:
--   Off-chain community SUPPORT-REQUEST + recommendation layer for Sanctum (Institution 6 —
--   Stewardship). Sanctum's funds live in the on-chain, DAO-governed SanctumVault; this table holds
--   the human-readable requests + the Seer's advisory priority, so the DAO has a transparent shortlist.
--
-- NON-CUSTODIAL: nothing here moves funds. The Seer proposes a ranking; disbursement is an on-chain
-- DAO vote (SanctumVault.DisbursementProposed → DAO). A 'recommended' row is NOT an approval.
--
-- Visibility: requests are community-visible (a public funding queue), so SELECT is open to any
-- authenticated user; writes are restricted (a requester edits/withdraws their own row; status
-- transitions to recommended/approved/declined are DAO-role actions enforced in the API).

CREATE TABLE IF NOT EXISTS sanctum_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_address TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('emergency_relief','community_project','merchant_grant','public_good','education')),
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 120),
  description TEXT CHECK (description IS NULL OR char_length(description) <= 4000),
  amount_vfide NUMERIC NOT NULL CHECK (amount_vfide > 0),
  stated_beneficiaries INTEGER NOT NULL DEFAULT 1 CHECK (stated_beneficiaries >= 0),
  -- Seer's advisory priority (0..100) + verdict; recomputed server-side, never trusted from client.
  priority_score INTEGER CHECK (priority_score IS NULL OR (priority_score >= 0 AND priority_score <= 100)),
  recommendation TEXT CHECK (recommendation IS NULL OR recommendation IN ('prioritize','consider','needs_review','defer')),
  -- Lifecycle. submitted → recommended (Seer-scored) → approved/declined (DAO) | withdrawn (requester).
  status TEXT NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('submitted','recommended','approved','declined','withdrawn')),
  dao_note TEXT CHECK (dao_note IS NULL OR char_length(dao_note) <= 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sanctum_requests_status ON sanctum_requests(status);
CREATE INDEX IF NOT EXISTS idx_sanctum_requests_requester ON sanctum_requests(requester_address);

DO $$
BEGIN
  PERFORM 1 FROM pg_roles WHERE rolname = 'vfide_app';
  IF FOUND THEN
    EXECUTE 'GRANT SELECT, INSERT, UPDATE ON sanctum_requests TO vfide_app';
  ELSE
    RAISE NOTICE 'Role vfide_app does not exist; skipping grant (dev).';
  END IF;
END $$;

ALTER TABLE sanctum_requests ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- Public funding queue: any authenticated user can read.
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sanctum_requests' AND policyname = 'sanctum_public_select') THEN
    EXECUTE 'CREATE POLICY sanctum_public_select ON sanctum_requests FOR SELECT USING (true)';
  END IF;
  -- A requester may write their own row (API gates DAO-only status transitions).
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sanctum_requests' AND policyname = 'sanctum_requester_write') THEN
    EXECUTE $p$
      CREATE POLICY sanctum_requester_write ON sanctum_requests
      FOR ALL USING (requester_address = current_setting('app.current_user_address', true))
      WITH CHECK (requester_address = current_setting('app.current_user_address', true))
    $p$;
  END IF;
END $$;

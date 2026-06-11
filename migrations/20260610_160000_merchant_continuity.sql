-- Migration: 20260610_160000_merchant_continuity.sql
--
-- Purpose:
--   Make MERCHANT CONTINUITY real infrastructure (Wave 50, Priority 4), separate from PERSONAL
--   continuity. Until now the merchant "Business Continuity" section linked to personal features
--   (/inheritance, /vault/recover) — a presentation veneer with no merchant-specific backend
--   (flagged in the Wave 44 audit). This adds genuine, merchant-scoped records.
--
-- Scope of THIS migration (the real, complete part):
--   • merchant_succession  — who takes over the BUSINESS if the owner can't continue (distinct from
--     personal vault heirs). One designated successor per merchant.
--   • merchant_operators   — emergency operators granted operational standing to help run the
--     business, WITHOUT ownership transfer (protection-without-control: the owner stays in charge).
--
-- What this deliberately does NOT do (the gated, irreversible part — see route + summary):
--   • It does not EXECUTE a handoff (reassigning every merchant_* row's ownership) or ENFORCE
--     operator access in the auth layer. Those are large, risky, partly on-chain operations that
--     must be designed and verified carefully. This layer records designations + readiness + emits
--     events; execution is the next step, explicitly gated.
--
-- Conventions: merchant_address owner column (owner-only RLS via app.current_user_address), UUID PK,
-- TIMESTAMPTZ. Default privileges from the baseline RLS migration grant these to vfide_app; explicit
-- grants below are idempotent belt-and-suspenders.

-- ── Merchant succession: the designated business successor ───────────────────
CREATE TABLE IF NOT EXISTS merchant_succession (
  merchant_address TEXT PRIMARY KEY,
  successor_address TEXT NOT NULL,
  -- Plain-language note from the owner ("My daughter Ana runs the stall on weekends").
  note TEXT,
  configured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT merchant_succession_not_self CHECK (lower(successor_address) <> lower(merchant_address))
);

-- ── Merchant operators: emergency operational access (no ownership) ─────────
CREATE TABLE IF NOT EXISTS merchant_operators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_address TEXT NOT NULL,
  operator_address TEXT NOT NULL,
  -- A human label for what they can help with (display only at this layer).
  role TEXT NOT NULL DEFAULT 'operator' CHECK (char_length(role) BETWEEN 1 AND 40),
  note TEXT,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  CONSTRAINT merchant_operators_not_self CHECK (lower(operator_address) <> lower(merchant_address)),
  CONSTRAINT merchant_operators_unique UNIQUE (merchant_address, operator_address)
);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_merchant_operators_merchant
  ON merchant_operators (merchant_address, revoked_at);

-- ── Grants (idempotent) ──────────────────────────────────────────────────────
DO $$
BEGIN
  PERFORM 1 FROM pg_roles WHERE rolname = 'vfide_app';
  IF FOUND THEN
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON merchant_succession TO vfide_app';
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON merchant_operators TO vfide_app';
  ELSE
    RAISE NOTICE 'Role vfide_app does not exist; skipping grants (dev environment).';
  END IF;
END $$;

-- ── Owner-only RLS: a merchant manages only their own continuity records ─────
ALTER TABLE merchant_succession ENABLE ROW LEVEL SECURITY;
ALTER TABLE merchant_operators ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'merchant_succession' AND policyname = 'merchant_succession_owner_all') THEN
    EXECUTE $p$
      CREATE POLICY merchant_succession_owner_all ON merchant_succession
      USING (merchant_address = current_setting('app.current_user_address', true))
      WITH CHECK (merchant_address = current_setting('app.current_user_address', true))
    $p$;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'merchant_operators' AND policyname = 'merchant_operators_owner_all') THEN
    EXECUTE $p$
      CREATE POLICY merchant_operators_owner_all ON merchant_operators
      USING (merchant_address = current_setting('app.current_user_address', true))
      WITH CHECK (merchant_address = current_setting('app.current_user_address', true))
    $p$;
  END IF;
END $$;

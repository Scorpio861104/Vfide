-- Migration: 20260511_180000_merchant_tip_paylink_tax.sql
--
-- Adds the missing merchant-OS data tables for: tip-jar settings,
-- payment links (shareable URLs), and tax rates (configurable jurisdictions).
-- All three are write-heavy by merchant only, owner-RLS-scoped by
-- merchant_address.
--
-- The existing `merchant_tips` table (created in 20260131_100000) already
-- stores actual tip transactions; this migration only adds the SETTINGS
-- table that tells the POS/checkout flow which preset amounts to offer
-- and whether tips are enabled at all.

BEGIN;

-- ============================================================================
-- 1. Tip settings (tip jar config per merchant)
-- ============================================================================
CREATE TABLE IF NOT EXISTS merchant_tip_settings (
  merchant_address TEXT PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  default_preset_percentages INTEGER[] NOT NULL DEFAULT ARRAY[15, 18, 20, 25],
  allow_custom_amount BOOLEAN NOT NULL DEFAULT TRUE,
  prompt_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 2. Payment links (shareable VFIDE checkout URLs)
-- ============================================================================
CREATE TABLE IF NOT EXISTS merchant_payment_links (
  id BIGSERIAL PRIMARY KEY,
  link_id TEXT UNIQUE NOT NULL,                 -- public slug for /pay/link/<id>
  merchant_address TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  token TEXT NOT NULL,                          -- VFIDE token contract address
  amount DECIMAL(36, 18),                       -- NULL = customer enters
  min_amount DECIMAL(36, 18),                   -- when amount is NULL
  max_amount DECIMAL(36, 18),                   -- when amount is NULL
  currency_display TEXT DEFAULT 'VFIDE',
  redirect_url TEXT,                            -- post-payment redirect
  collect_email BOOLEAN NOT NULL DEFAULT FALSE,
  collect_shipping BOOLEAN NOT NULL DEFAULT FALSE,
  single_use BOOLEAN NOT NULL DEFAULT FALSE,
  max_uses INTEGER,
  uses INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active'         -- active | paused | archived | exhausted
    CHECK (status IN ('active', 'paused', 'archived', 'exhausted')),
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_paylinks_merchant ON merchant_payment_links(merchant_address, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_paylinks_status ON merchant_payment_links(merchant_address, status);

-- ============================================================================
-- 3. Tax rates (multi-jurisdiction config per merchant)
-- ============================================================================
CREATE TABLE IF NOT EXISTS merchant_tax_rates (
  id BIGSERIAL PRIMARY KEY,
  merchant_address TEXT NOT NULL,
  name TEXT NOT NULL,                           -- e.g. "California Sales Tax"
  rate_bps INTEGER NOT NULL                     -- e.g. 725 = 7.25%
    CHECK (rate_bps >= 0 AND rate_bps <= 10000),
  jurisdiction_country TEXT,                    -- ISO 3166-1 alpha-2: "US"
  jurisdiction_state TEXT,                      -- "CA"
  jurisdiction_city TEXT,                       -- "Los Angeles"
  postal_code_pattern TEXT,                     -- regex like "^9[0-1]\d{3}"
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  applies_to TEXT[] NOT NULL DEFAULT ARRAY['physical', 'digital', 'service'],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_taxrates_merchant ON merchant_tax_rates(merchant_address, enabled);
CREATE UNIQUE INDEX IF NOT EXISTS idx_taxrates_default_per_merchant
  ON merchant_tax_rates(merchant_address) WHERE is_default = TRUE;

-- ============================================================================
-- 4. Grants and RLS
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'vfide_app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON
      merchant_tip_settings, merchant_payment_links, merchant_tax_rates
      TO vfide_app;
    GRANT USAGE ON SEQUENCE merchant_payment_links_id_seq TO vfide_app;
    GRANT USAGE ON SEQUENCE merchant_tax_rates_id_seq TO vfide_app;
  END IF;
END$$;

-- RLS — merchant_address is the owner column on all three.
ALTER TABLE merchant_tip_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE merchant_payment_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE merchant_tax_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY merchant_tip_settings_own ON merchant_tip_settings
  FOR ALL
  USING (LOWER(merchant_address) = LOWER(current_setting('app.current_user_address', true)::text))
  WITH CHECK (LOWER(merchant_address) = LOWER(current_setting('app.current_user_address', true)::text));

CREATE POLICY merchant_payment_links_own ON merchant_payment_links
  FOR ALL
  USING (LOWER(merchant_address) = LOWER(current_setting('app.current_user_address', true)::text))
  WITH CHECK (LOWER(merchant_address) = LOWER(current_setting('app.current_user_address', true)::text));

-- Read-public for /pay/link/<id> resolution. Buyers need to read a single
-- link by link_id without authenticating; the API enforces single-row,
-- non-archived reads.
CREATE POLICY merchant_payment_links_public_read ON merchant_payment_links
  FOR SELECT
  USING (status = 'active');

CREATE POLICY merchant_tax_rates_own ON merchant_tax_rates
  FOR ALL
  USING (LOWER(merchant_address) = LOWER(current_setting('app.current_user_address', true)::text))
  WITH CHECK (LOWER(merchant_address) = LOWER(current_setting('app.current_user_address', true)::text));

COMMIT;

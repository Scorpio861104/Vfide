-- Remittance beneficiaries canonical schema.
-- The table may already exist from 20260131_100000_feature_expansion with an
-- older schema (sender_address column, UUID pk, phone_hash instead of phone).
-- This migration reconciles both cases:
--   1. Fresh install: CREATE TABLE creates the canonical layout.
--   2. Upgrade from feature_expansion: ALTER TABLE renames/adds columns.

CREATE TABLE IF NOT EXISTS remittance_beneficiaries (
  id BIGSERIAL PRIMARY KEY,
  owner_address TEXT NOT NULL,
  label VARCHAR(80),
  name VARCHAR(120) NOT NULL,
  phone VARCHAR(32) NOT NULL,
  network VARCHAR(32) NOT NULL,
  account_number VARCHAR(64),
  wallet_address TEXT,
  country VARCHAR(2) NOT NULL,
  relationship VARCHAR(40) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Reconcile schema differences introduced by the earlier feature_expansion
-- migration which used different column names.
DO $$ BEGIN
  -- Rename sender_address -> owner_address if the old column still exists.
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'remittance_beneficiaries'
      AND column_name = 'sender_address'
  ) THEN
    ALTER TABLE remittance_beneficiaries
      RENAME COLUMN sender_address TO owner_address;
  END IF;

  -- Add label column if missing (feature_expansion schema omitted it).
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'remittance_beneficiaries'
      AND column_name = 'label'
  ) THEN
    ALTER TABLE remittance_beneficiaries ADD COLUMN label VARCHAR(80);
  END IF;

  -- Rename phone_hash -> phone if the old column still exists.
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'remittance_beneficiaries'
      AND column_name = 'phone_hash'
  ) THEN
    ALTER TABLE remittance_beneficiaries
      RENAME COLUMN phone_hash TO phone;
    ALTER TABLE remittance_beneficiaries
      ALTER COLUMN phone TYPE VARCHAR(32);
  END IF;

  -- Rename account_number_encrypted -> account_number if the old column exists.
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'remittance_beneficiaries'
      AND column_name = 'account_number_encrypted'
  ) THEN
    ALTER TABLE remittance_beneficiaries
      RENAME COLUMN account_number_encrypted TO account_number;
    ALTER TABLE remittance_beneficiaries
      ALTER COLUMN account_number TYPE VARCHAR(64);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_remittance_beneficiaries_owner_created
  ON remittance_beneficiaries (owner_address, created_at DESC);

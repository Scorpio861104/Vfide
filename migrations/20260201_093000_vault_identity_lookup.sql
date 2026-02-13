-- Migration: Vault identity lookup table
-- Created: 2026-02-01

CREATE TABLE IF NOT EXISTS vault_identities (
  id SERIAL PRIMARY KEY,
  vault_address VARCHAR(42) UNIQUE NOT NULL,
  recovery_id_hash VARCHAR(66),
  email_hash VARCHAR(66),
  username_hash VARCHAR(66),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_vault_identities_recovery ON vault_identities(recovery_id_hash);
CREATE INDEX IF NOT EXISTS idx_vault_identities_email ON vault_identities(email_hash);
CREATE INDEX IF NOT EXISTS idx_vault_identities_username ON vault_identities(username_hash);

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

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_remittance_beneficiaries_owner_created
  ON remittance_beneficiaries (owner_address, created_at DESC);

CREATE TABLE IF NOT EXISTS privacy_deletion_requests (
  id BIGSERIAL PRIMARY KEY,
  wallet_address TEXT NOT NULL,
  email TEXT,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  UNIQUE(wallet_address, status)
);

CREATE INDEX IF NOT EXISTS idx_privacy_deletion_requests_wallet_created
  ON privacy_deletion_requests(wallet_address, created_at DESC);

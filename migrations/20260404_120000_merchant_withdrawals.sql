CREATE TABLE IF NOT EXISTS merchant_withdrawals (
  id BIGSERIAL PRIMARY KEY,
  merchant_address TEXT NOT NULL,
  amount NUMERIC(36, 18) NOT NULL,
  token VARCHAR(20) NOT NULL,
  provider VARCHAR(40) NOT NULL,
  mobile_number_hint VARCHAR(16),
  network VARCHAR(40) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  provider_tx_id VARCHAR(80),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_merchant_withdrawals_merchant_created
  ON merchant_withdrawals (merchant_address, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_merchant_withdrawals_status
  ON merchant_withdrawals (status);

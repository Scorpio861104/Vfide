CREATE TABLE IF NOT EXISTS merchant_payment_confirmations (
  id BIGSERIAL PRIMARY KEY,
  merchant_address TEXT NOT NULL,
  tx_hash TEXT NOT NULL,
  customer_address TEXT NOT NULL,
  amount TEXT NOT NULL,
  token TEXT,
  order_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(merchant_address, tx_hash)
);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_merchant_payment_confirmations_merchant_created
  ON merchant_payment_confirmations(merchant_address, created_at DESC);

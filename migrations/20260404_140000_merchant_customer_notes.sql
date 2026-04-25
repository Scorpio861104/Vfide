CREATE TABLE IF NOT EXISTS merchant_customer_notes (
  merchant_address TEXT NOT NULL,
  customer_address TEXT NOT NULL,
  notes TEXT,
  tags TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (merchant_address, customer_address)
);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_merchant_customer_notes_updated
  ON merchant_customer_notes (merchant_address, updated_at DESC);

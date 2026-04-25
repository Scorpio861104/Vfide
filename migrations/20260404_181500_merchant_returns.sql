CREATE TABLE IF NOT EXISTS merchant_returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_address TEXT NOT NULL,
  order_id TEXT NOT NULL,
  customer_address TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  type TEXT NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'approved', 'rejected', 'completed')),
  refund_amount DECIMAL(10,2),
  credit_amount DECIMAL(10,2),
  resolved_at TIMESTAMPTZ,
  resolved_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_merchant_returns_merchant_created
  ON merchant_returns (merchant_address, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_merchant_returns_status
  ON merchant_returns (status);

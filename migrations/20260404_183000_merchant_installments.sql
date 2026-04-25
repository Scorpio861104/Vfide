CREATE TABLE IF NOT EXISTS merchant_installment_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_address TEXT NOT NULL,
  customer_address TEXT NOT NULL,
  order_id TEXT NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  installment_count INTEGER NOT NULL CHECK (installment_count > 0),
  installment_amount DECIMAL(10,2) NOT NULL,
  interval_days INTEGER NOT NULL DEFAULT 30 CHECK (interval_days > 0),
  paid_count INTEGER NOT NULL DEFAULT 0,
  next_payment_due TIMESTAMPTZ,
  token TEXT NOT NULL DEFAULT 'VFIDE',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS installment_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES merchant_installment_plans(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  tx_hash TEXT,
  paid_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_installment_plans_merchant_created
  ON merchant_installment_plans (merchant_address, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_installment_payments_plan
  ON installment_payments (plan_id, paid_at DESC);

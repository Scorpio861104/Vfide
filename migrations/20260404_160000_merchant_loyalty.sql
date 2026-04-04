CREATE TABLE IF NOT EXISTS merchant_loyalty_programs (
  merchant_address TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'stamp' CHECK (type IN ('stamp', 'points')),
  stamps_required INTEGER NOT NULL DEFAULT 10,
  points_per_unit NUMERIC(18,2) NOT NULL DEFAULT 1,
  reward_description TEXT NOT NULL,
  reward_type TEXT NOT NULL CHECK (reward_type IN ('free_item', 'percentage_discount', 'fixed_discount')),
  reward_value NUMERIC(18,2) NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customer_loyalty (
  merchant_address TEXT NOT NULL,
  customer_address TEXT NOT NULL,
  stamps INTEGER NOT NULL DEFAULT 0,
  rewards_earned INTEGER NOT NULL DEFAULT 0,
  rewards_redeemed INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (merchant_address, customer_address)
);

CREATE INDEX IF NOT EXISTS idx_customer_loyalty_merchant_updated
  ON customer_loyalty (merchant_address, updated_at DESC);

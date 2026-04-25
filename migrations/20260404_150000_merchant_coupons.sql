CREATE TABLE IF NOT EXISTS merchant_coupons (
  id TEXT PRIMARY KEY,
  merchant_address TEXT NOT NULL,
  code TEXT NOT NULL,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value NUMERIC(18,2) NOT NULL,
  min_order_amount NUMERIC(18,2),
  max_discount NUMERIC(18,2),
  max_uses INTEGER,
  uses INTEGER NOT NULL DEFAULT 0,
  per_customer_limit INTEGER NOT NULL DEFAULT 1,
  valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_until TIMESTAMPTZ,
  active BOOLEAN NOT NULL DEFAULT true,
  product_ids TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (merchant_address, code)
);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_merchant_coupons_merchant_active
  ON merchant_coupons (merchant_address, active, valid_from DESC);

CREATE TABLE IF NOT EXISTS coupon_redemptions (
  id BIGSERIAL PRIMARY KEY,
  coupon_id TEXT NOT NULL REFERENCES merchant_coupons(id) ON DELETE CASCADE,
  customer_address TEXT NOT NULL,
  order_id INTEGER REFERENCES merchant_orders(id) ON DELETE SET NULL,
  discount_applied NUMERIC(18,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_coupon_redemptions_coupon_customer
  ON coupon_redemptions (coupon_id, customer_address, created_at DESC);

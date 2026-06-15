-- Commerce Operations Phase 1E — Bundles & Discounts.
-- Bundles: "buy these products together for a set price / % off". Coupons already exist (merchant_coupons,
-- 20260404_150000); 1E adds bundles + records the bundle/coupon discount on the order.
-- No table drops; additive. See docs/COMMERCE_PHASE_1E_BUNDLES_DISCOUNTS_CERTIFICATION.md.

CREATE TABLE IF NOT EXISTS merchant_bundles (
  id SERIAL PRIMARY KEY,
  merchant_address TEXT NOT NULL,
  name TEXT NOT NULL,
  pricing_type TEXT NOT NULL DEFAULT 'fixed' CHECK (pricing_type IN ('fixed', 'percent')),
  amount NUMERIC(18,2) NOT NULL DEFAULT 0,   -- fixed bundle price, or percent off components
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_bundles_merchant ON merchant_bundles(merchant_address, active);

-- A bundle's required components (product + quantity). A bundle fires when the cart contains all of them.
CREATE TABLE IF NOT EXISTS merchant_bundle_components (
  id SERIAL PRIMARY KEY,
  bundle_id INTEGER NOT NULL REFERENCES merchant_bundles(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES merchant_products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0)
);
CREATE INDEX IF NOT EXISTS idx_bundle_components_bundle ON merchant_bundle_components(bundle_id);

-- Record the discount sources applied to an order (for reconciliation / display).
ALTER TABLE merchant_orders ADD COLUMN IF NOT EXISTS coupon_code TEXT;
ALTER TABLE merchant_orders ADD COLUMN IF NOT EXISTS bundle_discount NUMERIC(18,2) NOT NULL DEFAULT 0;

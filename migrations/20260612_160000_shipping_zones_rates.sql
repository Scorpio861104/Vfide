-- Commerce Operations Phase 1C — Shipping Operations (in-house rate engine).
-- Merchant-defined zones + rate rules → server-authoritative shipping cost at checkout. This is NOT a live
-- carrier integration (see lib/commerce/carrierAdapter.ts for that boundary).
-- See docs/COMMERCE_PHASE_1C_SHIPPING_CERTIFICATION.md.

CREATE TABLE IF NOT EXISTS merchant_shipping_zones (
  id SERIAL PRIMARY KEY,
  merchant_address TEXT NOT NULL,
  name TEXT NOT NULL,                                   -- "Domestic", "EU", "Rest of World"
  countries TEXT[] NOT NULL DEFAULT '{}',               -- ISO-2 codes; ['*'] = catch-all/default
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_shipping_zones_merchant ON merchant_shipping_zones(merchant_address, sort_order);

CREATE TABLE IF NOT EXISTS merchant_shipping_rates (
  id SERIAL PRIMARY KEY,
  zone_id INTEGER NOT NULL REFERENCES merchant_shipping_zones(id) ON DELETE CASCADE,
  merchant_address TEXT NOT NULL,                       -- denormalized for ownership checks
  name TEXT NOT NULL,                                   -- "Standard", "Express"
  rate_type TEXT NOT NULL DEFAULT 'flat'
    CHECK (rate_type IN ('flat','weight','price')),
  base_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  per_kg NUMERIC(18,2),                                 -- weight rates: cost per kg (rounded up)
  pct NUMERIC(7,4),                                     -- price rates: percent of subtotal
  free_over NUMERIC(18,2),                              -- free at/above this subtotal
  min_weight_g INTEGER,                                 -- rate applies only within [min,max] grams
  max_weight_g INTEGER,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_shipping_rates_zone ON merchant_shipping_rates(zone_id);
CREATE INDEX IF NOT EXISTS idx_shipping_rates_merchant ON merchant_shipping_rates(merchant_address);

-- Record which rate an order actually used (server-authoritative selection), for reconciliation.
ALTER TABLE merchant_orders ADD COLUMN IF NOT EXISTS shipping_rate_id INTEGER;

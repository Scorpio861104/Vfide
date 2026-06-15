-- Commerce Operations Phase 4 — Physical Retail.
-- Per-location inventory, register sessions + cash-drawer movements, receipts, and POS order linkage.
-- Additive over the existing merchant_locations (20260404_184000) and merchant_orders. On-chain settlement is
-- unchanged; a POS sale is an in-person order. See docs/COMMERCE_PHASE_4_PHYSICAL_RETAIL_CERTIFICATION.md.

-- Per-location stock. Absence of a row = product not stocked at that location.
CREATE TABLE IF NOT EXISTS location_inventory (
  id SERIAL PRIMARY KEY,
  location_id UUID NOT NULL REFERENCES merchant_locations(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES merchant_products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (location_id, product_id)
);
CREATE INDEX IF NOT EXISTS idx_location_inventory_location ON location_inventory(location_id);
CREATE INDEX IF NOT EXISTS idx_location_inventory_product ON location_inventory(product_id);

-- A register session (a shift at one location). Opening float → movements → close count → over/short.
CREATE TABLE IF NOT EXISTS register_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_address TEXT NOT NULL,
  location_id UUID NOT NULL REFERENCES merchant_locations(id) ON DELETE CASCADE,
  opened_by TEXT,                                       -- staff/owner who opened
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed')),
  opening_float NUMERIC(18,2) NOT NULL DEFAULT 0,
  expected_cash NUMERIC(18,2),                          -- computed at close
  counted_cash NUMERIC(18,2),                           -- entered at close
  variance NUMERIC(18,2),                               -- counted - expected (over>0, short<0)
  opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_register_sessions_merchant ON register_sessions(merchant_address, status);
CREATE INDEX IF NOT EXISTS idx_register_sessions_location ON register_sessions(location_id, status);

-- Cash-drawer movements within a session. Card/wallet sales are recorded with kind that doesn't hit cash.
CREATE TABLE IF NOT EXISTS register_movements (
  id BIGSERIAL PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES register_sessions(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('sale_cash','sale_noncash','refund_cash','payout','pay_in')),
  amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  order_id INTEGER REFERENCES merchant_orders(id) ON DELETE SET NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_register_movements_session ON register_movements(session_id);

-- POS linkage on orders: which channel, location, register, and (if staff) who rang it.
ALTER TABLE merchant_orders ADD COLUMN IF NOT EXISTS channel TEXT NOT NULL DEFAULT 'online';
ALTER TABLE merchant_orders ADD COLUMN IF NOT EXISTS location_id UUID;
ALTER TABLE merchant_orders ADD COLUMN IF NOT EXISTS register_session_id UUID;
ALTER TABLE merchant_orders ADD COLUMN IF NOT EXISTS sold_by_staff_id TEXT;
CREATE INDEX IF NOT EXISTS idx_merchant_orders_location ON merchant_orders(location_id);

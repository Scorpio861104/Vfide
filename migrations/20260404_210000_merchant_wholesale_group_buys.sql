CREATE TABLE IF NOT EXISTS merchant_wholesale_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_merchant_address TEXT NOT NULL,
  seller_merchant_address TEXT NOT NULL,
  product_id INTEGER NOT NULL REFERENCES merchant_products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0),
  total DECIMAL(12,2) NOT NULL CHECK (total >= 0),
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'confirmed', 'cancelled', 'fulfilled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS merchant_wholesale_group_buys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id INTEGER NOT NULL REFERENCES merchant_products(id) ON DELETE CASCADE,
  initiator_merchant_address TEXT NOT NULL,
  target_quantity INTEGER NOT NULL CHECK (target_quantity > 0),
  current_quantity INTEGER NOT NULL DEFAULT 0 CHECK (current_quantity >= 0),
  current_unit_price DECIMAL(10,2) NOT NULL CHECK (current_unit_price >= 0),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'funded', 'closed', 'cancelled')),
  notes TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS merchant_wholesale_group_buy_participants (
  group_buy_id UUID NOT NULL REFERENCES merchant_wholesale_group_buys(id) ON DELETE CASCADE,
  merchant_address TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  pledged_total DECIMAL(12,2) NOT NULL CHECK (pledged_total >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (group_buy_id, merchant_address)
);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_merchant_wholesale_orders_buyer_created
  ON merchant_wholesale_orders (buyer_merchant_address, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_merchant_wholesale_orders_seller_created
  ON merchant_wholesale_orders (seller_merchant_address, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_merchant_group_buys_status_created
  ON merchant_wholesale_group_buys (status, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_merchant_group_buy_participants_merchant
  ON merchant_wholesale_group_buy_participants (merchant_address, created_at DESC);

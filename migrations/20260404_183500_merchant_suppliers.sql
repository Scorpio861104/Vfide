CREATE TABLE IF NOT EXISTS merchant_suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_address TEXT NOT NULL,
  supplier_address TEXT,
  supplier_name TEXT NOT NULL,
  contact_phone TEXT,
  contact_email TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (merchant_address, supplier_name)
);

CREATE TABLE IF NOT EXISTS purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_address TEXT NOT NULL,
  supplier_id UUID NOT NULL REFERENCES merchant_suppliers(id) ON DELETE CASCADE,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  total DECIMAL(10,2),
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('draft', 'sent', 'confirmed', 'delivered', 'cancelled')),
  expected_delivery TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_merchant_suppliers_merchant_name
  ON merchant_suppliers (merchant_address, supplier_name);

CREATE INDEX IF NOT EXISTS idx_purchase_orders_merchant_created
  ON purchase_orders (merchant_address, created_at DESC);

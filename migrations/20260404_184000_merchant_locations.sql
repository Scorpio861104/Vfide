CREATE TABLE IF NOT EXISTS merchant_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_address TEXT NOT NULL,
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  country TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_merchant_locations_merchant_name
  ON merchant_locations (merchant_address, name);

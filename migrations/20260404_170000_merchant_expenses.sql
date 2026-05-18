CREATE TABLE IF NOT EXISTS merchant_expenses (
  id BIGSERIAL PRIMARY KEY,
  merchant_address TEXT NOT NULL,
  amount NUMERIC(18,2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'USD',
  category TEXT NOT NULL,
  description TEXT,
  receipt_image_url TEXT,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_merchant_expenses_merchant_date
  ON merchant_expenses (merchant_address, expense_date DESC, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_merchant_expenses_merchant_category
  ON merchant_expenses (merchant_address, LOWER(category));

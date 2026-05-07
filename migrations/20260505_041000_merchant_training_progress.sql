CREATE TABLE IF NOT EXISTS merchant_training_progress (
  merchant_address VARCHAR(42) PRIMARY KEY,
  completed_modules JSONB NOT NULL DEFAULT '[]'::jsonb,
  quick_step INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_merchant_training_progress_updated
  ON merchant_training_progress (updated_at DESC);

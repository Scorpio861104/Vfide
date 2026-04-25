CREATE TABLE IF NOT EXISTS merchant_staff (
  id TEXT PRIMARY KEY,
  merchant_address TEXT NOT NULL,
  staff_name TEXT NOT NULL,
  wallet_address TEXT,
  role TEXT NOT NULL,
  session_token_hash TEXT NOT NULL,
  permissions JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  active BOOLEAN NOT NULL DEFAULT true
);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_merchant_staff_merchant_created
  ON merchant_staff (merchant_address, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_merchant_staff_token_hash
  ON merchant_staff (session_token_hash);

CREATE TABLE IF NOT EXISTS staff_activity_log (
  id BIGSERIAL PRIMARY KEY,
  staff_id TEXT NOT NULL REFERENCES merchant_staff(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_staff_activity_log_staff_created
  ON staff_activity_log (staff_id, created_at DESC);

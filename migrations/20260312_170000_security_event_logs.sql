CREATE TABLE IF NOT EXISTS security_event_logs (
  id BIGSERIAL PRIMARY KEY,
  address TEXT NOT NULL,
  ts TIMESTAMPTZ NOT NULL,
  type TEXT NOT NULL,
  severity TEXT NOT NULL,
  message TEXT NOT NULL,
  details JSONB,
  user_agent TEXT,
  location TEXT,
  device_id TEXT,
  ip_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_security_event_logs_address_ts
  ON security_event_logs(address, ts DESC);

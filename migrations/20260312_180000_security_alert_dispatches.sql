CREATE TABLE IF NOT EXISTS security_alert_dispatches (
  dedup_key TEXT PRIMARY KEY,
  last_sent_at TIMESTAMPTZ NOT NULL,
  suppressed_count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_security_alert_dispatches_last_sent_at
  ON security_alert_dispatches(last_sent_at DESC);

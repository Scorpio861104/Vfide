CREATE TABLE IF NOT EXISTS security_webhook_replay_events (
  id BIGSERIAL PRIMARY KEY,
  ts TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL,
  reason TEXT,
  source TEXT,
  replay_key_hash TEXT,
  event_timestamp BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_security_webhook_replay_events_ts
  ON security_webhook_replay_events(ts DESC);

CREATE INDEX IF NOT EXISTS idx_security_webhook_replay_events_status_ts
  ON security_webhook_replay_events(status, ts DESC);

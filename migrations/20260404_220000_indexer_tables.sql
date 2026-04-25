-- Indexer event storage
CREATE TABLE IF NOT EXISTS indexed_events (
  id BIGSERIAL PRIMARY KEY,
  event_type VARCHAR(50) NOT NULL,
  data JSONB NOT NULL,
  tx_hash VARCHAR(66) NOT NULL,
  block_number BIGINT NOT NULL,
  indexed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tx_hash, event_type)
);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_indexed_events_type ON indexed_events(event_type);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_indexed_events_block ON indexed_events(block_number);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_indexed_events_data_from ON indexed_events USING GIN ((data->'from'));
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_indexed_events_data_to ON indexed_events USING GIN ((data->'to'));

CREATE TABLE IF NOT EXISTS indexer_state (
  key VARCHAR(50) PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE push_subscriptions ADD COLUMN IF NOT EXISTS user_address VARCHAR(42);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_push_subs_user ON push_subscriptions(user_address);

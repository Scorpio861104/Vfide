-- Migration: flashloan lanes and event ledger
-- Created: 2026-03-10

CREATE TABLE IF NOT EXISTS flashloan_lanes (
  id BIGSERIAL PRIMARY KEY,
  borrower_address VARCHAR(42) NOT NULL,
  lender_address VARCHAR(42) NOT NULL,
  arbiter_address VARCHAR(42),
  principal DECIMAL(18, 6) NOT NULL,
  duration_days INTEGER NOT NULL,
  interest_bps INTEGER NOT NULL,
  collateral_pct INTEGER NOT NULL,
  drawn_amount DECIMAL(18, 6) NOT NULL,
  stage VARCHAR(32) NOT NULL DEFAULT 'draft',
  sim_day INTEGER NOT NULL DEFAULT 0,
  due_day INTEGER,
  evidence_note TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (principal > 0),
  CHECK (duration_days >= 1),
  CHECK (interest_bps >= 0),
  CHECK (collateral_pct >= 0),
  CHECK (drawn_amount > 0)
);

CREATE TABLE IF NOT EXISTS flashloan_lane_events (
  id BIGSERIAL PRIMARY KEY,
  lane_id BIGINT NOT NULL REFERENCES flashloan_lanes(id) ON DELETE CASCADE,
  actor_address VARCHAR(42) NOT NULL,
  actor_role VARCHAR(16) NOT NULL,
  action VARCHAR(32) NOT NULL,
  event_text TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_flashloan_lanes_borrower ON flashloan_lanes(borrower_address);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_flashloan_lanes_lender ON flashloan_lanes(lender_address);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_flashloan_lanes_arbiter ON flashloan_lanes(arbiter_address);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_flashloan_lanes_stage ON flashloan_lanes(stage);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_flashloan_lane_events_lane_created ON flashloan_lane_events(lane_id, created_at DESC);

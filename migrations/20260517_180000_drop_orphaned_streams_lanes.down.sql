-- Rollback: Recreate the dropped streams + flashloan_lanes tables
-- Created: 2026-05-17
--
-- Used if R31's table-drop migration needs to be reversed (e.g., to
-- temporarily reinstate the off-chain routes for debugging). Reproduces
-- the original schema from the 20260131_090000 and 20260310_120000
-- migrations.

BEGIN;

CREATE TABLE IF NOT EXISTS streams (
  id SERIAL PRIMARY KEY,
  sender_address VARCHAR(42) NOT NULL,
  recipient_address VARCHAR(42) NOT NULL,
  token VARCHAR(20) NOT NULL,
  total_amount DECIMAL(18, 6) NOT NULL,
  rate_per_second DECIMAL(30, 18) NOT NULL,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  withdrawn DECIMAL(18, 6) DEFAULT 0,
  is_paused BOOLEAN DEFAULT FALSE,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_streams_sender ON streams(sender_address);
CREATE INDEX IF NOT EXISTS idx_streams_recipient ON streams(recipient_address);

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

CREATE INDEX IF NOT EXISTS idx_flashloan_lanes_borrower ON flashloan_lanes(borrower_address);
CREATE INDEX IF NOT EXISTS idx_flashloan_lanes_lender ON flashloan_lanes(lender_address);
CREATE INDEX IF NOT EXISTS idx_flashloan_lanes_arbiter ON flashloan_lanes(arbiter_address);
CREATE INDEX IF NOT EXISTS idx_flashloan_lanes_stage ON flashloan_lanes(stage);
CREATE INDEX IF NOT EXISTS idx_flashloan_lane_events_lane_created ON flashloan_lane_events(lane_id, created_at DESC);

COMMIT;

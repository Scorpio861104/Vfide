-- Migration: sync_state table for offline sync tracking
-- Created: 2026-03-29T12:00:00.000Z

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- sync_state: tracks per-user, per-entity last sync timestamps
-- Used by app/api/sync/route.ts for offline-first sync support
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sync_state (
  id                  SERIAL       PRIMARY KEY,
  user_id             INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entity              VARCHAR(64)  NOT NULL,
  last_sync_timestamp TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_sync_state_user_entity UNIQUE (user_id, entity)
);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sync_state_user_id ON sync_state(user_id);

COMMIT;

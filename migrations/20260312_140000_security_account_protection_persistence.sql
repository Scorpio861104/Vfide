-- Migration: security_account_protection_persistence
-- Created: 2026-03-12
-- Purpose: Persist account security events and temporary locks across restarts/instances.

CREATE TABLE IF NOT EXISTS security_account_events (
  id BIGSERIAL PRIMARY KEY,
  address TEXT NOT NULL,
  ts TIMESTAMPTZ NOT NULL,
  ip TEXT NOT NULL,
  type TEXT NOT NULL,
  amount NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS security_account_locks (
  address TEXT PRIMARY KEY,
  until_ts TIMESTAMPTZ NOT NULL,
  reason TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_security_account_events_address_ts
  ON security_account_events(address, ts DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_security_account_locks_until_ts
  ON security_account_locks(until_ts DESC);

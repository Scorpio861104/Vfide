-- Migration: 20260610_120000_ecosystem_events.sql
--
-- Purpose:
--   Durable storage for the Unified Ecosystem Architecture (Wave 47). The client-side event bus
--   gives live in-session coordination; this table makes coordination survive refresh and reach
--   other devices. API routes persist a row here after a successful write, and the client hydrates
--   the activity timeline from GET /api/events.
--
-- Conventions:
--   - Owner-address column is `user_address` (one of the common owner columns the baseline RLS
--     migration recognizes), lower-cased, so the standard owner-only RLS read policy applies.
--   - UUID PK + gen_random_uuid(), TIMESTAMPTZ timestamps, matching existing merchant_* tables.
--   - `event_type` is a free TEXT (the catalog lives in TypeScript: lib/events/eventTypes.ts) with a
--     length guard rather than a DB enum, so adding event types never requires a migration.
--   - Default privileges from 20260510_120000_grant_vfide_app_and_baseline_rls.sql grant this table
--     to vfide_app automatically; the explicit GRANT below is belt-and-suspenders / idempotent.

CREATE TABLE IF NOT EXISTS ecosystem_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_address TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (char_length(event_type) BETWEEN 1 AND 64),
  -- The layers/node/timeline copy are derived from the catalog at read time; payload holds any
  -- structured detail the emitter chose to attach (amounts, ids, slugs, etc.).
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Primary access path: a user's own recent activity, newest first.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ecosystem_events_user_created
  ON ecosystem_events (user_address, created_at DESC);

-- Secondary: filter a user's activity by event type (e.g. all PAYMENT_RECEIVED).
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ecosystem_events_user_type_created
  ON ecosystem_events (user_address, event_type, created_at DESC);

-- Explicit grant (idempotent; default privileges already cover future tables).
DO $$
BEGIN
  PERFORM 1 FROM pg_roles WHERE rolname = 'vfide_app';
  IF FOUND THEN
    EXECUTE 'GRANT SELECT, INSERT ON ecosystem_events TO vfide_app';
  ELSE
    RAISE NOTICE 'Role vfide_app does not exist; skipping grant (dev environment).';
  END IF;
END $$;

-- Owner-only RLS: a user can read and insert only their own events. Matches the baseline owner-only
-- pattern; user_address is set from the request auth context (app.current_user_address) by lib/db.ts.
ALTER TABLE ecosystem_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'ecosystem_events' AND policyname = 'ecosystem_events_owner_select'
  ) THEN
    EXECUTE $p$
      CREATE POLICY ecosystem_events_owner_select ON ecosystem_events
      FOR SELECT
      USING (user_address = current_setting('app.current_user_address', true))
    $p$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'ecosystem_events' AND policyname = 'ecosystem_events_owner_insert'
  ) THEN
    EXECUTE $p$
      CREATE POLICY ecosystem_events_owner_insert ON ecosystem_events
      FOR INSERT
      WITH CHECK (user_address = current_setting('app.current_user_address', true))
    $p$;
  END IF;
END $$;

-- Migration: 20260610_180000_extraction_index_state.sql
--
-- Purpose:
--   Persist each address's Extraction Index between evaluations (Whale Protection — real-data wiring).
--   The index ACCUMULATES from behavior and DECAYS over 90 days; both need a stored value + anchor.
--   This is a read-model for a public, behavior-derived metric — it controls nothing. Owner-only RLS
--   so a participant can read their own standing; the server (service role) computes and upserts it.
--
-- Conventions: address PK, TIMESTAMPTZ anchor, owner-only RLS via app.current_user_address.

CREATE TABLE IF NOT EXISTS extraction_index_state (
  address TEXT PRIMARY KEY,
  index INTEGER NOT NULL DEFAULT 0 CHECK (index >= 0 AND index <= 10000),
  -- Decay anchor: when the index was last recomputed.
  last_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  PERFORM 1 FROM pg_roles WHERE rolname = 'vfide_app';
  IF FOUND THEN
    EXECUTE 'GRANT SELECT, INSERT, UPDATE ON extraction_index_state TO vfide_app';
  ELSE
    RAISE NOTICE 'Role vfide_app does not exist; skipping grant (dev).';
  END IF;
END $$;

ALTER TABLE extraction_index_state ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'extraction_index_state' AND policyname = 'extraction_index_owner_select') THEN
    EXECUTE $p$
      CREATE POLICY extraction_index_owner_select ON extraction_index_state
      FOR SELECT USING (address = current_setting('app.current_user_address', true))
    $p$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'extraction_index_state' AND policyname = 'extraction_index_owner_upsert') THEN
    EXECUTE $p$
      CREATE POLICY extraction_index_owner_upsert ON extraction_index_state
      FOR ALL USING (address = current_setting('app.current_user_address', true))
      WITH CHECK (address = current_setting('app.current_user_address', true))
    $p$;
  END IF;
END $$;

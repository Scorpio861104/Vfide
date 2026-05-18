-- Reverse of 20260404_220000_indexer_tables.sql
-- OP-6 FIX: provide rollback for indexer table creation.
--
-- Drops:
--   - indexed_events table
--   - indexer_state table
--   - user_address column added to push_subscriptions (only if it was
--     added by THIS migration — guarded with IF EXISTS so re-runs are safe)
--
-- IMPORTANT: This is destructive — all indexed event history will be
-- lost. Re-running the up migration will recreate the tables but
-- back-population of historical events requires re-running the
-- indexer from genesis (or from a backup).

BEGIN;

DROP INDEX IF EXISTS idx_indexed_events_data_to;
DROP INDEX IF EXISTS idx_indexed_events_data_from;
DROP INDEX IF EXISTS idx_indexed_events_block;
DROP INDEX IF EXISTS idx_indexed_events_type;

DROP TABLE IF EXISTS indexer_state;
DROP TABLE IF EXISTS indexed_events;

DROP INDEX IF EXISTS idx_push_subs_user;
ALTER TABLE push_subscriptions DROP COLUMN IF EXISTS user_address;

COMMIT;

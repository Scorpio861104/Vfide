-- Down migration: sync_state table
BEGIN;
DROP TABLE IF EXISTS sync_state;
COMMIT;

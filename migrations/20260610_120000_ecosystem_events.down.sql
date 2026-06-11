-- Down migration for 20260610_120000_ecosystem_events.sql
DROP POLICY IF EXISTS ecosystem_events_owner_insert ON ecosystem_events;
DROP POLICY IF EXISTS ecosystem_events_owner_select ON ecosystem_events;
DROP INDEX IF EXISTS idx_ecosystem_events_user_type_created;
DROP INDEX IF EXISTS idx_ecosystem_events_user_created;
DROP TABLE IF EXISTS ecosystem_events;

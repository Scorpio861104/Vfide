-- Rollback: Seer analytics daily rollup tables and refresh function
-- Created: 2026-03-13T21:00:00.000Z

BEGIN;

DROP FUNCTION IF EXISTS refresh_seer_analytics_rollup(DATE, DATE);
DROP TABLE IF EXISTS seer_reason_code_daily_rollup;
DROP TABLE IF EXISTS seer_analytics_daily_rollup;

COMMIT;

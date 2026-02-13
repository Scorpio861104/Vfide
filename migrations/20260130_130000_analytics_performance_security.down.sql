-- Rollback: Remove analytics, performance, security tables
-- Created: 2026-01-30T13:00:00.000Z

BEGIN;

DROP TABLE IF EXISTS security_violations;
DROP TABLE IF EXISTS performance_metrics;
DROP TABLE IF EXISTS analytics_events;

COMMIT;

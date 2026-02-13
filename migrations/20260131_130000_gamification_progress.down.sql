-- Rollback: Remove gamification progress tables
-- Created: 2026-01-31T13:00:00.000Z

BEGIN;

DROP TABLE IF EXISTS onboarding_progress;
DROP TABLE IF EXISTS user_daily_rewards;

COMMIT;

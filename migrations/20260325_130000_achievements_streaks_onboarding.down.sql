-- Down migration: achievements, streaks, onboarding, daily rewards
BEGIN;
DROP FUNCTION IF EXISTS check_streak_milestones(INTEGER, VARCHAR, INTEGER);
DROP FUNCTION IF EXISTS update_user_streak(INTEGER, VARCHAR);
DROP TABLE IF EXISTS daily_rewards;
DROP TABLE IF EXISTS user_onboarding;
DROP TABLE IF EXISTS user_streaks;
DROP TABLE IF EXISTS achievement_notifications;
DROP TABLE IF EXISTS user_achievement_progress;
DROP TABLE IF EXISTS achievement_milestones;
COMMIT;

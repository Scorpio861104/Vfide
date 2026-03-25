-- Down migration: gamification quests
BEGIN;
DROP TABLE IF EXISTS user_weekly_progress;
DROP TABLE IF EXISTS weekly_challenges;
DROP TABLE IF EXISTS user_quest_progress;
DROP TABLE IF EXISTS daily_quests;
COMMIT;

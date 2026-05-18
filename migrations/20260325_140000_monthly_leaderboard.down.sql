-- Down migration: monthly leaderboard
BEGIN;
DROP FUNCTION IF EXISTS calculate_activity_score(INTEGER, VARCHAR);
DROP TABLE IF EXISTS monthly_leaderboard;
DROP TABLE IF EXISTS monthly_prize_pool;
DROP TABLE IF EXISTS prize_tiers;
COMMIT;

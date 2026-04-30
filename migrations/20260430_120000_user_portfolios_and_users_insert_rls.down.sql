-- Rollback for 20260430_120000_user_portfolios_and_users_insert_rls.sql

DROP POLICY IF EXISTS user_portfolios_update_own ON user_portfolios;
DROP POLICY IF EXISTS user_portfolios_insert_own ON user_portfolios;
DROP POLICY IF EXISTS user_portfolios_read_own ON user_portfolios;

DROP TABLE IF EXISTS user_portfolios;

DROP POLICY IF EXISTS users_insert_own ON users;

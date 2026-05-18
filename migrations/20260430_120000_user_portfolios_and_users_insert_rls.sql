-- Add missing user_portfolios table and tighten users INSERT policy.
-- Remediates DB-01 and DB-03 from VFIDE audit findings.

-- ============================================================
-- USERS TABLE — require authenticated self-insert
-- ============================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS users_insert_own ON users;
CREATE POLICY users_insert_own ON users
  FOR INSERT
  WITH CHECK (
    wallet_address = current_setting('app.current_user_address', true)::text
    AND current_setting('app.current_user_address', true) IS NOT NULL
    AND current_setting('app.current_user_address', true) <> ''
  );

-- ============================================================
-- USER_PORTFOLIOS TABLE — required by /api/analytics/portfolio/[address]
-- ============================================================

CREATE TABLE IF NOT EXISTS user_portfolios (
  id BIGSERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  wallet_address TEXT NOT NULL,
  total_balance NUMERIC(36, 18) NOT NULL DEFAULT 0,
  vfide_balance NUMERIC(36, 18) NOT NULL DEFAULT 0,
  vault_balance NUMERIC(36, 18) NOT NULL DEFAULT 0,
  reward_balance NUMERIC(36, 18) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (user_id),
  UNIQUE (LOWER(wallet_address))
);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_portfolios_wallet ON user_portfolios (LOWER(wallet_address));

ALTER TABLE user_portfolios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_portfolios_read_own ON user_portfolios;
CREATE POLICY user_portfolios_read_own ON user_portfolios
  FOR SELECT
  USING (
    LOWER(wallet_address) = LOWER(current_setting('app.current_user_address', true)::text)
  );

DROP POLICY IF EXISTS user_portfolios_insert_own ON user_portfolios;
CREATE POLICY user_portfolios_insert_own ON user_portfolios
  FOR INSERT
  WITH CHECK (
    LOWER(wallet_address) = LOWER(current_setting('app.current_user_address', true)::text)
  );

DROP POLICY IF EXISTS user_portfolios_update_own ON user_portfolios;
CREATE POLICY user_portfolios_update_own ON user_portfolios
  FOR UPDATE
  USING (
    LOWER(wallet_address) = LOWER(current_setting('app.current_user_address', true)::text)
  )
  WITH CHECK (
    LOWER(wallet_address) = LOWER(current_setting('app.current_user_address', true)::text)
  );

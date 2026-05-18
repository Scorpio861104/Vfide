-- Migration: monthly leaderboard, prize pool, and prize tiers
-- Created: 2026-03-25T14:00:00.000Z

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- prize_tiers: configurable prize bracket definitions (admin-populated)
-- Note: prize_amount is informational only — actual token distributions are
-- not offered (Howey-test compliance).  prize_percentage is used for UI display.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS prize_tiers (
  id               SERIAL        PRIMARY KEY,
  tier_name        VARCHAR(50)   NOT NULL,
  rank_start       INTEGER       NOT NULL,
  rank_end         INTEGER       NOT NULL,
  prize_percentage NUMERIC(5,2)  NOT NULL DEFAULT 0,
  CONSTRAINT uq_prize_tiers_range UNIQUE (rank_start, rank_end)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- monthly_prize_pool: aggregate prize pool state per calendar month
-- pool amounts are XP-denominated for display; token distributions are not made.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS monthly_prize_pool (
  id                    SERIAL        PRIMARY KEY,
  month_year            VARCHAR(7)    NOT NULL,  -- e.g. '2026-03'
  total_pool            NUMERIC(36,0) NOT NULL DEFAULT 0,
  distributed_amount    NUMERIC(36,0) NOT NULL DEFAULT 0,
  distribution_complete BOOLEAN       NOT NULL DEFAULT false,
  distribution_date     TIMESTAMPTZ,
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_monthly_prize_pool_month UNIQUE (month_year)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- monthly_leaderboard: per-user, per-month activity score tracking
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS monthly_leaderboard (
  id                  SERIAL        PRIMARY KEY,
  user_id             INTEGER       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  month_year          VARCHAR(7)    NOT NULL,  -- e.g. '2026-03'
  total_xp_earned     INTEGER       NOT NULL DEFAULT 0,
  quests_completed    INTEGER       NOT NULL DEFAULT 0,
  challenges_completed INTEGER      NOT NULL DEFAULT 0,
  current_streak      INTEGER       NOT NULL DEFAULT 0,
  transactions_count  INTEGER       NOT NULL DEFAULT 0,
  social_interactions INTEGER       NOT NULL DEFAULT 0,
  governance_votes    INTEGER       NOT NULL DEFAULT 0,
  activity_score      NUMERIC(12,4) NOT NULL DEFAULT 0,
  final_rank          INTEGER,
  -- prize_amount is stored for informational purposes only.
  prize_amount        NUMERIC(36,0) NOT NULL DEFAULT 0,
  prize_claimed       BOOLEAN       NOT NULL DEFAULT false,
  updated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_monthly_leaderboard UNIQUE (user_id, month_year)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- calculate_activity_score: weighted composite score function
-- Weights: XP (40%), quests (20%), streak (15%), txns (10%),
--          social (10%), governance (5%)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION calculate_activity_score(
  p_user_id    INTEGER,
  p_month_year VARCHAR
) RETURNS NUMERIC LANGUAGE plpgsql AS $$
DECLARE
  v_row  monthly_leaderboard%ROWTYPE;
  v_score NUMERIC;
BEGIN
  SELECT * INTO v_row
  FROM monthly_leaderboard
  WHERE user_id = p_user_id AND month_year = p_month_year;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  v_score :=
    (v_row.total_xp_earned      * 0.40) +
    (v_row.quests_completed     * 20  * 0.20) +
    (v_row.current_streak       * 5   * 0.15) +
    (v_row.transactions_count   * 10  * 0.10) +
    (v_row.social_interactions  * 5   * 0.10) +
    (v_row.governance_votes     * 50  * 0.05);

  RETURN ROUND(v_score, 4);
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Indexes
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_monthly_leaderboard_month_score
  ON monthly_leaderboard (month_year, activity_score DESC, updated_at ASC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_monthly_leaderboard_user_month
  ON monthly_leaderboard (user_id, month_year);

COMMIT;

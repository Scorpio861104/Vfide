-- Migration: gamification quests — daily quests, weekly challenges, and per-user progress
-- Created: 2026-03-25T12:00:00.000Z

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- daily_quests: catalogue of daily quest definitions (admin-populated)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS daily_quests (
  id           SERIAL PRIMARY KEY,
  quest_key    VARCHAR(100) NOT NULL,
  title        VARCHAR(200) NOT NULL,
  description  TEXT         NOT NULL DEFAULT '',
  category     VARCHAR(50)  NOT NULL DEFAULT 'general',
  difficulty   VARCHAR(20)  NOT NULL DEFAULT 'easy',
  target_value INTEGER      NOT NULL DEFAULT 1,
  reward_xp    INTEGER      NOT NULL DEFAULT 0,
  -- reward_vfide is always 0: XP-only rewards keep this table compliant with
  -- the Howey-test assessment (no expectation of profit from token rewards).
  reward_vfide NUMERIC(36,0) NOT NULL DEFAULT 0,
  icon         VARCHAR(100),
  is_active    BOOLEAN      NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_daily_quests_key UNIQUE (quest_key)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- user_quest_progress: per-user, per-day progress on a daily quest
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_quest_progress (
  id          SERIAL       PRIMARY KEY,
  user_id     INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  quest_id    INTEGER      NOT NULL REFERENCES daily_quests(id) ON DELETE CASCADE,
  quest_date  DATE         NOT NULL DEFAULT CURRENT_DATE,
  progress    INTEGER      NOT NULL DEFAULT 0,
  completed   BOOLEAN      NOT NULL DEFAULT false,
  claimed     BOOLEAN      NOT NULL DEFAULT false,
  claimed_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_user_quest_progress UNIQUE (user_id, quest_id, quest_date)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- weekly_challenges: catalogue of weekly challenge definitions
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS weekly_challenges (
  id             SERIAL       PRIMARY KEY,
  challenge_key  VARCHAR(100) NOT NULL,
  title          VARCHAR(200) NOT NULL,
  description    TEXT         NOT NULL DEFAULT '',
  category       VARCHAR(50)  NOT NULL DEFAULT 'general',
  target_value   INTEGER      NOT NULL DEFAULT 1,
  reward_xp      INTEGER      NOT NULL DEFAULT 0,
  reward_vfide   NUMERIC(36,0) NOT NULL DEFAULT 0,
  icon           VARCHAR(100),
  week_start     DATE         NOT NULL,
  week_end       DATE         NOT NULL,
  is_active      BOOLEAN      NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_weekly_challenges_key_week UNIQUE (challenge_key, week_start)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- user_weekly_progress: per-user, per-week progress on a weekly challenge
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_weekly_progress (
  id            SERIAL       PRIMARY KEY,
  user_id       INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  challenge_id  INTEGER      NOT NULL REFERENCES weekly_challenges(id) ON DELETE CASCADE,
  week_start    DATE         NOT NULL,
  progress      INTEGER      NOT NULL DEFAULT 0,
  completed     BOOLEAN      NOT NULL DEFAULT false,
  claimed       BOOLEAN      NOT NULL DEFAULT false,
  claimed_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_user_weekly_progress UNIQUE (user_id, challenge_id, week_start)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Indexes
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_daily_quests_active
  ON daily_quests (is_active, difficulty, quest_key);

CREATE INDEX IF NOT EXISTS idx_user_quest_progress_user_date
  ON user_quest_progress (user_id, quest_date);

CREATE INDEX IF NOT EXISTS idx_weekly_challenges_active_week
  ON weekly_challenges (is_active, week_start, week_end);

CREATE INDEX IF NOT EXISTS idx_user_weekly_progress_user_week
  ON user_weekly_progress (user_id, week_start);

COMMIT;

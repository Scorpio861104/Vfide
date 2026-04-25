-- Migration: achievements, streaks, onboarding, and daily rewards
-- Created: 2026-03-25T13:00:00.000Z

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- achievement_milestones: catalogue of achievement definitions
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS achievement_milestones (
  id                SERIAL       PRIMARY KEY,
  milestone_key     VARCHAR(100) NOT NULL,
  title             VARCHAR(200) NOT NULL,
  description       TEXT         NOT NULL DEFAULT '',
  category          VARCHAR(50)  NOT NULL DEFAULT 'general',
  requirement_type  VARCHAR(50)  NOT NULL DEFAULT 'count',
  requirement_value INTEGER      NOT NULL DEFAULT 1,
  reward_xp         INTEGER      NOT NULL DEFAULT 0,
  -- reward_vfide is always 0: Howey-test compliance (no expectation of profit).
  reward_vfide      NUMERIC(36,0) NOT NULL DEFAULT 0,
  reward_badge      VARCHAR(100),
  icon              VARCHAR(100),
  rarity            VARCHAR(20)  NOT NULL DEFAULT 'common'
                                 CHECK (rarity IN ('common','rare','epic','legendary')),
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_achievement_milestones_key UNIQUE (milestone_key)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- user_achievement_progress: per-user progress toward each milestone
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_achievement_progress (
  id           SERIAL       PRIMARY KEY,
  user_id      INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  milestone_id INTEGER      NOT NULL REFERENCES achievement_milestones(id) ON DELETE CASCADE,
  progress     INTEGER      NOT NULL DEFAULT 0,
  target       INTEGER      NOT NULL DEFAULT 1,
  unlocked     BOOLEAN      NOT NULL DEFAULT false,
  unlocked_at  TIMESTAMPTZ,
  claimed      BOOLEAN      NOT NULL DEFAULT false,
  claimed_at   TIMESTAMPTZ,
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_user_achievement_progress UNIQUE (user_id, milestone_id)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- achievement_notifications: inbox for quest/achievement unlock messages
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS achievement_notifications (
  id                SERIAL       PRIMARY KEY,
  user_id           INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notification_type VARCHAR(50)  NOT NULL,
  title             VARCHAR(200) NOT NULL DEFAULT '',
  message           TEXT         NOT NULL DEFAULT '',
  icon              VARCHAR(50)  NOT NULL DEFAULT '🏆',
  reward_xp         INTEGER      NOT NULL DEFAULT 0,
  reward_vfide      NUMERIC(36,0) NOT NULL DEFAULT 0,
  shown             BOOLEAN      NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- user_streaks: login/activity streak tracking
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_streaks (
  id                  SERIAL       PRIMARY KEY,
  user_id             INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  streak_type         VARCHAR(50)  NOT NULL DEFAULT 'login',
  current_streak      INTEGER      NOT NULL DEFAULT 0,
  longest_streak      INTEGER      NOT NULL DEFAULT 0,
  last_activity_date  DATE,
  streak_start_date   DATE,
  total_days          INTEGER      NOT NULL DEFAULT 0,
  updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_user_streaks UNIQUE (user_id, streak_type)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- user_onboarding: one row per user tracking all 10 onboarding steps
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_onboarding (
  id                        SERIAL       PRIMARY KEY,
  user_id                   INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  step_connect_wallet       BOOLEAN      NOT NULL DEFAULT false,
  step_complete_profile     BOOLEAN      NOT NULL DEFAULT false,
  step_first_transaction    BOOLEAN      NOT NULL DEFAULT false,
  step_add_friend           BOOLEAN      NOT NULL DEFAULT false,
  step_join_group           BOOLEAN      NOT NULL DEFAULT false,
  step_vote_proposal        BOOLEAN      NOT NULL DEFAULT false,
  step_earn_badge           BOOLEAN      NOT NULL DEFAULT false,
  step_deposit_vault        BOOLEAN      NOT NULL DEFAULT false,
  step_give_endorsement     BOOLEAN      NOT NULL DEFAULT false,
  step_complete_quest       BOOLEAN      NOT NULL DEFAULT false,
  onboarding_completed      BOOLEAN      NOT NULL DEFAULT false,
  onboarding_completed_at   TIMESTAMPTZ,
  reward_claimed            BOOLEAN      NOT NULL DEFAULT false,
  updated_at                TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_user_onboarding_user UNIQUE (user_id)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- daily_rewards: log of XP rewards earned per day
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS daily_rewards (
  id            SERIAL       PRIMARY KEY,
  user_id       INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reward_date   DATE         NOT NULL DEFAULT CURRENT_DATE,
  reward_type   VARCHAR(50)  NOT NULL DEFAULT 'quest_completion',
  xp_earned     INTEGER      NOT NULL DEFAULT 0,
  -- vfide_earned is always 0: stored for schema completeness only.
  vfide_earned  NUMERIC(36,0) NOT NULL DEFAULT 0,
  description   TEXT         NOT NULL DEFAULT '',
  claimed       BOOLEAN      NOT NULL DEFAULT true,
  claimed_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Stored functions used by application routes
-- ─────────────────────────────────────────────────────────────────────────────

-- update_user_streak: called after a confirmed login/action to advance the streak
CREATE OR REPLACE FUNCTION update_user_streak(p_user_id INTEGER, p_streak_type VARCHAR)
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
  v_row user_streaks%ROWTYPE;
  v_today DATE := CURRENT_DATE;
BEGIN
  SELECT * INTO v_row FROM user_streaks WHERE user_id = p_user_id AND streak_type = p_streak_type;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF v_row.last_activity_date = v_today THEN
    -- Already updated today; nothing to do.
    RETURN;
  ELSIF v_row.last_activity_date = v_today - INTERVAL '1 day' THEN
    -- Consecutive day → extend streak
    UPDATE user_streaks
    SET current_streak     = current_streak + 1,
        longest_streak     = GREATEST(longest_streak, current_streak + 1),
        last_activity_date = v_today,
        total_days         = total_days + 1,
        updated_at         = NOW()
    WHERE user_id = p_user_id AND streak_type = p_streak_type;
  ELSE
    -- Gap → restart streak
    UPDATE user_streaks
    SET current_streak     = 1,
        streak_start_date  = v_today,
        last_activity_date = v_today,
        total_days         = total_days + 1,
        updated_at         = NOW()
    WHERE user_id = p_user_id AND streak_type = p_streak_type;
  END IF;
END;
$$;

-- check_streak_milestones: fires achievement notifications at streak thresholds
CREATE OR REPLACE FUNCTION check_streak_milestones(
  p_user_id      INTEGER,
  p_streak_type  VARCHAR,
  p_streak_count INTEGER
) RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
  v_threshold  INTEGER;
  v_icon       VARCHAR(20);
  v_title      VARCHAR(200);
  v_message    TEXT;
  v_reward_xp  INTEGER;
BEGIN
  -- Notify only at specific milestone thresholds
  IF p_streak_count NOT IN (3, 7, 14, 30, 60, 100, 365) THEN
    RETURN;
  END IF;

  v_icon      := '🔥';
  v_reward_xp := p_streak_count * 10;
  v_title     := p_streak_count || '-Day Streak!';
  v_message   := 'You''ve maintained a ' || p_streak_count || '-day ' || p_streak_type || ' streak!';

  INSERT INTO achievement_notifications
    (user_id, notification_type, title, message, icon, reward_xp, reward_vfide)
  VALUES
    (p_user_id, 'streak_milestone', v_title, v_message, v_icon, v_reward_xp, 0)
  ON CONFLICT DO NOTHING;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Indexes
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_achievement_milestones_rarity
  ON achievement_milestones (rarity, requirement_value);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_achievement_progress_user
  ON user_achievement_progress (user_id, unlocked, claimed);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_achievement_notifications_user_unshown
  ON achievement_notifications (user_id, shown, created_at)
  WHERE shown = false;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_streaks_user
  ON user_streaks (user_id, streak_type);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_daily_rewards_user_date
  ON daily_rewards (user_id, reward_date);

COMMIT;

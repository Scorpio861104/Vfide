-- ================================================
-- GAMIFICATION ENHANCEMENTS
-- Daily Quests, Streaks, Rewards System
-- ================================================

-- Daily/Weekly/Monthly Quests
CREATE TABLE IF NOT EXISTS quests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(20) NOT NULL CHECK (type IN ('daily', 'weekly', 'monthly')),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    target_value INTEGER NOT NULL,
    reward_xp INTEGER NOT NULL DEFAULT 0,
    reward_vfide NUMERIC(20, 6) DEFAULT 0,
    reward_badge VARCHAR(100),
    difficulty VARCHAR(20) NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard', 'legendary')),
    icon VARCHAR(10),
    active BOOLEAN DEFAULT true,
    starts_at TIMESTAMP NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- User Quest Progress
CREATE TABLE IF NOT EXISTS user_quests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    quest_id UUID NOT NULL REFERENCES quests(id) ON DELETE CASCADE,
    progress INTEGER NOT NULL DEFAULT 0,
    completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMP,
    claimed BOOLEAN DEFAULT false,
    claimed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, quest_id)
);

-- Daily Rewards Tracking
CREATE TABLE IF NOT EXISTS daily_rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    claim_date DATE NOT NULL,
    day_number INTEGER NOT NULL, -- Day in current streak
    vfide_amount NUMERIC(20, 6) NOT NULL,
    xp_amount INTEGER NOT NULL,
    bonus BOOLEAN DEFAULT false,
    claimed_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, claim_date)
);

-- Streak Tracking (enhanced from existing user_gamification)
ALTER TABLE user_gamification ADD COLUMN IF NOT EXISTS streak_multiplier NUMERIC(3, 2) DEFAULT 1.00;
ALTER TABLE user_gamification ADD COLUMN IF NOT EXISTS streak_milestone INTEGER DEFAULT 0;
ALTER TABLE user_gamification ADD COLUMN IF NOT EXISTS total_login_days INTEGER DEFAULT 0;

-- Onboarding Checklist Progress
CREATE TABLE IF NOT EXISTS onboarding_checklist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    step_id VARCHAR(50) NOT NULL,
    completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMP,
    reward_claimed BOOLEAN DEFAULT false,
    claimed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, step_id)
);

-- Achievement Notifications (toast history)
CREATE TABLE IF NOT EXISTS achievement_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('badge', 'level_up', 'achievement', 'quest', 'streak', 'reward')),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    reward_xp INTEGER,
    reward_vfide NUMERIC(20, 6),
    reward_badge VARCHAR(100),
    icon VARCHAR(10),
    viewed BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ================================================
-- INDEXES
-- ================================================

CREATE INDEX IF NOT EXISTS idx_quests_type_active ON quests(type, active);
CREATE INDEX IF NOT EXISTS idx_quests_expires ON quests(expires_at) WHERE active = true;

CREATE INDEX IF NOT EXISTS idx_user_quests_user ON user_quests(user_id);
CREATE INDEX IF NOT EXISTS idx_user_quests_completed ON user_quests(user_id, completed, claimed);
CREATE INDEX IF NOT EXISTS idx_user_quests_progress ON user_quests(user_id, quest_id);

CREATE INDEX IF NOT EXISTS idx_daily_rewards_user ON daily_rewards(user_id, claim_date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_rewards_date ON daily_rewards(claim_date);

CREATE INDEX IF NOT EXISTS idx_onboarding_user ON onboarding_checklist(user_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_completed ON onboarding_checklist(user_id, completed);

CREATE INDEX IF NOT EXISTS idx_achievement_notif_user ON achievement_notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_achievement_notif_viewed ON achievement_notifications(user_id, viewed);

-- ================================================
-- FUNCTIONS
-- ================================================

-- Function to update streak when user logs in
CREATE OR REPLACE FUNCTION update_user_streak(p_user_id INTEGER)
RETURNS TABLE(
    current_streak INTEGER,
    longest_streak INTEGER,
    multiplier NUMERIC,
    milestone_reached INTEGER
) AS $$
DECLARE
    v_last_active DATE;
    v_current_streak INTEGER;
    v_longest_streak INTEGER;
    v_new_multiplier NUMERIC;
    v_milestone INTEGER := 0;
BEGIN
    -- Get current streak data
    SELECT 
        last_active_date,
        current_streak,
        longest_streak
    INTO v_last_active, v_current_streak, v_longest_streak
    FROM user_gamification
    WHERE user_id = p_user_id;

    -- Check if this is a consecutive day
    IF v_last_active = CURRENT_DATE - INTERVAL '1 day' THEN
        -- Continue streak
        v_current_streak := v_current_streak + 1;
    ELSIF v_last_active = CURRENT_DATE THEN
        -- Already logged in today, no change
        RETURN QUERY SELECT v_current_streak, v_longest_streak, streak_multiplier, 0
        FROM user_gamification WHERE user_id = p_user_id;
        RETURN;
    ELSE
        -- Streak broken, reset to 1
        v_current_streak := 1;
    END IF;

    -- Update longest streak if needed
    IF v_current_streak > v_longest_streak THEN
        v_longest_streak := v_current_streak;
    END IF;

    -- Calculate multiplier based on streak
    v_new_multiplier := CASE
        WHEN v_current_streak >= 365 THEN 3.00
        WHEN v_current_streak >= 90 THEN 2.00
        WHEN v_current_streak >= 30 THEN 1.50
        WHEN v_current_streak >= 7 THEN 1.15
        ELSE 1.00
    END;

    -- Check for milestone achievements
    IF v_current_streak IN (7, 30, 90, 365) THEN
        v_milestone := v_current_streak;
    END IF;

    -- Update user_gamification
    UPDATE user_gamification
    SET 
        current_streak = v_current_streak,
        longest_streak = v_longest_streak,
        streak_multiplier = v_new_multiplier,
        streak_milestone = v_milestone,
        last_active_date = CURRENT_DATE,
        total_login_days = total_login_days + 1
    WHERE user_id = p_user_id;

    RETURN QUERY SELECT v_current_streak, v_longest_streak, v_new_multiplier, v_milestone;
END;
$$ LANGUAGE plpgsql;

-- Function to claim daily reward
CREATE OR REPLACE FUNCTION claim_daily_reward(p_user_id INTEGER)
RETURNS TABLE(
    success BOOLEAN,
    vfide_amount NUMERIC,
    xp_amount INTEGER,
    day_number INTEGER,
    is_bonus BOOLEAN,
    message TEXT
) AS $$
DECLARE
    v_last_claim DATE;
    v_current_streak INTEGER;
    v_day_number INTEGER;
    v_vfide NUMERIC;
    v_xp INTEGER;
    v_bonus BOOLEAN := false;
BEGIN
    -- Check if already claimed today
    SELECT claim_date INTO v_last_claim
    FROM daily_rewards
    WHERE user_id = p_user_id
    ORDER BY claim_date DESC
    LIMIT 1;

    IF v_last_claim = CURRENT_DATE THEN
        RETURN QUERY SELECT false, 0::NUMERIC, 0, 0, false, 'Already claimed today'::TEXT;
        RETURN;
    END IF;

    -- Get current streak
    SELECT current_streak INTO v_current_streak
    FROM user_gamification
    WHERE user_id = p_user_id;

    v_day_number := v_current_streak;

    -- Calculate reward (bonus on day 3 and 7)
    IF v_day_number % 7 = 0 THEN
        v_vfide := 50;
        v_xp := 200;
        v_bonus := true;
    ELSIF v_day_number % 3 = 0 THEN
        v_vfide := 20;
        v_xp := 75;
        v_bonus := true;
    ELSE
        v_vfide := 15;
        v_xp := 50;
    END IF;

    -- Apply streak multiplier
    v_xp := FLOOR(v_xp * (SELECT streak_multiplier FROM user_gamification WHERE user_id = p_user_id));

    -- Insert reward record
    INSERT INTO daily_rewards (user_id, claim_date, day_number, vfide_amount, xp_amount, bonus)
    VALUES (p_user_id, CURRENT_DATE, v_day_number, v_vfide, v_xp, v_bonus);

    -- Update user XP
    UPDATE user_gamification
    SET 
        xp = xp + v_xp,
        total_xp = total_xp + v_xp
    WHERE user_id = p_user_id;

    RETURN QUERY SELECT true, v_vfide, v_xp, v_day_number, v_bonus, 'Reward claimed successfully'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Function to update quest progress
CREATE OR REPLACE FUNCTION update_quest_progress(
    p_user_id INTEGER,
    p_quest_type VARCHAR,
    p_action_type VARCHAR,
    p_increment INTEGER DEFAULT 1
)
RETURNS VOID AS $$
BEGIN
    -- Update all active quests matching the action type
    UPDATE user_quests uq
    SET progress = LEAST(progress + p_increment, q.target_value)
    FROM quests q
    WHERE uq.quest_id = q.id
        AND uq.user_id = p_user_id
        AND q.type = p_quest_type
        AND q.active = true
        AND uq.completed = false
        AND q.expires_at > NOW();

    -- Mark as completed if target reached
    UPDATE user_quests uq
    SET 
        completed = true,
        completed_at = NOW()
    FROM quests q
    WHERE uq.quest_id = q.id
        AND uq.user_id = p_user_id
        AND uq.progress >= q.target_value
        AND uq.completed = false;
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- SEED DATA - Initial Quests
-- ================================================

-- Daily Quests (regenerate daily)
INSERT INTO quests (type, title, description, target_value, reward_xp, reward_vfide, difficulty, icon, expires_at)
VALUES
    ('daily', 'Daily Login', 'Log in to VFIDE today', 1, 50, 15, 'easy', '🌅', NOW() + INTERVAL '1 day'),
    ('daily', 'First Transaction', 'Make at least 1 transaction', 1, 100, 25, 'easy', '💸', NOW() + INTERVAL '1 day'),
    ('daily', 'Social Butterfly', 'Send 3 messages', 3, 75, NULL, 'easy', '💬', NOW() + INTERVAL '1 day'),
    ('daily', 'Vote on Proposal', 'Cast 1 governance vote', 1, 150, 30, 'medium', '🗳️', NOW() + INTERVAL '1 day');

-- Weekly Quests
INSERT INTO quests (type, title, description, target_value, reward_xp, reward_vfide, reward_badge, difficulty, icon, expires_at)
VALUES
    ('weekly', 'Transaction Master', 'Complete 20 transactions', 20, 500, 200, NULL, 'medium', '💰', NOW() + INTERVAL '7 days'),
    ('weekly', 'Friend Collector', 'Add 5 new friends', 5, 400, 150, NULL, 'medium', '👥', NOW() + INTERVAL '7 days'),
    ('weekly', 'Governance Participant', 'Vote on 5 proposals', 5, 600, 250, 'Active Voter', 'hard', '⚖️', NOW() + INTERVAL '7 days');

-- Monthly Quests
INSERT INTO quests (type, title, description, target_value, reward_xp, reward_vfide, reward_badge, difficulty, icon, expires_at)
VALUES
    ('monthly', 'Power User', 'Complete 100 transactions', 100, 2500, 1000, 'Power User', 'hard', '⚡', NOW() + INTERVAL '30 days'),
    ('monthly', 'ProofScore Elite', 'Reach 8000 ProofScore', 8000, 3000, 1500, 'Elite Member', 'legendary', '👑', NOW() + INTERVAL '30 days'),
    ('monthly', 'Community Leader', 'Help 10 users resolve issues', 10, 5000, 2000, 'Community Helper', 'legendary', '🤝', NOW() + INTERVAL '30 days');

-- ================================================
-- COMMENTS
-- ================================================

COMMENT ON TABLE quests IS 'Daily, weekly, and monthly quest definitions';
COMMENT ON TABLE user_quests IS 'User progress tracking for quests';
COMMENT ON TABLE daily_rewards IS 'Daily login reward claims history';
COMMENT ON TABLE onboarding_checklist IS 'User onboarding progress tracking';
COMMENT ON TABLE achievement_notifications IS 'Achievement toast notification history';

COMMENT ON FUNCTION update_user_streak IS 'Updates user login streak and multiplier';
COMMENT ON FUNCTION claim_daily_reward IS 'Claims daily login reward with streak bonuses';
COMMENT ON FUNCTION update_quest_progress IS 'Updates user quest progress for matching quests';

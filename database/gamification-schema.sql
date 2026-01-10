-- ════════════════════════════════════════════════════════════════════════
-- GAMIFICATION ENHANCEMENT SCHEMA
-- Daily quests, streaks, rewards, achievements
-- ════════════════════════════════════════════════════════════════════════

-- User Streaks
CREATE TABLE IF NOT EXISTS user_streaks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    streak_type VARCHAR(50) NOT NULL, -- 'login', 'transaction', 'voting', 'social'
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_activity_date DATE,
    streak_start_date DATE,
    total_days INTEGER DEFAULT 0,
    rewards_claimed INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, streak_type)
);

CREATE INDEX idx_user_streaks_user ON user_streaks(user_id);
CREATE INDEX idx_user_streaks_type ON user_streaks(streak_type);

-- Daily Quests
CREATE TABLE IF NOT EXISTS daily_quests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quest_key VARCHAR(100) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(50) NOT NULL, -- 'transaction', 'social', 'governance', 'merchant'
    difficulty VARCHAR(20) NOT NULL, -- 'easy', 'medium', 'hard'
    target_value INTEGER NOT NULL,
    reward_xp INTEGER NOT NULL,
    reward_vfide BIGINT DEFAULT 0,
    reward_badge VARCHAR(100),
    icon VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    rotation_day INTEGER, -- 0-6 for day of week, null for always available
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed initial quests (XP only - VFIDE rewards come from monthly competition)
-- NOTE: Only VFIDE transactions count toward quest progress
INSERT INTO daily_quests (quest_key, title, description, category, difficulty, target_value, reward_xp, reward_vfide, icon) VALUES
('daily_login', 'Daily Check-In', 'Log in to VFIDE and check your dashboard', 'social', 'easy', 1, 50, 0, '📅'),
('make_transaction', 'Send Payment', 'Complete at least 1 VFIDE transaction today', 'transaction', 'easy', 1, 100, 0, '💸'),
('social_interaction', 'Social Butterfly', 'Send 3 messages or make 1 post', 'social', 'easy', 3, 75, 0, '🦋'),
('governance_vote', 'Voice Your Opinion', 'Vote on 1 governance proposal', 'governance', 'medium', 1, 150, 0, '🗳️'),
('endorsement_give', 'Spread Trust', 'Give 2 endorsements to trusted users', 'social', 'medium', 2, 125, 0, '⭐'),
('merchant_payment', 'Support Merchants', 'Make 1 VFIDE payment to a merchant', 'merchant', 'medium', 1, 150, 0, '🏪'),
('high_volume', 'Power User', 'Complete 5 VFIDE transactions in one day', 'transaction', 'hard', 5, 300, 0, '⚡'),
('vault_deposit', 'Build Your Vault', 'Deposit VFIDE funds into your vault', 'transaction', 'easy', 1, 100, 0, '🏦'),
('friend_invite', 'Grow the Network', 'Invite 1 friend to VFIDE', 'social', 'medium', 1, 200, 0, '👥'),
('perfect_score', 'Reputation Builder', 'Maintain ProofScore above 700', 'governance', 'hard', 1, 250, 0, '🏆')
ON CONFLICT (quest_key) DO NOTHING;

-- User Quest Progress
CREATE TABLE IF NOT EXISTS user_quest_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    quest_id UUID NOT NULL REFERENCES daily_quests(id) ON DELETE CASCADE,
    quest_date DATE NOT NULL DEFAULT CURRENT_DATE,
    progress INTEGER DEFAULT 0,
    target INTEGER NOT NULL,
    completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMP WITH TIME ZONE,
    claimed BOOLEAN DEFAULT false,
    claimed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, quest_id, quest_date)
);

CREATE INDEX idx_user_quest_progress_user ON user_quest_progress(user_id, quest_date);
CREATE INDEX idx_user_quest_progress_quest ON user_quest_progress(quest_id);
CREATE INDEX idx_user_quest_progress_date ON user_quest_progress(quest_date);

-- Weekly Challenges
CREATE TABLE IF NOT EXISTS weekly_challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    challenge_key VARCHAR(100) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(50) NOT NULL,
    target_value INTEGER NOT NULL,
    reward_xp INTEGER NOT NULL,
    reward_vfide BIGINT DEFAULT 0,
    reward_badge VARCHAR(100),
    icon VARCHAR(50),
    week_start DATE NOT NULL,
    week_end DATE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed initial weekly challenges (XP only - VFIDE rewards from monthly competition)
INSERT INTO weekly_challenges (challenge_key, title, description, category, target_value, reward_xp, reward_vfide, icon, week_start, week_end) VALUES
('weekly_transactions', 'Transaction Master', 'Complete 20 transactions this week', 'transaction', 20, 500, 0, '💰', CURRENT_DATE - EXTRACT(DOW FROM CURRENT_DATE)::INTEGER, CURRENT_DATE - EXTRACT(DOW FROM CURRENT_DATE)::INTEGER + 6),
('weekly_social', 'Community Champion', 'Send 25 messages or make 5 posts', 'social', 25, 400, 0, '👑', CURRENT_DATE - EXTRACT(DOW FROM CURRENT_DATE)::INTEGER, CURRENT_DATE - EXTRACT(DOW FROM CURRENT_DATE)::INTEGER + 6),
('weekly_governance', 'Active Citizen', 'Vote on 5 proposals this week', 'governance', 5, 600, 0, '🏛️', CURRENT_DATE - EXTRACT(DOW FROM CURRENT_DATE)::INTEGER, CURRENT_DATE - EXTRACT(DOW FROM CURRENT_DATE)::INTEGER + 6)
ON CONFLICT (challenge_key) DO NOTHING;

-- User Weekly Progress
CREATE TABLE IF NOT EXISTS user_weekly_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    challenge_id UUID NOT NULL REFERENCES weekly_challenges(id) ON DELETE CASCADE,
    week_start DATE NOT NULL,
    progress INTEGER DEFAULT 0,
    target INTEGER NOT NULL,
    completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMP WITH TIME ZONE,
    claimed BOOLEAN DEFAULT false,
    claimed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, challenge_id, week_start)
);

CREATE INDEX idx_user_weekly_progress_user ON user_weekly_progress(user_id, week_start);
CREATE INDEX idx_user_weekly_progress_challenge ON user_weekly_progress(challenge_id);

-- Daily Rewards
CREATE TABLE IF NOT EXISTS daily_rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reward_date DATE NOT NULL DEFAULT CURRENT_DATE,
    reward_type VARCHAR(50) NOT NULL, -- 'login', 'streak_milestone', 'quest_completion'
    xp_earned INTEGER DEFAULT 0,
    vfide_earned BIGINT DEFAULT 0,
    streak_day INTEGER,
    description TEXT,
    claimed BOOLEAN DEFAULT false,
    claimed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, reward_date, reward_type)
);

CREATE INDEX idx_daily_rewards_user ON daily_rewards(user_id, reward_date DESC);
CREATE INDEX idx_daily_rewards_claimed ON daily_rewards(claimed);

-- Achievement Milestones
CREATE TABLE IF NOT EXISTS achievement_milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    milestone_key VARCHAR(100) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(50) NOT NULL,
    requirement_type VARCHAR(50) NOT NULL, -- 'proof_score', 'level', 'transaction_count', 'streak_days'
    requirement_value INTEGER NOT NULL,
    reward_xp INTEGER NOT NULL,
    reward_badge VARCHAR(100),
    icon VARCHAR(50),
    rarity VARCHAR(20), -- 'common', 'rare', 'epic', 'legendary'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed achievement milestones (XP and badges only - VFIDE from monthly competition)
INSERT INTO achievement_milestones (milestone_key, title, description, category, requirement_type, requirement_value, reward_xp, reward_vfide, reward_badge, icon, rarity) VALUES
('score_500', 'Trusted Newcomer', 'Reach ProofScore of 500', 'reputation', 'proof_score', 500, 200, 0, 'TRUSTED_MEMBER', '🌟', 'common'),
('score_700', 'Verified Member', 'Reach ProofScore of 700', 'reputation', 'proof_score', 700, 500, 0, 'VERIFIED', '✅', 'rare'),
('score_850', 'Elite Status', 'Reach ProofScore of 850', 'reputation', 'proof_score', 850, 1000, 0, 'ELITE', '👑', 'epic'),
('level_10', 'Rising Star', 'Reach Level 10', 'progression', 'level', 10, 300, 0, null, '⭐', 'common'),
('level_25', 'Veteran User', 'Reach Level 25', 'progression', 'level', 25, 750, 0, null, '🎖️', 'rare'),
('level_50', 'Legendary', 'Reach Level 50', 'progression', 'level', 50, 2000, 0, 'LEGENDARY', '🏆', 'legendary'),
('streak_7', 'Week Warrior', 'Maintain 7-day login streak', 'engagement', 'streak_days', 7, 250, 0, null, '🔥', 'common'),
('streak_30', 'Monthly Master', 'Maintain 30-day login streak', 'engagement', 'streak_days', 30, 1000, 0, 'DEDICATED', '💪', 'epic'),
('streak_90', 'Quarter Champion', 'Maintain 90-day login streak', 'engagement', 'streak_days', 90, 3000, 0, 'UNSTOPPABLE', '🔱', 'legendary'),
('tx_100', 'Transaction Pro', 'Complete 100 transactions', 'activity', 'transaction_count', 100, 500, 0, 'ACTIVE_MEMBER', '💸', 'rare'),
('tx_500', 'Power Trader', 'Complete 500 transactions', 'activity', 'transaction_count', 500, 2000, 0, 'HIGH_VOLUME_TRADER', '⚡', 'epic')
ON CONFLICT (milestone_key) DO NOTHING;

-- User Achievement Progress
CREATE TABLE IF NOT EXISTS user_achievement_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    milestone_id UUID NOT NULL REFERENCES achievement_milestones(id) ON DELETE CASCADE,
    progress INTEGER DEFAULT 0,
    target INTEGER NOT NULL,
    unlocked BOOLEAN DEFAULT false,
    unlocked_at TIMESTAMP WITH TIME ZONE,
    claimed BOOLEAN DEFAULT false,
    claimed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, milestone_id)
);

CREATE INDEX idx_user_achievement_progress_user ON user_achievement_progress(user_id);
CREATE INDEX idx_user_achievement_progress_unlocked ON user_achievement_progress(unlocked);

-- Onboarding Checklist
CREATE TABLE IF NOT EXISTS user_onboarding (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    step_connect_wallet BOOLEAN DEFAULT false,
    step_complete_profile BOOLEAN DEFAULT false,
    step_first_transaction BOOLEAN DEFAULT false,
    step_add_friend BOOLEAN DEFAULT false,
    step_join_group BOOLEAN DEFAULT false,
    step_vote_proposal BOOLEAN DEFAULT false,
    step_earn_badge BOOLEAN DEFAULT false,
    step_deposit_vault BOOLEAN DEFAULT false,
    step_give_endorsement BOOLEAN DEFAULT false,
    step_complete_quest BOOLEAN DEFAULT false,
    onboarding_completed BOOLEAN DEFAULT false,
    onboarding_completed_at TIMESTAMP WITH TIME ZONE,
    reward_claimed BOOLEAN DEFAULT false,
    reward_claimed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_user_onboarding_completed ON user_onboarding(onboarding_completed);

-- Notification Queue for Achievements
CREATE TABLE IF NOT EXISTS achievement_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    notification_type VARCHAR(50) NOT NULL, -- 'quest_complete', 'streak_milestone', 'achievement_unlock', 'level_up'
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    icon VARCHAR(50),
    reward_xp INTEGER DEFAULT 0,
    reward_vfide BIGINT DEFAULT 0,
    shown BOOLEAN DEFAULT false,
    shown_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_achievement_notifications_user ON achievement_notifications(user_id, shown);
CREATE INDEX idx_achievement_notifications_created ON achievement_notifications(created_at DESC);

-- Functions for automatic tracking

-- Update streak function
CREATE OR REPLACE FUNCTION update_user_streak(
    p_user_id UUID,
    p_streak_type VARCHAR(50)
) RETURNS void AS $$
DECLARE
    v_last_activity DATE;
    v_current_streak INTEGER;
    v_longest_streak INTEGER;
BEGIN
    SELECT last_activity_date, current_streak, longest_streak
    INTO v_last_activity, v_current_streak, v_longest_streak
    FROM user_streaks
    WHERE user_id = p_user_id AND streak_type = p_streak_type;

    IF NOT FOUND THEN
        -- First time tracking this streak
        INSERT INTO user_streaks (user_id, streak_type, current_streak, longest_streak, last_activity_date, streak_start_date, total_days)
        VALUES (p_user_id, p_streak_type, 1, 1, CURRENT_DATE, CURRENT_DATE, 1);
    ELSIF v_last_activity = CURRENT_DATE THEN
        -- Already counted today, do nothing
        RETURN;
    ELSIF v_last_activity = CURRENT_DATE - INTERVAL '1 day' THEN
        -- Continuing streak
        UPDATE user_streaks
        SET current_streak = current_streak + 1,
            longest_streak = GREATEST(longest_streak, current_streak + 1),
            last_activity_date = CURRENT_DATE,
            total_days = total_days + 1,
            updated_at = NOW()
        WHERE user_id = p_user_id AND streak_type = p_streak_type;
    ELSE
        -- Streak broken
        UPDATE user_streaks
        SET current_streak = 1,
            last_activity_date = CURRENT_DATE,
            streak_start_date = CURRENT_DATE,
            total_days = total_days + 1,
            updated_at = NOW()
        WHERE user_id = p_user_id AND streak_type = p_streak_type;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Update quest progress function
CREATE OR REPLACE FUNCTION update_quest_progress(
    p_user_id UUID,
    p_quest_key VARCHAR(100),
    p_increment INTEGER DEFAULT 1
) RETURNS void AS $$
DECLARE
    v_quest_id UUID;
    v_target INTEGER;
    v_progress INTEGER;
BEGIN
    -- Get quest details
    SELECT id, target_value INTO v_quest_id, v_target
    FROM daily_quests
    WHERE quest_key = p_quest_key AND is_active = true;

    IF NOT FOUND THEN
        RETURN;
    END IF;

    -- Insert or update progress
    INSERT INTO user_quest_progress (user_id, quest_id, quest_date, progress, target)
    VALUES (p_user_id, v_quest_id, CURRENT_DATE, p_increment, v_target)
    ON CONFLICT (user_id, quest_id, quest_date)
    DO UPDATE SET 
        progress = user_quest_progress.progress + p_increment,
        completed = (user_quest_progress.progress + p_increment >= v_target),
        completed_at = CASE 
            WHEN user_quest_progress.progress + p_increment >= v_target AND user_quest_progress.completed = false 
            THEN NOW() 
            ELSE user_quest_progress.completed_at 
        END;
END;
$$ LANGUAGE plpgsql;

-- Grant rewards for streak milestones
CREATE OR REPLACE FUNCTION check_streak_milestones(
    p_user_id UUID,
    p_streak_type VARCHAR(50),
    p_streak_days INTEGER
) RETURNS void AS $$
BEGIN
    -- Check for streak milestones (7, 14, 30, 60, 90 days)
    IF p_streak_days IN (7, 14, 30, 60, 90) THEN
        INSERT INTO daily_rewards (user_id, reward_date, reward_type, xp_earned, vfide_earned, streak_day, description)
        VALUES (
            p_user_id,
            CURRENT_DATE,
            'streak_milestone',
            p_streak_days * 10, -- XP scales with streak
            (p_streak_days * 5)::BIGINT * 1000000000000000000, -- VFIDE scales with streak
            p_streak_days,
            format('%s day streak milestone!', p_streak_days)
        )
        ON CONFLICT (user_id, reward_date, reward_type) DO NOTHING;

        -- Create notification
        INSERT INTO achievement_notifications (user_id, notification_type, title, message, icon, reward_xp, reward_vfide)
        VALUES (
            p_user_id,
            'streak_milestone',
            format('%s Day Streak! 🔥', p_streak_days),
            format('Amazing! You''ve maintained a %s day streak. Keep it up!', p_streak_days),
            '🔥',
            p_streak_days * 10,
            (p_streak_days * 5)::BIGINT * 1000000000000000000
        );
    END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE user_streaks IS 'Track user activity streaks';
-- ════════════════════════════════════════════════════════════════════════
-- MONTHLY COMPETITION SYSTEM
-- Leaderboard with placement-based rewards funded by burn fees
-- ════════════════════════════════════════════════════════════════════════

-- Monthly Leaderboard
CREATE TABLE IF NOT EXISTS monthly_leaderboard (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    month_year VARCHAR(7) NOT NULL, -- 'YYYY-MM' format
    total_xp_earned INTEGER DEFAULT 0,
    quests_completed INTEGER DEFAULT 0,
    challenges_completed INTEGER DEFAULT 0,
    current_streak INTEGER DEFAULT 0,
    transactions_count INTEGER DEFAULT 0,
    social_interactions INTEGER DEFAULT 0,
    governance_votes INTEGER DEFAULT 0,
    activity_score INTEGER DEFAULT 0, -- Composite score for ranking
    final_rank INTEGER,
    prize_claimed BOOLEAN DEFAULT false,
    prize_amount BIGINT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, month_year)
);

CREATE INDEX idx_monthly_leaderboard_month ON monthly_leaderboard(month_year);
CREATE INDEX idx_monthly_leaderboard_rank ON monthly_leaderboard(month_year, activity_score DESC);
CREATE INDEX idx_monthly_leaderboard_user ON monthly_leaderboard(user_id);

-- Monthly Prize Pool
CREATE TABLE IF NOT EXISTS monthly_prize_pool (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    month_year VARCHAR(7) UNIQUE NOT NULL,
    total_pool BIGINT DEFAULT 0, -- Funded from EcosystemVault Headhunter allocation
    distributed_amount BIGINT DEFAULT 0,
    remaining_amount BIGINT DEFAULT 0,
    distribution_complete BOOLEAN DEFAULT false,
    distribution_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE monthly_prize_pool IS 'Prize pools funded from EcosystemVault headhunter competition allocation (33.3% of 50% of burn fees)';

-- Prize Distribution Tiers
CREATE TABLE IF NOT EXISTS prize_tiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rank_start INTEGER NOT NULL,
    rank_end INTEGER NOT NULL,
    percentage DECIMAL(5,2) NOT NULL, -- Percentage of prize pool
    tier_name VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed prize distribution tiers (total: 100% - Top 1000 users)
-- Tier 1: Top 100 users split 40% equally (0.40% each)
-- Tier 2: 101-300 users split 30% equally (0.15% each)
-- Tier 3: 301-600 users split 20% equally (0.067% each)
-- Tier 4: 601-850 users split 7% equally (0.028% each)
-- Tier 5: 851-1000 users split 3% equally (0.020% each)
INSERT INTO prize_tiers (rank_start, rank_end, percentage, tier_name) VALUES
(1, 100, 40.00, 'Elite'),             -- Top 100: 40% of pool (0.40% each)
(101, 300, 30.00, 'Champion'),        -- 101-300: 30% of pool (0.15% each)
(301, 600, 20.00, 'Challenger'),      -- 301-600: 20% of pool (0.067% each)
(601, 850, 7.00, 'Contender'),        -- 601-850: 7% of pool (0.028% each)
(851, 1000, 3.00, 'Competitor')       -- 851-1000: 3% of pool (0.020% each)
ON CONFLICT DO NOTHING;

-- Function to calculate activity score with quality multipliers
CREATE OR REPLACE FUNCTION calculate_activity_score(
    p_user_id UUID,
    p_month_year VARCHAR(7)
) RETURNS INTEGER AS $$
DECLARE
    v_score INTEGER := 0;
    v_base_score INTEGER := 0;
    v_xp INTEGER;
    v_quests INTEGER;
    v_challenges INTEGER;
    v_streak INTEGER;
    v_transactions INTEGER;
    v_social INTEGER;
    v_votes INTEGER;
    v_proof_score INTEGER;
    v_account_age_days INTEGER;
    v_quality_multiplier DECIMAL(3,2) := 1.0;
    v_streak_bonus INTEGER := 0;
BEGIN
    -- Get monthly stats
    SELECT 
        total_xp_earned,
        quests_completed,
        challenges_completed,
        current_streak,
        transactions_count,
        social_interactions,
        governance_votes
    INTO v_xp, v_quests, v_challenges, v_streak, v_transactions, v_social, v_votes
    FROM monthly_leaderboard
    WHERE user_id = p_user_id AND month_year = p_month_year;
    
    -- Get user ProofScore and account age
    SELECT 
        COALESCE(ug.proof_score, 0),
        EXTRACT(DAY FROM (NOW() - u.created_at))::INTEGER
    INTO v_proof_score, v_account_age_days
    FROM users u
    LEFT JOIN user_gamification ug ON u.id = ug.user_id
    WHERE u.id = p_user_id;
    
    -- ═══════════════════════════════════════════════════════════════
    -- ELIGIBILITY CHECKS (return 0 if not eligible)
    -- ═══════════════════════════════════════════════════════════════
    
    -- Minimum ProofScore: 500 (50%)
    IF v_proof_score < 5000 THEN
        RETURN 0;
    END IF;
    
    -- Minimum account age: 7 days (prevents sybil attacks)
    IF v_account_age_days < 7 THEN
        RETURN 0;
    END IF;
    
    -- Minimum activity: at least 1 transaction
    IF v_transactions < 1 THEN
        RETURN 0;
    END IF;
    
    -- ═══════════════════════════════════════════════════════════════
    -- BASE SCORE CALCULATION
    -- ═══════════════════════════════════════════════════════════════
    
    v_base_score := 
        (v_xp * 1) +                    -- 1 point per XP
        (v_quests * 50) +               -- 50 points per quest
        (v_challenges * 500) +          -- 500 points per challenge
        (v_transactions * 25) +         -- 25 points per transaction
        (v_social * 10) +               -- 10 points per social interaction
        (v_votes * 200);                -- 200 points per vote
    
    -- ═══════════════════════════════════════════════════════════════
    -- STREAK BONUS (Exponential Growth)
    -- ═══════════════════════════════════════════════════════════════
    -- Rewards dedication with increasing returns
    -- 1-6 days: 100 pts/day
    -- 7-13 days: 150 pts/day
    -- 14-29 days: 200 pts/day
    -- 30+ days: 300 pts/day
    
    IF v_streak >= 30 THEN
        v_streak_bonus := (6 * 100) + (7 * 150) + (16 * 200) + ((v_streak - 29) * 300);
    ELSIF v_streak >= 14 THEN
        v_streak_bonus := (6 * 100) + (7 * 150) + ((v_streak - 13) * 200);
    ELSIF v_streak >= 7 THEN
        v_streak_bonus := (6 * 100) + ((v_streak - 6) * 150);
    ELSE
        v_streak_bonus := v_streak * 100;
    END IF;
    
    -- ═══════════════════════════════════════════════════════════════
    -- QUALITY MULTIPLIER (ProofScore-Based)
    -- ═══════════════════════════════════════════════════════════════
    -- Rewards high-trust users with score multiplier
    -- 950+ (95%): 1.50x multiplier
    -- 900-949 (90-94%): 1.30x multiplier
    -- 850-899 (85-89%): 1.15x multiplier
    -- 800-849 (80-84%): 1.05x multiplier
    -- 500-799 (50-79%): 1.00x multiplier (baseline)
    
    IF v_proof_score >= 9500 THEN
        v_quality_multiplier := 1.50;
    ELSIF v_proof_score >= 9000 THEN
        v_quality_multiplier := 1.30;
    ELSIF v_proof_score >= 8500 THEN
        v_quality_multiplier := 1.15;
    ELSIF v_proof_score >= 8000 THEN
        v_quality_multiplier := 1.05;
    ELSE
        v_quality_multiplier := 1.00;
    END IF;
    
    -- ═══════════════════════════════════════════════════════════════
    -- FINAL SCORE CALCULATION
    -- ═══════════════════════════════════════════════════════════════
    
    v_score := ((v_base_score + v_streak_bonus) * v_quality_multiplier)::INTEGER;
    
    RETURN v_score;
END;
$$ LANGUAGE plpgsql;

-- Function to finalize monthly rankings
CREATE OR REPLACE FUNCTION finalize_monthly_rankings(
    p_month_year VARCHAR(7)
) RETURNS void AS $$
DECLARE
    v_month_start DATE;
BEGIN
    v_month_start := TO_DATE(p_month_year || '-01', 'YYYY-MM-DD');
    
    -- Update activity scores for all participants
    UPDATE monthly_leaderboard
    SET activity_score = calculate_activity_score(user_id, p_month_year),
        updated_at = NOW()
    WHERE month_year = p_month_year;
    
    -- Assign ranks based on activity score (only eligible users)
    WITH ranked_users AS (
        SELECT 
            ml.user_id,
            ROW_NUMBER() OVER (ORDER BY ml.activity_score DESC, ml.updated_at ASC) as rank
        FROM monthly_leaderboard ml
        INNER JOIN users u ON ml.user_id = u.id
        WHERE ml.month_year = p_month_year
            -- ═══════════════════════════════════════════════════════════
            -- ELIGIBILITY REQUIREMENTS (Anti-Gaming)
            -- ═══════════════════════════════════════════════════════════
            AND ml.activity_score > 0                               -- Must have activity
            AND u.proof_score >= 5000                               -- Minimum 50% ProofScore
            AND u.created_at <= v_month_start - INTERVAL '7 days'   -- Account age ≥7 days
            AND ml.transactions_count >= 1                          -- At least 1 transaction
    )
    UPDATE monthly_leaderboard ml
    SET final_rank = ru.rank,
        updated_at = NOW()
    FROM ranked_users ru
    WHERE ml.user_id = ru.user_id
        AND ml.month_year = p_month_year;
END;
$$ LANGUAGE plpgsql;

-- Function to distribute monthly prizes
CREATE OR REPLACE FUNCTION distribute_monthly_prizes(
    p_month_year VARCHAR(7)
) RETURNS void AS $$
DECLARE
    v_pool BIGINT;
    v_user_record RECORD;
    v_tier RECORD;
    v_prize BIGINT;
    v_tier_count INTEGER;
BEGIN
    -- Get prize pool
    SELECT total_pool INTO v_pool
    FROM monthly_prize_pool
    WHERE month_year = p_month_year;
    
    IF v_pool IS NULL OR v_pool = 0 THEN
        RAISE EXCEPTION 'No prize pool available for month %', p_month_year;
    END IF;
    
    -- Distribute prizes to each tier
    FOR v_tier IN SELECT * FROM prize_tiers ORDER BY rank_start LOOP
        -- Count users in this tier
        SELECT COUNT(*) INTO v_tier_count
        FROM monthly_leaderboard
        WHERE month_year = p_month_year
            AND final_rank >= v_tier.rank_start
            AND final_rank <= v_tier.rank_end;
        
        IF v_tier_count > 0 THEN
            -- Calculate prize per user in tier
            v_prize := (v_pool * v_tier.percentage / 100) / v_tier_count;
            
            -- Update prizes for users in this tier
            UPDATE monthly_leaderboard
            SET prize_amount = v_prize
            WHERE month_year = p_month_year
                AND final_rank >= v_tier.rank_start
                AND final_rank <= v_tier.rank_end;
        END IF;
    END LOOP;
    
    -- Mark distribution as complete
    UPDATE monthly_prize_pool
    SET distribution_complete = true,
        distribution_date = NOW(),
        distributed_amount = v_pool
    WHERE month_year = p_month_year;
END;
$$ LANGUAGE plpgsql;

-- ════════════════════════════════════════════════════════════════════════
-- BURN FEE INTEGRATION
-- Automatic accumulation of burn fees into monthly prize pool
-- NOTE: This captures the GAMIFICATION portion from EcosystemVault's allocation
-- Full burn fee split (ProofScoreBurnRouter):
--   - 40% Hard burn (deflationary)
--   - 10% Sanctum (charity)
--   - 50% EcosystemVault (operations) which splits into:
--     * 33.3% Council Salaries (120-day distribution)
--     * 33.3% Merchant Bonuses (tiered by ProofScore)
--     * 33.3% Headhunter Competition (quarterly distribution)
--
-- This table tracks the MONTHLY COMPETITION portion which comes from
-- a percentage of the Headhunter Competition allocation (from EcosystemVault)
-- ════════════════════════════════════════════════════════════════════════

-- Function to add fees to monthly prize pool
-- This should be called from EcosystemVault when allocating headhunter funds
CREATE OR REPLACE FUNCTION add_to_prize_pool(
    p_amount BIGINT
) RETURNS void AS $$
DECLARE
    v_month_year VARCHAR(7);
BEGIN
    v_month_year := TO_CHAR(CURRENT_DATE, 'YYYY-MM');
    
    -- Create or update monthly prize pool
    INSERT INTO monthly_prize_pool (month_year, total_pool, remaining_amount)
    VALUES (v_month_year, p_amount, p_amount)
    ON CONFLICT (month_year) 
    DO UPDATE SET 
        total_pool = monthly_prize_pool.total_pool + p_amount,
        remaining_amount = monthly_prize_pool.remaining_amount + p_amount;
END;
$$ LANGUAGE plpgsql;

-- Function to trigger on VFIDE transaction completion
-- Called whenever a VFIDE transaction is processed
-- NOTE: Does NOT add to prize pool directly - that's handled by EcosystemVault
-- This only tracks gamification activity with anti-gaming checks
CREATE OR REPLACE FUNCTION track_vfide_transaction(
    p_user_id UUID,
    p_transaction_type VARCHAR(50),
    p_amount BIGINT,
    p_recipient_id UUID DEFAULT NULL
) RETURNS void AS $$
DECLARE
    v_month_year VARCHAR(7);
    v_is_valid BOOLEAN := true;
BEGIN
    v_month_year := TO_CHAR(CURRENT_DATE, 'YYYY-MM');
    
    -- ═══════════════════════════════════════════════════════════════
    -- ANTI-GAMING CHECKS
    -- ═══════════════════════════════════════════════════════════════
    
    -- Check 1: Prevent wash trading (self-transactions)
    IF p_recipient_id IS NOT NULL AND p_recipient_id = p_user_id THEN
        v_is_valid := false;
    END IF;
    
    -- Check 2: Minimum transaction amount (0.1 VFIDE = 100000000000000000 wei)
    -- Prevents micro-spam transactions
    IF p_amount < 100000000000000000 THEN
        v_is_valid := false;
    END IF;
    
    -- Check 3: Rate limiting - max 100 transactions per day
    -- Prevents bot manipulation
    DECLARE
        v_today_count INTEGER;
    BEGIN
        SELECT COUNT(*) INTO v_today_count
        FROM daily_rewards
        WHERE user_id = p_user_id 
            AND reward_date = CURRENT_DATE
            AND reward_type = 'transaction_tracked';
        
        IF v_today_count >= 100 THEN
            v_is_valid := false;
        END IF;
    END;
    
    -- If transaction fails checks, don't count it
    IF NOT v_is_valid THEN
        RETURN;
    END IF;
    
    -- ═══════════════════════════════════════════════════════════════
    -- VALID TRANSACTION - TRACK IT
    -- ═══════════════════════════════════════════════════════════════
    
    -- Record transaction for rate limiting
    INSERT INTO daily_rewards (user_id, reward_date, reward_type, description, claimed, claimed_at)
    VALUES (p_user_id, CURRENT_DATE, 'transaction_tracked', 'Transaction counted for gamification', true, NOW())
    ON CONFLICT DO NOTHING;
    
    -- Update monthly leaderboard transaction count
    INSERT INTO monthly_leaderboard 
    (user_id, month_year, transactions_count)
    VALUES (p_user_id, v_month_year, 1)
    ON CONFLICT (user_id, month_year) 
    DO UPDATE SET 
        transactions_count = monthly_leaderboard.transactions_count + 1,
        updated_at = NOW();
    
    -- Update activity score
    UPDATE monthly_leaderboard
    SET activity_score = calculate_activity_score(p_user_id, v_month_year)
    WHERE user_id = p_user_id AND month_year = v_month_year;
    
    -- Update transaction-based quests
    PERFORM update_quest_progress(p_user_id, 'make_transaction', 1);
    PERFORM update_quest_progress(p_user_id, 'high_volume', 1);
    IF p_transaction_type = 'merchant' THEN
        PERFORM update_quest_progress(p_user_id, 'merchant_payment', 1);
    ELSIF p_transaction_type = 'vault_deposit' THEN
        PERFORM update_quest_progress(p_user_id, 'vault_deposit', 1);
    END IF;
    
    -- Update transaction streak
    PERFORM update_user_streak(p_user_id, 'transaction');
END;
$$ LANGUAGE plpgsql;

-- Function to track social interactions
CREATE OR REPLACE FUNCTION track_social_interaction(
    p_user_id UUID,
    p_interaction_type VARCHAR(50)
) RETURNS void AS $$
DECLARE
    v_month_year VARCHAR(7);
BEGIN
    v_month_year := TO_CHAR(CURRENT_DATE, 'YYYY-MM');
    
    -- Update monthly leaderboard social count
    INSERT INTO monthly_leaderboard 
    (user_id, month_year, social_interactions)
    VALUES (p_user_id, v_month_year, 1)
    ON CONFLICT (user_id, month_year) 
    DO UPDATE SET 
        social_interactions = monthly_leaderboard.social_interactions + 1,
        updated_at = NOW();
    
    -- Update activity score
    UPDATE monthly_leaderboard
    SET activity_score = calculate_activity_score(p_user_id, v_month_year)
    WHERE user_id = p_user_id AND month_year = v_month_year;
    
    -- Update social quests
    PERFORM update_quest_progress(p_user_id, 'social_interaction', 1);
    IF p_interaction_type = 'endorsement' THEN
        PERFORM update_quest_progress(p_user_id, 'endorsement_give', 1);
    END IF;
    
    -- Update social streak
    PERFORM update_user_streak(p_user_id, 'social');
END;
$$ LANGUAGE plpgsql;

-- Function to track governance votes
CREATE OR REPLACE FUNCTION track_governance_vote(
    p_user_id UUID
) RETURNS void AS $$
DECLARE
    v_month_year VARCHAR(7);
BEGIN
    v_month_year := TO_CHAR(CURRENT_DATE, 'YYYY-MM');
    
    -- Update monthly leaderboard votes count
    INSERT INTO monthly_leaderboard 
    (user_id, month_year, governance_votes)
    VALUES (p_user_id, v_month_year, 1)
    ON CONFLICT (user_id, month_year) 
    DO UPDATE SET 
        governance_votes = monthly_leaderboard.governance_votes + 1,
        updated_at = NOW();
    
    -- Update activity score
    UPDATE monthly_leaderboard
    SET activity_score = calculate_activity_score(p_user_id, v_month_year)
    WHERE user_id = p_user_id AND month_year = v_month_year;
    
    -- Update governance quest
    PERFORM update_quest_progress(p_user_id, 'governance_vote', 1);
    
    -- Update voting streak
    PERFORM update_user_streak(p_user_id, 'voting');
END;
$$ LANGUAGE plpgsql;

-- Function to update XP in monthly leaderboard after quest/achievement claims
CREATE OR REPLACE FUNCTION sync_monthly_xp(
    p_user_id UUID
) RETURNS void AS $$
DECLARE
    v_month_year VARCHAR(7);
    v_monthly_xp INTEGER;
BEGIN
    v_month_year := TO_CHAR(CURRENT_DATE, 'YYYY-MM');
    
    -- Calculate XP earned this month
    SELECT COALESCE(SUM(xp_earned), 0)
    INTO v_monthly_xp
    FROM daily_rewards
    WHERE user_id = p_user_id 
        AND reward_date >= DATE_TRUNC('month', CURRENT_DATE)
        AND reward_date < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month';
    
    -- Update leaderboard
    INSERT INTO monthly_leaderboard 
    (user_id, month_year, total_xp_earned)
    VALUES (p_user_id, v_month_year, v_monthly_xp)
    ON CONFLICT (user_id, month_year) 
    DO UPDATE SET 
        total_xp_earned = v_monthly_xp,
        updated_at = NOW();
    
    -- Update activity score
    UPDATE monthly_leaderboard
    SET activity_score = calculate_activity_score(p_user_id, v_month_year)
    WHERE user_id = p_user_id AND month_year = v_month_year;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION add_to_prize_pool IS 'Accumulate burn fees into monthly prize pool';
COMMENT ON FUNCTION track_vfide_transaction IS 'Track VFIDE transaction for gamification (call on every VFIDE tx)';
COMMENT ON FUNCTION track_social_interaction IS 'Track social interaction for gamification';
COMMENT ON FUNCTION track_governance_vote IS 'Track governance vote for gamification';
COMMENT ON FUNCTION sync_monthly_xp IS 'Sync monthly XP totals to leaderboard';

COMMENT ON TABLE monthly_leaderboard IS 'Monthly competition rankings and scores - ONLY VFIDE transactions count';
COMMENT ON TABLE monthly_prize_pool IS 'Prize pools funded by burn fees';
COMMENT ON TABLE prize_tiers IS 'Reward distribution by placement';
COMMENT ON TABLE daily_quests IS 'Available daily quests (XP only) - VFIDE transactions only';
COMMENT ON TABLE user_quest_progress IS 'User progress on daily quests';
COMMENT ON TABLE weekly_challenges IS 'Weekly challenge definitions (XP only) - VFIDE transactions only';
COMMENT ON TABLE user_weekly_progress IS 'User progress on weekly challenges';
COMMENT ON TABLE daily_rewards IS 'Daily reward claims and history';
COMMENT ON TABLE achievement_milestones IS 'Achievement milestone definitions (XP + badges) - VFIDE only';
COMMENT ON TABLE user_achievement_progress IS 'User progress towards achievements';
COMMENT ON TABLE user_onboarding IS 'Onboarding checklist progress';
COMMENT ON TABLE achievement_notifications IS 'Queue for achievement popups';

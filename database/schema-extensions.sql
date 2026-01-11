-- Additional Tables for Full Production System
-- Run this after schema.sql to add missing tables

-- Groups and Group Memberships
CREATE TABLE IF NOT EXISTS groups (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    creator_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    avatar_url TEXT,
    is_private BOOLEAN DEFAULT false,
    member_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS group_members (
    id SERIAL PRIMARY KEY,
    group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'member', -- admin, moderator, member
    joined_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(group_id, user_id)
);

CREATE TABLE IF NOT EXISTS group_invites (
    id SERIAL PRIMARY KEY,
    group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE,
    code VARCHAR(12) UNIQUE NOT NULL,
    created_by INTEGER REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMP,
    max_uses INTEGER,
    current_uses INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    description TEXT,
    require_approval BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Gamification and XP System
CREATE TABLE IF NOT EXISTS user_gamification (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    level INTEGER DEFAULT 1,
    xp INTEGER DEFAULT 0,
    total_xp INTEGER DEFAULT 0,
    messages_sent INTEGER DEFAULT 0,
    friends_added INTEGER DEFAULT 0,
    groups_created INTEGER DEFAULT 0,
    payments_sent INTEGER DEFAULT 0,
    days_active INTEGER DEFAULT 0,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_active_date DATE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS achievements (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    icon TEXT,
    xp_reward INTEGER DEFAULT 0,
    category VARCHAR(50), -- social, governance, trading, activity
    requirement_type VARCHAR(50), -- messages, friends, votes, etc.
    requirement_count INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_achievements (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    achievement_id INTEGER REFERENCES achievements(id) ON DELETE CASCADE,
    earned_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, achievement_id)
);

-- Message Features (reactions, edits, deletions)
CREATE TABLE IF NOT EXISTS message_reactions (
    id SERIAL PRIMARY KEY,
    message_id INTEGER REFERENCES messages(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    reaction_type VARCHAR(20) DEFAULT 'emoji' CHECK (reaction_type IN ('emoji', 'custom_image')),
    emoji VARCHAR(10),
    image_url TEXT,
    image_name VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT valid_reaction CHECK (
        (reaction_type = 'emoji' AND emoji IS NOT NULL AND image_url IS NULL) OR
        (reaction_type = 'custom_image' AND image_url IS NOT NULL AND emoji IS NULL)
    ),
    UNIQUE(message_id, user_id, reaction_type, COALESCE(emoji, image_url))
);

CREATE TABLE IF NOT EXISTS message_edits (
    id SERIAL PRIMARY KEY,
    message_id INTEGER REFERENCES messages(id) ON DELETE CASCADE,
    previous_content TEXT NOT NULL,
    edited_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS edited_at TIMESTAMP;

-- File Attachments
CREATE TABLE IF NOT EXISTS attachments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_size BIGINT NOT NULL,
    storage_url TEXT NOT NULL,
    thumbnail_url TEXT,
    is_public BOOLEAN DEFAULT false,
    uploaded_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS message_attachments (
    message_id INTEGER REFERENCES messages(id) ON DELETE CASCADE,
    attachment_id INTEGER REFERENCES attachments(id) ON DELETE CASCADE,
    PRIMARY KEY (message_id, attachment_id)
);

-- Crypto/Blockchain Data
CREATE TABLE IF NOT EXISTS token_balances (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    token_address VARCHAR(42) NOT NULL,
    balance VARCHAR(78) NOT NULL, -- Store as string for big numbers
    last_updated TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, token_address)
);

CREATE TABLE IF NOT EXISTS payment_requests (
    id SERIAL PRIMARY KEY,
    from_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    to_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    amount VARCHAR(78) NOT NULL,
    token_address VARCHAR(42) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'pending', -- pending, paid, cancelled, expired
    expires_at TIMESTAMP,
    paid_tx_hash VARCHAR(66),
    paid_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_rewards (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    reward_type VARCHAR(50) NOT NULL, -- referral, activity, governance, etc.
    amount VARCHAR(78) NOT NULL,
    token_address VARCHAR(42) NOT NULL,
    description TEXT,
    is_claimed BOOLEAN DEFAULT false,
    claimed_tx_hash VARCHAR(66),
    claimed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Notification Preferences
CREATE TABLE IF NOT EXISTS notification_preferences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    email_enabled BOOLEAN DEFAULT true,
    push_enabled BOOLEAN DEFAULT true,
    messages BOOLEAN DEFAULT true,
    friend_requests BOOLEAN DEFAULT true,
    endorsements BOOLEAN DEFAULT true,
    proposals BOOLEAN DEFAULT true,
    badges BOOLEAN DEFAULT true,
    activities BOOLEAN DEFAULT true,
    marketing BOOLEAN DEFAULT false,
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS push_subscriptions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Security and Monitoring
CREATE TABLE IF NOT EXISTS security_violations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    violation_type VARCHAR(100) NOT NULL, -- xss, sql_injection, rate_limit, etc.
    severity VARCHAR(20) NOT NULL, -- low, medium, high, critical
    ip_address INET,
    user_agent TEXT,
    request_url TEXT,
    request_method VARCHAR(10),
    request_body TEXT,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS performance_metrics (
    id SERIAL PRIMARY KEY,
    metric_type VARCHAR(100) NOT NULL, -- api_response, page_load, query_duration
    metric_value NUMERIC NOT NULL,
    endpoint TEXT,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS error_logs (
    id SERIAL PRIMARY KEY,
    error_type VARCHAR(100) NOT NULL,
    error_message TEXT NOT NULL,
    stack_trace TEXT,
    endpoint TEXT,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS analytics_events (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    event_type VARCHAR(100) NOT NULL,
    event_name VARCHAR(255) NOT NULL,
    properties JSONB,
    session_id VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Sync State for Offline Support
CREATE TABLE IF NOT EXISTS sync_state (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    entity_type VARCHAR(50) NOT NULL, -- messages, notifications, etc.
    entity_id INTEGER NOT NULL,
    last_synced_at TIMESTAMP NOT NULL,
    sync_version INTEGER DEFAULT 1,
    UNIQUE(user_id, entity_type, entity_id)
);

-- Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_groups_creator ON groups(creator_id);
CREATE INDEX IF NOT EXISTS idx_group_members_group ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user ON group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_invites_code ON group_invites(code);
CREATE INDEX IF NOT EXISTS idx_group_invites_group ON group_invites(group_id);

CREATE INDEX IF NOT EXISTS idx_user_gamification_user ON user_gamification(user_id);
CREATE INDEX IF NOT EXISTS idx_user_gamification_level ON user_gamification(level DESC);
CREATE INDEX IF NOT EXISTS idx_user_gamification_xp ON user_gamification(total_xp DESC);

CREATE INDEX IF NOT EXISTS idx_message_reactions_message ON message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_message_edits_message ON message_edits(message_id);

CREATE INDEX IF NOT EXISTS idx_attachments_user ON attachments(user_id);
CREATE INDEX IF NOT EXISTS idx_message_attachments_message ON message_attachments(message_id);

CREATE INDEX IF NOT EXISTS idx_token_balances_user ON token_balances(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_requests_from ON payment_requests(from_user_id);
CREATE INDEX IF NOT EXISTS idx_payment_requests_to ON payment_requests(to_user_id);
CREATE INDEX IF NOT EXISTS idx_user_rewards_user ON user_rewards(user_id);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user ON notification_preferences(user_id);

CREATE INDEX IF NOT EXISTS idx_security_violations_user ON security_violations(user_id);
CREATE INDEX IF NOT EXISTS idx_security_violations_created ON security_violations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_type ON performance_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_error_logs_created ON error_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON analytics_events(event_type);

CREATE INDEX IF NOT EXISTS idx_sync_state_user_entity ON sync_state(user_id, entity_type);

-- Update existing messages table
ALTER TABLE messages ADD COLUMN IF NOT EXISTS reply_to_id INTEGER REFERENCES messages(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_messages_reply_to ON messages(reply_to_id);

COMMENT ON TABLE groups IS 'User groups for organizing communities';
COMMENT ON TABLE group_members IS 'Group membership with roles';
COMMENT ON TABLE group_invites IS 'Shareable invite links for groups';
COMMENT ON TABLE user_gamification IS 'User XP, levels, and statistics';
COMMENT ON TABLE achievements IS 'Achievement definitions';
COMMENT ON TABLE message_reactions IS 'Emoji reactions on messages';
COMMENT ON TABLE message_edits IS 'Message edit history';
COMMENT ON TABLE attachments IS 'File attachments (images, documents, etc.)';
COMMENT ON TABLE token_balances IS 'Cached token balances from blockchain';
COMMENT ON TABLE payment_requests IS 'Payment requests between users';
COMMENT ON TABLE user_rewards IS 'Claimable rewards for users';
COMMENT ON TABLE notification_preferences IS 'User notification settings';
COMMENT ON TABLE push_subscriptions IS 'Web push notification subscriptions';
COMMENT ON TABLE security_violations IS 'Security incident tracking';
COMMENT ON TABLE performance_metrics IS 'Application performance data';
COMMENT ON TABLE error_logs IS 'Error tracking and debugging';
COMMENT ON TABLE analytics_events IS 'User behavior analytics';
COMMENT ON TABLE sync_state IS 'Offline sync tracking';

-- VFIDE Database Schema for Testnet
-- PostgreSQL/Supabase Compatible
-- Created: January 9, 2026

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_address VARCHAR(42) UNIQUE NOT NULL,
    username VARCHAR(50) UNIQUE,
    display_name VARCHAR(100),
    bio TEXT,
    avatar_url TEXT,
    proof_score INTEGER DEFAULT 0,
    reputation_score INTEGER DEFAULT 0,
    is_council_member BOOLEAN DEFAULT false,
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_seen_at TIMESTAMP,
    
    -- Indexes
    CONSTRAINT wallet_address_format CHECK (wallet_address ~* '^0x[a-f0-9]{40}$')
);

CREATE INDEX idx_users_wallet ON users(wallet_address);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_proof_score ON users(proof_score DESC);
CREATE INDEX idx_users_council ON users(is_council_member) WHERE is_council_member = true;

-- Friends Table
CREATE TABLE IF NOT EXISTS friendships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    friend_id UUID REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending', -- pending, accepted, blocked
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(user_id, friend_id),
    CHECK (user_id != friend_id),
    CHECK (status IN ('pending', 'accepted', 'blocked'))
);

CREATE INDEX idx_friendships_user ON friendships(user_id, status);
CREATE INDEX idx_friendships_friend ON friendships(friend_id, status);

-- Messages Table (Chat)
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID REFERENCES users(id) ON DELETE SET NULL,
    recipient_id UUID REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text', -- text, image, file, system
    is_read BOOLEAN DEFAULT false,
    is_deleted BOOLEAN DEFAULT false,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CHECK (message_type IN ('text', 'image', 'file', 'system', 'proposal', 'endorsement'))
);

CREATE INDEX idx_messages_sender ON messages(sender_id, created_at DESC);
CREATE INDEX idx_messages_recipient ON messages(recipient_id, created_at DESC);
CREATE INDEX idx_messages_unread ON messages(recipient_id, is_read) WHERE is_read = false;
CREATE INDEX idx_messages_conversation ON messages(sender_id, recipient_id, created_at DESC);

-- Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- proposal_created, vote_cast, council_elected, message_received, etc.
    title VARCHAR(200) NOT NULL,
    message TEXT,
    link VARCHAR(500),
    is_read BOOLEAN DEFAULT false,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CHECK (type IN (
        'proposal_created', 'proposal_executed', 'proposal_defeated', 'proposal_queued',
        'vote_cast', 'delegation_received', 'delegation_changed',
        'council_elected', 'council_term_ended', 'endorsement_received',
        'message_received', 'friend_request_received', 'friend_request_accepted',
        'badge_earned', 'reward_received', 'payment_received', 'escrow_completed',
        'subscription_renewed', 'subscription_expired', 'system_announcement'
    ))
);

CREATE INDEX idx_notifications_user ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX idx_notifications_type ON notifications(type, created_at DESC);

-- Activity Feed Table
CREATE TABLE IF NOT EXISTS activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    activity_type VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CHECK (activity_type IN (
        'proposal_created', 'vote_cast', 'delegation_made',
        'council_elected', 'endorsement_given', 'endorsement_received',
        'badge_earned', 'payment_made', 'payment_received',
        'escrow_created', 'escrow_completed', 'subscription_started',
        'level_up', 'achievement_unlocked', 'post_created', 'comment_added'
    ))
);

CREATE INDEX idx_activities_user ON activities(user_id, created_at DESC);
CREATE INDEX idx_activities_type ON activities(activity_type, created_at DESC);
CREATE INDEX idx_activities_recent ON activities(created_at DESC);

-- Governance Proposals (Cached from blockchain)
CREATE TABLE IF NOT EXISTS proposals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    proposal_id INTEGER UNIQUE NOT NULL, -- On-chain proposal ID
    proposer_address VARCHAR(42) NOT NULL,
    proposer_id UUID REFERENCES users(id) ON DELETE SET NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'active',
    votes_for NUMERIC(78, 0) DEFAULT 0,
    votes_against NUMERIC(78, 0) DEFAULT 0,
    votes_abstain NUMERIC(78, 0) DEFAULT 0,
    start_block BIGINT,
    end_block BIGINT,
    eta TIMESTAMP,
    transaction_hash VARCHAR(66),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CHECK (status IN ('pending', 'active', 'canceled', 'defeated', 'succeeded', 'queued', 'expired', 'executed'))
);

CREATE INDEX idx_proposals_status ON proposals(status, created_at DESC);
CREATE INDEX idx_proposals_proposer ON proposals(proposer_address);
CREATE INDEX idx_proposals_id ON proposals(proposal_id);

-- Council Members (Cached from blockchain)
CREATE TABLE IF NOT EXISTS council_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_address VARCHAR(42) UNIQUE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    term_number INTEGER NOT NULL,
    votes_received NUMERIC(78, 0),
    election_date TIMESTAMP,
    term_start TIMESTAMP,
    term_end TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT wallet_address_format CHECK (wallet_address ~* '^0x[a-f0-9]{40}$')
);

CREATE INDEX idx_council_active ON council_members(is_active, term_number DESC) WHERE is_active = true;
CREATE INDEX idx_council_wallet ON council_members(wallet_address);
CREATE INDEX idx_council_term ON council_members(term_number DESC);

-- Endorsements
CREATE TABLE IF NOT EXISTS endorsements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    endorser_id UUID REFERENCES users(id) ON DELETE CASCADE,
    endorsed_id UUID REFERENCES users(id) ON DELETE CASCADE,
    skill VARCHAR(100) NOT NULL,
    message TEXT,
    proof_score_boost INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(endorser_id, endorsed_id, skill),
    CHECK (endorser_id != endorsed_id)
);

CREATE INDEX idx_endorsements_endorsed ON endorsements(endorsed_id, created_at DESC);
CREATE INDEX idx_endorsements_endorser ON endorsements(endorser_id, created_at DESC);
CREATE INDEX idx_endorsements_skill ON endorsements(skill);

-- Badges (Cached from blockchain)
CREATE TABLE IF NOT EXISTS badges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    badge_id INTEGER UNIQUE NOT NULL, -- On-chain badge ID
    name VARCHAR(100) NOT NULL,
    description TEXT,
    image_url TEXT,
    criteria TEXT,
    category VARCHAR(50),
    rarity VARCHAR(20),
    proof_score_value INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CHECK (rarity IN ('common', 'uncommon', 'rare', 'epic', 'legendary'))
);

CREATE INDEX idx_badges_category ON badges(category);
CREATE INDEX idx_badges_rarity ON badges(rarity);

-- User Badges (Cached from blockchain)
CREATE TABLE IF NOT EXISTS user_badges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    badge_id UUID REFERENCES badges(id) ON DELETE CASCADE,
    earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    transaction_hash VARCHAR(66),
    
    UNIQUE(user_id, badge_id)
);

CREATE INDEX idx_user_badges_user ON user_badges(user_id, earned_at DESC);
CREATE INDEX idx_user_badges_badge ON user_badges(badge_id);

-- Commerce Transactions (Cached from blockchain)
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_hash VARCHAR(66) UNIQUE NOT NULL,
    from_address VARCHAR(42) NOT NULL,
    to_address VARCHAR(42) NOT NULL,
    amount NUMERIC(78, 0) NOT NULL,
    token_address VARCHAR(42),
    transaction_type VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    metadata JSONB,
    block_number BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CHECK (status IN ('pending', 'completed', 'failed', 'cancelled'))
);

CREATE INDEX idx_transactions_hash ON transactions(transaction_hash);
CREATE INDEX idx_transactions_from ON transactions(from_address, created_at DESC);
CREATE INDEX idx_transactions_to ON transactions(to_address, created_at DESC);
CREATE INDEX idx_transactions_type ON transactions(transaction_type);

-- Escrow Records
CREATE TABLE IF NOT EXISTS escrows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    escrow_id INTEGER UNIQUE NOT NULL, -- On-chain escrow ID
    buyer_address VARCHAR(42) NOT NULL,
    seller_address VARCHAR(42) NOT NULL,
    amount NUMERIC(78, 0) NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    transaction_hash VARCHAR(66),
    
    CHECK (status IN ('active', 'completed', 'cancelled', 'disputed', 'released'))
);

CREATE INDEX idx_escrows_buyer ON escrows(buyer_address, status);
CREATE INDEX idx_escrows_seller ON escrows(seller_address, status);
CREATE INDEX idx_escrows_status ON escrows(status);

-- Update timestamp function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_friendships_updated_at BEFORE UPDATE ON friendships
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON messages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_proposals_updated_at BEFORE UPDATE ON proposals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Examples for Supabase
-- Uncomment and customize if using Supabase

-- Enable RLS
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Example RLS Policies
-- Users can read all profiles
-- CREATE POLICY "Users can view all profiles" ON users FOR SELECT USING (true);

-- Users can update their own profile
-- CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid()::text = id::text);

-- Users can read messages they sent or received
-- CREATE POLICY "Users can read own messages" ON messages FOR SELECT 
--     USING (auth.uid()::text IN (sender_id::text, recipient_id::text));

-- Users can insert messages they send
-- CREATE POLICY "Users can send messages" ON messages FOR INSERT 
--     WITH CHECK (auth.uid()::text = sender_id::text);

-- Seed Data for Testing (Optional)
-- INSERT INTO users (wallet_address, username, display_name, bio, proof_score) VALUES
-- ('0x5473c147f55Bc49544Af42FB1814bA823ecf1eED', 'deployer', 'Contract Deployer', 'Original deployer address', 1000),
-- ('0x1111111111111111111111111111111111111111', 'testuser1', 'Test User 1', 'First test user', 500),
-- ('0x2222222222222222222222222222222222222222', 'testuser2', 'Test User 2', 'Second test user', 300);

-- Views for common queries
CREATE OR REPLACE VIEW user_stats AS
SELECT 
    u.id,
    u.wallet_address,
    u.username,
    u.proof_score,
    COUNT(DISTINCT ub.badge_id) as badge_count,
    COUNT(DISTINCT CASE WHEN f.status = 'accepted' THEN f.friend_id END) as friend_count,
    COUNT(DISTINCT p.id) as proposal_count,
    COUNT(DISTINCT e.id) as endorsement_count
FROM users u
LEFT JOIN user_badges ub ON u.id = ub.user_id
LEFT JOIN friendships f ON u.id = f.user_id
LEFT JOIN proposals p ON u.wallet_address = p.proposer_address
LEFT JOIN endorsements e ON u.id = e.endorsed_id
GROUP BY u.id, u.wallet_address, u.username, u.proof_score;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_stats ON users(proof_score DESC, created_at DESC);

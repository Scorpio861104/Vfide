-- VFIDE Database Schema
-- Run this after creating your database

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  wallet_address VARCHAR(42) UNIQUE NOT NULL,
  username VARCHAR(50),
  avatar_url TEXT,
  bio TEXT,
  proof_score INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  sender_address VARCHAR(42) NOT NULL,
  recipient_address VARCHAR(42) NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Friends table
CREATE TABLE IF NOT EXISTS friends (
  id SERIAL PRIMARY KEY,
  user1_address VARCHAR(42) NOT NULL,
  user2_address VARCHAR(42) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user1_address, user2_address)
);

-- Groups table
CREATE TABLE IF NOT EXISTS groups (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  creator_id INTEGER REFERENCES users(id),
  member_count INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Group members table
CREATE TABLE IF NOT EXISTS group_members (
  id SERIAL PRIMARY KEY,
  group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) DEFAULT 'member',
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(group_id, user_id)
);

-- Group invites table
CREATE TABLE IF NOT EXISTS group_invites (
  id SERIAL PRIMARY KEY,
  group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE,
  code VARCHAR(12) UNIQUE NOT NULL,
  created_by INTEGER REFERENCES users(id),
  expires_at TIMESTAMP,
  max_uses INTEGER,
  current_uses INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  description TEXT,
  require_approval BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(200),
  message TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Badges table
CREATE TABLE IF NOT EXISTS badges (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  badge_type VARCHAR(50) NOT NULL,
  badge_name VARCHAR(100),
  earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Proposals table
CREATE TABLE IF NOT EXISTS proposals (
  id SERIAL PRIMARY KEY,
  proposal_id INTEGER UNIQUE NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  proposer_address VARCHAR(42) NOT NULL,
  status VARCHAR(20) DEFAULT 'active',
  votes_for BIGINT DEFAULT 0,
  votes_against BIGINT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ends_at TIMESTAMP
);

-- Attachments table
CREATE TABLE IF NOT EXISTS attachments (
  id SERIAL PRIMARY KEY,
  filename VARCHAR(255) NOT NULL,
  file_type VARCHAR(50),
  file_size INTEGER,
  url TEXT NOT NULL,
  uploaded_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User rewards table
CREATE TABLE IF NOT EXISTS user_rewards (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  amount DECIMAL(18, 6) NOT NULL,
  reason VARCHAR(100),
  status VARCHAR(20) DEFAULT 'pending',
  earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  claimed_at TIMESTAMP
);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  tx_hash VARCHAR(66) UNIQUE,
  type VARCHAR(50) NOT NULL,
  amount DECIMAL(18, 6),
  status VARCHAR(20) DEFAULT 'pending',
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Token balances table
CREATE TABLE IF NOT EXISTS token_balances (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  token_address VARCHAR(42) NOT NULL,
  balance DECIMAL(36, 18) DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, token_address)
);

-- Payment requests table
CREATE TABLE IF NOT EXISTS payment_requests (
  id SERIAL PRIMARY KEY,
  from_address VARCHAR(42) NOT NULL,
  to_address VARCHAR(42) NOT NULL,
  amount DECIMAL(18, 6) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  tx_hash VARCHAR(66),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Activities table
CREATE TABLE IF NOT EXISTS activities (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Endorsements table
CREATE TABLE IF NOT EXISTS endorsements (
  id SERIAL PRIMARY KEY,
  from_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  to_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  skill VARCHAR(100) NOT NULL,
  message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(from_user_id, to_user_id, skill)
);

-- Community Posts table
CREATE TABLE IF NOT EXISTS community_posts (
  id SERIAL PRIMARY KEY,
  author_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  media_urls TEXT[],
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  reposts INTEGER DEFAULT 0,
  tips DECIMAL(18, 6) DEFAULT 0,
  tags TEXT[],
  is_pinned BOOLEAN DEFAULT FALSE,
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Post Likes table
CREATE TABLE IF NOT EXISTS post_likes (
  id SERIAL PRIMARY KEY,
  post_id INTEGER REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(post_id, user_id)
);

-- Post Comments table
CREATE TABLE IF NOT EXISTS post_comments (
  id SERIAL PRIMARY KEY,
  post_id INTEGER REFERENCES community_posts(id) ON DELETE CASCADE,
  author_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  likes INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Stories table
CREATE TABLE IF NOT EXISTS stories (
  id SERIAL PRIMARY KEY,
  author_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  media_url TEXT NOT NULL,
  media_type VARCHAR(20) DEFAULT 'image',
  caption TEXT,
  view_count INTEGER DEFAULT 0,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Story Views table
CREATE TABLE IF NOT EXISTS story_views (
  id SERIAL PRIMARY KEY,
  story_id INTEGER REFERENCES stories(id) ON DELETE CASCADE,
  viewer_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(story_id, viewer_id)
);

-- Trending Topics table
CREATE TABLE IF NOT EXISTS trending_topics (
  id SERIAL PRIMARY KEY,
  tag VARCHAR(100) UNIQUE NOT NULL,
  post_count INTEGER DEFAULT 0,
  engagement_score INTEGER DEFAULT 0,
  is_promoted BOOLEAN DEFAULT FALSE,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Enterprise Orders table
CREATE TABLE IF NOT EXISTS enterprise_orders (
  id SERIAL PRIMARY KEY,
  order_id VARCHAR(50) UNIQUE NOT NULL,
  merchant_id INTEGER REFERENCES users(id),
  merchant_name VARCHAR(100),
  customer_id INTEGER REFERENCES users(id),
  customer_email VARCHAR(255),
  amount DECIMAL(18, 6) NOT NULL,
  currency VARCHAR(10) DEFAULT 'VFIDE',
  fiat_amount DECIMAL(18, 2),
  fiat_currency VARCHAR(3),
  status VARCHAR(20) DEFAULT 'pending',
  payment_method VARCHAR(20) DEFAULT 'crypto',
  tx_hash VARCHAR(66),
  metadata JSONB,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP
);

-- Subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id SERIAL PRIMARY KEY,
  subscription_id VARCHAR(50) UNIQUE NOT NULL,
  subscriber_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  merchant_id INTEGER REFERENCES users(id),
  amount DECIMAL(18, 6) NOT NULL,
  currency VARCHAR(10) DEFAULT 'VFIDE',
  interval_seconds INTEGER NOT NULL,
  max_payments INTEGER,
  payments_made INTEGER DEFAULT 0,
  total_paid DECIMAL(18, 6) DEFAULT 0,
  next_payment_at TIMESTAMP,
  status VARCHAR(20) DEFAULT 'active',
  is_paused BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  cancelled_at TIMESTAMP
);

-- Streaming Payments table
CREATE TABLE IF NOT EXISTS streaming_payments (
  id SERIAL PRIMARY KEY,
  stream_id VARCHAR(50) UNIQUE NOT NULL,
  payer_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  payee_id INTEGER REFERENCES users(id),
  token_address VARCHAR(42),
  rate_per_second DECIMAL(36, 18) NOT NULL,
  deposit_balance DECIMAL(36, 18) DEFAULT 0,
  withdrawn_amount DECIMAL(36, 18) DEFAULT 0,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  is_paused BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Escrow Transactions table
CREATE TABLE IF NOT EXISTS escrow_transactions (
  id SERIAL PRIMARY KEY,
  escrow_id VARCHAR(50) UNIQUE NOT NULL,
  buyer_id INTEGER REFERENCES users(id),
  seller_id INTEGER REFERENCES users(id),
  arbiter_id INTEGER REFERENCES users(id),
  amount DECIMAL(18, 6) NOT NULL,
  token_address VARCHAR(42),
  status VARCHAR(20) DEFAULT 'pending',
  description TEXT,
  tx_hash VARCHAR(66),
  release_condition TEXT,
  auto_release_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP
);

-- Create indexes for new tables
CREATE INDEX IF NOT EXISTS idx_posts_author ON community_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_created ON community_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stories_author ON stories(author_id);
CREATE INDEX IF NOT EXISTS idx_stories_expires ON stories(expires_at);
CREATE INDEX IF NOT EXISTS idx_orders_merchant ON enterprise_orders(merchant_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON enterprise_orders(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_subscriber ON subscriptions(subscriber_id);
CREATE INDEX IF NOT EXISTS idx_streams_payer ON streaming_payments(payer_id);
CREATE INDEX IF NOT EXISTS idx_escrow_buyer ON escrow_transactions(buyer_id);
CREATE INDEX IF NOT EXISTS idx_escrow_seller ON escrow_transactions(seller_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_wallet ON users(wallet_address);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_address);
CREATE INDEX IF NOT EXISTS idx_messages_recipient ON messages(recipient_address);
CREATE INDEX IF NOT EXISTS idx_friends_user1 ON friends(user1_address);
CREATE INDEX IF NOT EXISTS idx_friends_user2 ON friends(user2_address);
CREATE INDEX IF NOT EXISTS idx_group_members_group ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user ON group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status);
CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);

-- ===== SCHEMA MIGRATIONS =====
-- Add missing columns to existing tables (safe to run multiple times)

-- Users table: Add is_verified column
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS follower_count INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS following_count INTEGER DEFAULT 0;

-- User badges junction table (normalized badges)
CREATE TABLE IF NOT EXISTS user_badges (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  badge_id INTEGER REFERENCES badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, badge_id)
);

-- Friends table migration: Add user_id/friend_id structure
-- First, create new friends structure if not exists
DO $$
BEGIN
  -- Add new columns if they don't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'friends' AND column_name = 'user_id') THEN
    ALTER TABLE friends ADD COLUMN user_id INTEGER;
    ALTER TABLE friends ADD COLUMN friend_id INTEGER;
    
    -- Add foreign keys
    ALTER TABLE friends ADD CONSTRAINT fk_friends_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
    ALTER TABLE friends ADD CONSTRAINT fk_friends_friend FOREIGN KEY (friend_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create index for friends lookup
CREATE INDEX IF NOT EXISTS idx_friends_user_id ON friends(user_id);
CREATE INDEX IF NOT EXISTS idx_friends_friend_id ON friends(friend_id);
CREATE INDEX IF NOT EXISTS idx_friends_status ON friends(status);

-- Update badges table to be standalone (for badge definitions)
ALTER TABLE badges ADD COLUMN IF NOT EXISTS name VARCHAR(100);
ALTER TABLE badges ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE badges ADD COLUMN IF NOT EXISTS icon_url TEXT;
ALTER TABLE badges ADD COLUMN IF NOT EXISTS category VARCHAR(50);
ALTER TABLE badges ADD COLUMN IF NOT EXISTS rarity VARCHAR(20) DEFAULT 'common';

-- Index for user badges
CREATE INDEX IF NOT EXISTS idx_user_badges_user ON user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_badge ON user_badges(badge_id);

-- Stories reactions columns
ALTER TABLE stories ADD COLUMN IF NOT EXISTS reactions_fire INTEGER DEFAULT 0;
ALTER TABLE stories ADD COLUMN IF NOT EXISTS reactions_heart INTEGER DEFAULT 0;
ALTER TABLE stories ADD COLUMN IF NOT EXISTS reactions_rocket INTEGER DEFAULT 0;
ALTER TABLE stories ADD COLUMN IF NOT EXISTS reactions_clap INTEGER DEFAULT 0;

-- Seed default badges for the platform
INSERT INTO badges (badge_type, badge_name, name, description, category, rarity) VALUES
  ('pioneer', 'Pioneer', 'Pioneer', 'Early adopter of VFIDE platform', 'achievement', 'rare'),
  ('trusted_endorser', 'Trusted Endorser', 'Trusted Endorser', 'Endorsed 10+ quality users', 'social', 'uncommon'),
  ('governance_voter', 'Governance Voter', 'Governance Voter', 'Participated in DAO governance', 'governance', 'common'),
  ('council_member', 'Council Member', 'Council Member', 'Elected to VFIDE Council', 'governance', 'legendary'),
  ('verified_merchant', 'Verified Merchant', 'Verified Merchant', 'Verified merchant account', 'commerce', 'rare'),
  ('active_trader', 'Active Trader', 'Active Trader', 'Completed 50+ transactions', 'commerce', 'uncommon'),
  ('daily_champion', 'Daily Champion', 'Daily Champion', '7-day login streak', 'engagement', 'common'),
  ('power_user', 'Power User', 'Power User', 'High activity score', 'engagement', 'uncommon'),
  ('community_builder', 'Community Builder', 'Community Builder', 'Helped grow the community', 'social', 'rare'),
  ('badge_hunter', 'Badge Hunter', 'Badge Hunter', 'Collected 10+ badges', 'achievement', 'uncommon'),
  ('streak_master', 'Streak Master', 'Streak Master', '30-day activity streak', 'engagement', 'rare'),
  ('headhunter_elite', 'Headhunter Elite', 'Headhunter Elite', 'Referred 25+ verified users', 'social', 'epic'),
  ('philanthropist', 'Philanthropist', 'Philanthropist', 'Contributed to Sanctum charity', 'social', 'rare')
ON CONFLICT DO NOTHING;


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

-- Analytics events table
CREATE TABLE IF NOT EXISTS analytics_events (
  id SERIAL PRIMARY KEY,
  event_type VARCHAR(100) NOT NULL,
  user_id VARCHAR(42),
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Social posts table
CREATE TABLE IF NOT EXISTS social_posts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  media_url TEXT,
  media_type VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Post likes table
CREATE TABLE IF NOT EXISTS post_likes (
  id SERIAL PRIMARY KEY,
  post_id INTEGER REFERENCES social_posts(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(post_id, user_id)
);

-- Post comments table
CREATE TABLE IF NOT EXISTS post_comments (
  id SERIAL PRIMARY KEY,
  post_id INTEGER REFERENCES social_posts(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Social stories table (24-hour temporary posts)
CREATE TABLE IF NOT EXISTS social_stories (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  media_url TEXT NOT NULL,
  media_type VARCHAR(20) NOT NULL,
  caption TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL
);

-- Story views table
CREATE TABLE IF NOT EXISTS story_views (
  id SERIAL PRIMARY KEY,
  story_id INTEGER REFERENCES social_stories(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(story_id, user_id)
);

-- Merchants table
CREATE TABLE IF NOT EXISTS merchants (
  id SERIAL PRIMARY KEY,
  user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  business_name VARCHAR(100) NOT NULL,
  business_type VARCHAR(50) NOT NULL,
  business_description TEXT NOT NULL,
  website_url VARCHAR(200),
  contact_email VARCHAR(100) NOT NULL,
  contact_phone VARCHAR(20),
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Merchant KYC table
CREATE TABLE IF NOT EXISTS merchant_kyc (
  id SERIAL PRIMARY KEY,
  merchant_id INTEGER UNIQUE REFERENCES merchants(id) ON DELETE CASCADE,
  document_type VARCHAR(50) NOT NULL,
  document_number VARCHAR(50) NOT NULL,
  document_front_url VARCHAR(500) NOT NULL,
  document_back_url VARCHAR(500),
  selfie_url VARCHAR(500) NOT NULL,
  additional_info TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  submitted_at TIMESTAMP,
  verified_at TIMESTAMP,
  verified_by INTEGER REFERENCES users(id),
  rejection_reason TEXT
);

-- Merchant transactions table
CREATE TABLE IF NOT EXISTS merchant_transactions (
  id SERIAL PRIMARY KEY,
  merchant_id INTEGER REFERENCES merchants(id) ON DELETE CASCADE,
  customer_id INTEGER REFERENCES users(id),
  amount DECIMAL(20, 8) NOT NULL,
  currency VARCHAR(10) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  transaction_hash VARCHAR(66),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP
);

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
CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created ON analytics_events(created_at);
CREATE INDEX IF NOT EXISTS idx_social_posts_user ON social_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_social_posts_created ON social_posts(created_at);
CREATE INDEX IF NOT EXISTS idx_post_likes_post ON post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_post ON post_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_social_stories_user ON social_stories(user_id);
CREATE INDEX IF NOT EXISTS idx_social_stories_expires ON social_stories(expires_at);
CREATE INDEX IF NOT EXISTS idx_story_views_story ON story_views(story_id);
CREATE INDEX IF NOT EXISTS idx_merchants_user ON merchants(user_id);
CREATE INDEX IF NOT EXISTS idx_merchants_status ON merchants(status);
CREATE INDEX IF NOT EXISTS idx_merchant_kyc_merchant ON merchant_kyc(merchant_id);
CREATE INDEX IF NOT EXISTS idx_merchant_kyc_status ON merchant_kyc(status);
CREATE INDEX IF NOT EXISTS idx_merchant_transactions_merchant ON merchant_transactions(merchant_id);
CREATE INDEX IF NOT EXISTS idx_merchant_transactions_customer ON merchant_transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_merchant_transactions_status ON merchant_transactions(status);

-- ============================================
-- VAULT & WALLET INFRASTRUCTURE TABLES
-- ============================================

-- Vault registry for quick lookups
CREATE TABLE IF NOT EXISTS vaults (
  id SERIAL PRIMARY KEY,
  vault_address VARCHAR(42) UNIQUE NOT NULL,
  owner_address VARCHAR(42) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  guardian_count INTEGER DEFAULT 0,
  has_next_of_kin BOOLEAN DEFAULT FALSE,
  next_of_kin_address VARCHAR(42),
  is_locked BOOLEAN DEFAULT FALSE,
  last_activity_at TIMESTAMP,
  CONSTRAINT idx_vaults_owner UNIQUE (owner_address)
);

-- Guardian tracking
CREATE TABLE IF NOT EXISTS vault_guardians (
  id SERIAL PRIMARY KEY,
  vault_address VARCHAR(42) NOT NULL,
  guardian_address VARCHAR(42) NOT NULL,
  added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_mature BOOLEAN DEFAULT FALSE,
  maturity_date TIMESTAMP,
  removed_at TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  CONSTRAINT unique_vault_guardian UNIQUE (vault_address, guardian_address)
);

-- Recovery events
CREATE TABLE IF NOT EXISTS vault_recovery_events (
  id SERIAL PRIMARY KEY,
  vault_address VARCHAR(42) NOT NULL,
  event_type VARCHAR(50) NOT NULL, -- 'initiated', 'approved', 'denied', 'cancelled', 'completed'
  proposed_owner VARCHAR(42),
  guardian_address VARCHAR(42), -- Guardian who took action
  approval_count INTEGER,
  expiry_timestamp BIGINT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  transaction_hash VARCHAR(66)
);

-- Inheritance events
CREATE TABLE IF NOT EXISTS vault_inheritance_events (
  id SERIAL PRIMARY KEY,
  vault_address VARCHAR(42) NOT NULL,
  event_type VARCHAR(50) NOT NULL, -- 'nok_set', 'nok_removed', 'claim_initiated', 'approved', 'denied', 'completed'
  next_of_kin_address VARCHAR(42),
  claimant_address VARCHAR(42),
  guardian_address VARCHAR(42), -- Guardian who took action
  approval_count INTEGER,
  denial_count INTEGER,
  expiry_timestamp BIGINT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  transaction_hash VARCHAR(66)
);

-- Vault transactions (deposits, withdrawals, transfers from vault)
CREATE TABLE IF NOT EXISTS vault_transactions (
  id SERIAL PRIMARY KEY,
  vault_address VARCHAR(42) NOT NULL,
  transaction_type VARCHAR(50) NOT NULL, -- 'deposit', 'withdrawal', 'transfer_in', 'transfer_out'
  token_address VARCHAR(42) NOT NULL,
  amount DECIMAL(36, 18) NOT NULL,
  from_address VARCHAR(42),
  to_address VARCHAR(42),
  transaction_hash VARCHAR(66) UNIQUE NOT NULL,
  block_number BIGINT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Vault security events
CREATE TABLE IF NOT EXISTS vault_security_events (
  id SERIAL PRIMARY KEY,
  vault_address VARCHAR(42) NOT NULL,
  event_type VARCHAR(50) NOT NULL, -- 'locked', 'unlocked', 'panic', 'suspicious_activity'
  triggered_by VARCHAR(42), -- Address that triggered event
  details JSONB,
  severity VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP
);

-- Vault notifications
CREATE TABLE IF NOT EXISTS vault_notifications (
  id SERIAL PRIMARY KEY,
  vault_address VARCHAR(42) NOT NULL,
  user_address VARCHAR(42) NOT NULL, -- Who should receive notification
  notification_type VARCHAR(50) NOT NULL, -- 'guardian_approval_needed', 'recovery_initiated', etc.
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  action_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  read_at TIMESTAMP
);

-- Vault indexes for performance
CREATE INDEX IF NOT EXISTS idx_vaults_vault_address ON vaults(vault_address);
CREATE INDEX IF NOT EXISTS idx_vaults_owner_address ON vaults(owner_address);
CREATE INDEX IF NOT EXISTS idx_vault_guardians_vault ON vault_guardians(vault_address);
CREATE INDEX IF NOT EXISTS idx_vault_guardians_guardian ON vault_guardians(guardian_address);
CREATE INDEX IF NOT EXISTS idx_recovery_vault ON vault_recovery_events(vault_address);
CREATE INDEX IF NOT EXISTS idx_recovery_created ON vault_recovery_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inheritance_vault ON vault_inheritance_events(vault_address);
CREATE INDEX IF NOT EXISTS idx_inheritance_created ON vault_inheritance_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vault_tx_vault ON vault_transactions(vault_address);
CREATE INDEX IF NOT EXISTS idx_vault_tx_created ON vault_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vault_tx_hash ON vault_transactions(transaction_hash);
CREATE INDEX IF NOT EXISTS idx_security_vault ON vault_security_events(vault_address);
CREATE INDEX IF NOT EXISTS idx_security_created ON vault_security_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_severity ON vault_security_events(severity);
CREATE INDEX IF NOT EXISTS idx_vault_notif_user ON vault_notifications(user_address, is_read);
CREATE INDEX IF NOT EXISTS idx_vault_notif_vault ON vault_notifications(vault_address);
CREATE INDEX IF NOT EXISTS idx_vault_notif_created ON vault_notifications(created_at DESC);

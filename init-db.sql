-- VFIDE Database Schema
-- Run this after creating your database

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  wallet_address VARCHAR(42) UNIQUE NOT NULL,
  username VARCHAR(50),
  display_name VARCHAR(100),
  email VARCHAR(255),
  avatar_url TEXT,
  bio TEXT,
  location VARCHAR(100),
  website TEXT,
  twitter VARCHAR(100),
  github VARCHAR(100),
  proof_score INTEGER DEFAULT 0,
  reputation_score INTEGER DEFAULT 0,
  is_council_member BOOLEAN DEFAULT FALSE,
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  recipient_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_encrypted BOOLEAN DEFAULT TRUE,
  is_read BOOLEAN DEFAULT FALSE,
  is_deleted BOOLEAN DEFAULT FALSE,
  edited_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Message edit history table
CREATE TABLE IF NOT EXISTS message_edits (
  id SERIAL PRIMARY KEY,
  message_id INTEGER REFERENCES messages(id) ON DELETE CASCADE,
  original_content TEXT NOT NULL,
  edited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Friendships table (used by API)
CREATE TABLE IF NOT EXISTS friendships (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  friend_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, friend_id)
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
  custom_permissions JSONB DEFAULT '[]'::jsonb,
  banned_permissions JSONB DEFAULT '[]'::jsonb,
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
  archived BOOLEAN DEFAULT FALSE,
  data JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Push subscriptions table
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  keys JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, endpoint)
);

-- Push notification preferences
CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  preferences JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Notification hub preferences
CREATE TABLE IF NOT EXISTS notification_hub_preferences (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  preferences JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User privacy settings
CREATE TABLE IF NOT EXISTS user_privacy_settings (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  settings JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Badges table
CREATE TABLE IF NOT EXISTS badges (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  icon TEXT,
  rarity VARCHAR(20),
  requirements JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User badges table
CREATE TABLE IF NOT EXISTS user_badges (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  badge_id INTEGER REFERENCES badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, badge_id)
);

-- Proposals table
CREATE TABLE IF NOT EXISTS proposals (
  id SERIAL PRIMARY KEY,
  proposal_id INTEGER UNIQUE NOT NULL,
  proposer_id INTEGER REFERENCES users(id),
  title VARCHAR(200) NOT NULL,
  description TEXT,
  proposer_address VARCHAR(42),
  status VARCHAR(20) DEFAULT 'active',
  votes_for BIGINT DEFAULT 0,
  votes_against BIGINT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  voting_ends_at TIMESTAMP,
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
  amount DECIMAL(18, 6) NOT NULL CHECK (amount > 0),
  reward_type VARCHAR(50),
  source_contract VARCHAR(42),
  onchain_reward_id BIGINT,
  reason VARCHAR(100),
  status VARCHAR(20) DEFAULT 'pending',
  earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  claimed_at TIMESTAMP
);

-- Daily rewards tracking
CREATE TABLE IF NOT EXISTS user_daily_rewards (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  last_claim_at TIMESTAMP,
  streak INTEGER DEFAULT 0,
  total_claims INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Onboarding checklist progress
CREATE TABLE IF NOT EXISTS onboarding_progress (
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  item_id VARCHAR(100) NOT NULL,
  completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, item_id)
);

-- Time locks table
CREATE TABLE IF NOT EXISTS time_locks (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(20) NOT NULL,
  recipient_address VARCHAR(42) NOT NULL,
  amount DECIMAL(18, 6) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  unlock_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Streams table
CREATE TABLE IF NOT EXISTS streams (
  id SERIAL PRIMARY KEY,
  sender_address VARCHAR(42) NOT NULL,
  recipient_address VARCHAR(42) NOT NULL,
  token VARCHAR(20) NOT NULL,
  total_amount DECIMAL(18, 6) NOT NULL,
  rate_per_second DECIMAL(30, 18) NOT NULL,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  withdrawn DECIMAL(18, 6) DEFAULT 0,
  is_paused BOOLEAN DEFAULT FALSE,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Enterprise orders table
CREATE TABLE IF NOT EXISTS enterprise_orders (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  order_id VARCHAR(100) NOT NULL,
  amount DECIMAL(18, 6) NOT NULL,
  metadata JSONB,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  merchant_address VARCHAR(42) NOT NULL,
  merchant_name VARCHAR(100),
  amount DECIMAL(18, 6) NOT NULL,
  frequency VARCHAR(20) NOT NULL,
  next_payment TIMESTAMP NOT NULL,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User presence table
CREATE TABLE IF NOT EXISTS user_presence (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL,
  last_seen_at TIMESTAMP NOT NULL,
  last_activity_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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

-- Analytics events table
CREATE TABLE IF NOT EXISTS analytics_events (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(42),
  event_type VARCHAR(50) NOT NULL,
  event_data JSONB,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Performance metrics table
CREATE TABLE IF NOT EXISTS performance_metrics (
  id SERIAL PRIMARY KEY,
  metric_name VARCHAR(100) NOT NULL,
  value DECIMAL(18, 6) NOT NULL,
  metadata JSONB,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Security violations table
CREATE TABLE IF NOT EXISTS security_violations (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  violation_type VARCHAR(50) NOT NULL,
  severity VARCHAR(20) NOT NULL,
  description TEXT,
  ip_address VARCHAR(64),
  details JSONB,
  detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Two-factor codes (SMS/email verification)
CREATE TABLE IF NOT EXISTS two_factor_codes (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  method VARCHAR(20) NOT NULL,
  destination TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  attempts INTEGER DEFAULT 0,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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

-- Vault identity lookup table (off-chain recovery)
CREATE TABLE IF NOT EXISTS vault_identities (
  id SERIAL PRIMARY KEY,
  vault_address VARCHAR(42) UNIQUE NOT NULL,
  recovery_id_hash VARCHAR(66),
  email_hash VARCHAR(66),
  username_hash VARCHAR(66),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_vault_identities_recovery ON vault_identities(recovery_id_hash);
CREATE INDEX IF NOT EXISTS idx_vault_identities_email ON vault_identities(email_hash);
CREATE INDEX IF NOT EXISTS idx_vault_identities_username ON vault_identities(username_hash);

-- Payment requests table
CREATE TABLE IF NOT EXISTS payment_requests (
  id SERIAL PRIMARY KEY,
  from_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  to_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  from_address VARCHAR(42) NOT NULL,
  to_address VARCHAR(42) NOT NULL,
  amount DECIMAL(18, 6) NOT NULL,
  token VARCHAR(20) DEFAULT 'ETH',
  memo TEXT,
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
  activity_type VARCHAR(50),
  title TEXT,
  description TEXT,
  metadata JSONB,
  data JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Message reports table
CREATE TABLE IF NOT EXISTS message_reports (
  id SERIAL PRIMARY KEY,
  message_id VARCHAR(100) NOT NULL,
  reporter_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Error logs table
CREATE TABLE IF NOT EXISTS error_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  severity VARCHAR(20) DEFAULT 'error',
  message TEXT NOT NULL,
  stack TEXT,
  metadata JSONB,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Endorsements table
CREATE TABLE IF NOT EXISTS endorsements (
  id SERIAL PRIMARY KEY,
  endorser_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  endorsed_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  proposal_id INTEGER REFERENCES proposals(id) ON DELETE SET NULL,
  message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(endorser_id, endorsed_id)
);

-- Achievements table (gamification)
CREATE TABLE IF NOT EXISTS achievements (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  icon TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User gamification stats
CREATE TABLE IF NOT EXISTS user_gamification (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  xp INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  streak INTEGER DEFAULT 0,
  last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User achievements (join table)
CREATE TABLE IF NOT EXISTS user_achievements (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  achievement_id INTEGER REFERENCES achievements(id) ON DELETE CASCADE,
  earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, achievement_id)
);

-- Daily quests
CREATE TABLE IF NOT EXISTS daily_quests (
  id SERIAL PRIMARY KEY,
  quest_key VARCHAR(100) UNIQUE NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  category VARCHAR(50),
  difficulty VARCHAR(20),
  target_value INTEGER DEFAULT 1,
  reward_xp INTEGER DEFAULT 0,
  reward_vfide DECIMAL(18, 6) DEFAULT 0,
  icon TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User quest progress (per-day tracking)
CREATE TABLE IF NOT EXISTS user_quest_progress (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  quest_id INTEGER REFERENCES daily_quests(id) ON DELETE CASCADE,
  quest_date DATE NOT NULL DEFAULT CURRENT_DATE,
  progress INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT FALSE,
  claimed BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, quest_id, quest_date)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_wallet ON users(wallet_address);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient ON messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_friendships_user ON friendships(user_id);
CREATE INDEX IF NOT EXISTS idx_friendships_friend ON friendships(friend_id);
CREATE INDEX IF NOT EXISTS idx_group_members_group ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user ON group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status);
CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_hash ON transactions(tx_hash);
CREATE INDEX IF NOT EXISTS idx_user_rewards_user ON user_rewards(user_id);
CREATE INDEX IF NOT EXISTS idx_user_rewards_status ON user_rewards(user_id, status);
CREATE INDEX IF NOT EXISTS idx_activities_user ON activities(user_id);
CREATE INDEX IF NOT EXISTS idx_activities_created ON activities(created_at);
CREATE INDEX IF NOT EXISTS idx_payment_requests_to ON payment_requests(to_address);
CREATE INDEX IF NOT EXISTS idx_payment_requests_from ON payment_requests(from_address);
CREATE INDEX IF NOT EXISTS idx_security_violations_type ON security_violations(violation_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_time ON analytics_events(timestamp);

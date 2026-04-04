-- VFIDE Database Schema
-- Run this after creating your database
--
-- DEPRECATED:
-- This bootstrap file is retained for local legacy compatibility only.
-- The authoritative schema is in /migrations and should be applied via migrations.
-- Running this file directly can create an incompatible messages schema.

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

-- Messages table (aligned with migrations schema — uses user IDs, not raw addresses)
CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  recipient_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_encrypted BOOLEAN DEFAULT FALSE,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Friendships table (aligned with migrations schema — uses user IDs, not raw addresses)
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
  icon VARCHAR(32),
  color VARCHAR(7),
  creator_id INTEGER REFERENCES users(id),
  member_count INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ensure older databases also have visual metadata columns
ALTER TABLE groups ADD COLUMN IF NOT EXISTS icon VARCHAR(32);
ALTER TABLE groups ADD COLUMN IF NOT EXISTS color VARCHAR(7);

-- Group members table
CREATE TABLE IF NOT EXISTS group_members (
  id SERIAL PRIMARY KEY,
  group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) DEFAULT 'member',
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(group_id, user_id)
);

-- Group messages table
CREATE TABLE IF NOT EXISTS group_messages (
  id SERIAL PRIMARY KEY,
  group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE,
  sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_encrypted BOOLEAN DEFAULT TRUE,
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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

-- Merchant withdrawal requests table
CREATE TABLE IF NOT EXISTS merchant_withdrawals (
  id BIGSERIAL PRIMARY KEY,
  merchant_address VARCHAR(42) NOT NULL,
  amount DECIMAL(36, 18) NOT NULL,
  token VARCHAR(20) NOT NULL,
  provider VARCHAR(40) NOT NULL,
  mobile_number_hint VARCHAR(16),
  network VARCHAR(40) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  provider_tx_id VARCHAR(80),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_merchant_withdrawals_merchant_created
  ON merchant_withdrawals (merchant_address, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_merchant_withdrawals_status
  ON merchant_withdrawals (status);

-- Remittance beneficiaries table
CREATE TABLE IF NOT EXISTS remittance_beneficiaries (
  id BIGSERIAL PRIMARY KEY,
  owner_address VARCHAR(42) NOT NULL,
  label VARCHAR(80),
  name VARCHAR(120) NOT NULL,
  phone VARCHAR(32) NOT NULL,
  network VARCHAR(32) NOT NULL,
  account_number VARCHAR(64),
  wallet_address VARCHAR(42),
  country VARCHAR(2) NOT NULL,
  relationship VARCHAR(40) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_remittance_beneficiaries_owner_created
  ON remittance_beneficiaries (owner_address, created_at DESC);

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

-- Security account protection tables
CREATE TABLE IF NOT EXISTS security_account_events (
  id BIGSERIAL PRIMARY KEY,
  address TEXT NOT NULL,
  ts TIMESTAMPTZ NOT NULL,
  ip TEXT NOT NULL,
  type TEXT NOT NULL,
  amount NUMERIC,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS security_account_locks (
  address TEXT PRIMARY KEY,
  until_ts TIMESTAMPTZ NOT NULL,
  reason TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS security_event_logs (
  id BIGSERIAL PRIMARY KEY,
  address TEXT NOT NULL,
  ts TIMESTAMPTZ NOT NULL,
  type TEXT NOT NULL,
  severity TEXT NOT NULL,
  message TEXT NOT NULL,
  details JSONB,
  user_agent TEXT,
  location TEXT,
  device_id TEXT,
  ip_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS security_alert_dispatches (
  dedup_key TEXT PRIMARY KEY,
  last_sent_at TIMESTAMPTZ NOT NULL,
  suppressed_count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS security_webhook_replay_events (
  id BIGSERIAL PRIMARY KEY,
  ts TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status TEXT NOT NULL,
  reason TEXT,
  source TEXT,
  replay_key_hash TEXT,
  event_timestamp BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_wallet ON users(wallet_address);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient ON messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_recipient_created_at ON messages(sender_id, recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_friendships_user ON friendships(user_id);
CREATE INDEX IF NOT EXISTS idx_friendships_friend ON friendships(friend_id);
CREATE INDEX IF NOT EXISTS idx_group_members_group ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user ON group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_messages_group ON group_messages(group_id);
CREATE INDEX IF NOT EXISTS idx_group_messages_sender ON group_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_group_messages_group_sender_created_at ON group_messages(group_id, sender_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status);
CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_security_account_events_address_ts ON security_account_events(address, ts DESC);
CREATE INDEX IF NOT EXISTS idx_security_account_locks_until_ts ON security_account_locks(until_ts DESC);
CREATE INDEX IF NOT EXISTS idx_security_event_logs_address_ts ON security_event_logs(address, ts DESC);
CREATE INDEX IF NOT EXISTS idx_security_alert_dispatches_last_sent_at ON security_alert_dispatches(last_sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_webhook_replay_events_ts ON security_webhook_replay_events(ts DESC);
CREATE INDEX IF NOT EXISTS idx_security_webhook_replay_events_status_ts ON security_webhook_replay_events(status, ts DESC);

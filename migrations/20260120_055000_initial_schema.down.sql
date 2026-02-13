-- Rollback: Initial Schema
-- Created: 2026-01-20T05:50:00.000Z
-- 
-- Drops all tables created in initial schema migration

-- Drop indexes first
DROP INDEX IF EXISTS idx_transactions_user;
DROP INDEX IF EXISTS idx_proposals_status;
DROP INDEX IF NOT EXISTS idx_notifications_user;
DROP INDEX IF EXISTS idx_group_members_user;
DROP INDEX IF EXISTS idx_group_members_group;
DROP INDEX IF EXISTS idx_friendships_friend;
DROP INDEX IF EXISTS idx_friendships_user;
DROP INDEX IF EXISTS idx_messages_recipient;
DROP INDEX IF EXISTS idx_messages_sender;
DROP INDEX IF EXISTS idx_users_wallet;

-- Drop tables (in reverse order of dependencies)
DROP TABLE IF EXISTS endorsements;
DROP TABLE IF EXISTS activities;
DROP TABLE IF EXISTS payment_requests;
DROP TABLE IF EXISTS token_balances;
DROP TABLE IF EXISTS transactions;
DROP TABLE IF EXISTS user_rewards;
DROP TABLE IF EXISTS attachments;
DROP TABLE IF EXISTS proposals;
DROP TABLE IF EXISTS badges;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS group_invites;
DROP TABLE IF EXISTS group_members;
DROP TABLE IF EXISTS groups;
DROP TABLE IF EXISTS friendships;
DROP TABLE IF EXISTS messages;
DROP TABLE IF EXISTS users;

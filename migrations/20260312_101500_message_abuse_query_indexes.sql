-- Migration: message_abuse_query_indexes
-- Created: 2026-03-12
-- Purpose: Add composite indexes that match anti-abuse sender burst and replay-window queries.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'sender_id'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'recipient_id'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'created_at'
  ) THEN
    EXECUTE 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_sender_recipient_created_at ON messages (sender_id, recipient_id, created_at DESC)';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'group_messages' AND column_name = 'group_id'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'group_messages' AND column_name = 'sender_id'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'group_messages' AND column_name = 'created_at'
  ) THEN
    EXECUTE 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_group_messages_group_sender_created_at ON group_messages (group_id, sender_id, created_at DESC)';
  END IF;
END
$$;

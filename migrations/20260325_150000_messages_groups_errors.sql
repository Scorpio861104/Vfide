-- Migration: message reactions, edits, group messages, and error logs
-- Created: 2026-03-25T15:00:00.000Z

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- Extend messages table with soft-delete and edit-tracking columns
-- (table already exists from initial_schema migration)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS is_deleted      BOOLEAN     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS edited_at       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS conversation_id INTEGER;

-- ─────────────────────────────────────────────────────────────────────────────
-- message_reactions: per-message emoji / custom-image reactions
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS message_reactions (
  id            SERIAL       PRIMARY KEY,
  message_id    INTEGER      NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id       INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reaction_type VARCHAR(20)  NOT NULL DEFAULT 'emoji'
                             CHECK (reaction_type IN ('emoji','custom_image')),
  emoji         VARCHAR(16),
  image_url     VARCHAR(2048),
  image_name    VARCHAR(120),
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  -- Prevent the same user from adding the same reaction twice on a message
  CONSTRAINT uq_message_reactions_emoji
    UNIQUE (message_id, user_id, reaction_type, emoji),
  CONSTRAINT uq_message_reactions_image
    UNIQUE (message_id, user_id, reaction_type, image_url)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- message_edits: audit trail for edited messages
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS message_edits (
  id               SERIAL       PRIMARY KEY,
  message_id       INTEGER      NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  original_content TEXT         NOT NULL,
  edited_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- group_messages: encrypted group chat messages
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS group_messages (
  id            SERIAL       PRIMARY KEY,
  group_id      INTEGER      NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  sender_id     INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content       TEXT         NOT NULL,
  is_encrypted  BOOLEAN      NOT NULL DEFAULT false,
  is_deleted    BOOLEAN      NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- error_logs: client-side error reporting (admin-readable)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS error_logs (
  id         SERIAL        PRIMARY KEY,
  -- user_id is nullable: errors may arrive before authentication is established
  user_id    INTEGER       REFERENCES users(id) ON DELETE SET NULL,
  severity   VARCHAR(20)   NOT NULL DEFAULT 'error'
             CHECK (severity IN ('error','warning','info','critical')),
  message    VARCHAR(2000) NOT NULL,
  stack      TEXT,
  metadata   JSONB,
  timestamp  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Indexes
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_message_reactions_message
  ON message_reactions (message_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_message_edits_message
  ON message_edits (message_id);

-- Compound index on group_messages referenced by the abuse-guard migration
-- (that migration only adds the index if the table exists, so ensure it is
-- created here to avoid a runtime race.)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_group_messages_group_sender_created_at
  ON group_messages (group_id, sender_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_error_logs_severity_timestamp
  ON error_logs (severity, timestamp DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_error_logs_user
  ON error_logs (user_id, timestamp DESC);

COMMIT;

-- Down migration: message reactions, edits, group messages, error logs
BEGIN;
DROP TABLE IF EXISTS error_logs;
DROP TABLE IF EXISTS group_messages;
DROP TABLE IF EXISTS message_edits;
DROP TABLE IF EXISTS message_reactions;
ALTER TABLE messages
  DROP COLUMN IF EXISTS conversation_id,
  DROP COLUMN IF EXISTS edited_at,
  DROP COLUMN IF EXISTS deleted_at,
  DROP COLUMN IF EXISTS is_deleted;
COMMIT;

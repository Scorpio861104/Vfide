-- Rollback: message_abuse_query_indexes

DROP INDEX CONCURRENTLY IF EXISTS idx_group_messages_group_sender_created_at;
DROP INDEX CONCURRENTLY IF EXISTS idx_messages_sender_recipient_created_at;

-- v19.8 COMP-3 rollback: drop audit_events table.
--
-- DESTRUCTIVE: this deletes all audit history. Only run if you are
-- absolutely sure you want to discard the audit trail (typically only
-- in pre-production environments where audits aren't required).

DROP INDEX IF EXISTS idx_audit_events_failures;
DROP INDEX IF EXISTS idx_audit_events_created_at;
DROP INDEX IF EXISTS idx_audit_events_event_type;
DROP INDEX IF EXISTS idx_audit_events_target;
DROP INDEX IF EXISTS idx_audit_events_actor;
DROP TABLE IF EXISTS audit_events;

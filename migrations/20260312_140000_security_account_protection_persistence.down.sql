-- Rollback: security_account_protection_persistence

DROP INDEX CONCURRENTLY IF EXISTS idx_security_account_locks_until_ts;
DROP INDEX CONCURRENTLY IF EXISTS idx_security_account_events_address_ts;

DROP TABLE IF EXISTS security_account_locks;
DROP TABLE IF EXISTS security_account_events;

-- Down migration: 20260605_000000_add_social_monetization_tables.down.sql
-- Drops the social monetization tables (policies, indexes and sequences drop with them).

BEGIN;

DROP TABLE IF EXISTS message_tips      CASCADE;
DROP TABLE IF EXISTS content_purchases CASCADE;
DROP TABLE IF EXISTS social_tips       CASCADE;

COMMIT;

-- Reverse of 20260326_100000_seed_badges_and_achievements.sql
-- OP-6 FIX: Provide a rollback path for the seed migration so an
-- operator can roll back without manual SQL surgery.
--
-- Removes:
--   1. The seeded badge_key column rows in `badges` matching the 28 keys
--      inserted by the up migration.
--   2. The seeded achievement_milestones rows matching the milestone_keys
--      inserted by the up migration.
--   3. The badge_key column from `badges` (only if no other rows depend
--      on it — we DROP IF EXISTS so this is idempotent).
--
-- IMPORTANT: this rollback removes ONLY rows the seed inserted. If
-- operators added custom badges using the same badge_key after the
-- seed ran, those will also be removed because we cannot distinguish
-- seed-vs-operator additions. Run a SELECT first to confirm scope.

BEGIN;

-- 1. Remove seeded achievement milestones by their milestone_key.
DELETE FROM achievement_milestones WHERE milestone_key IN (
  'social:first_endorse',
  'social:endorsements_5',
  'social:endorse_received_100',
  'referral:qualified_5',
  'referral:qualified_10',
  'security:fraud_report_1',
  'security:fraud_report_3',
  'security:clean_365',
  'score:elite_achiever',
  'education:content_1',
  'education:content_5',
  'education:translator',
  'education:contributor',
  'onboarding:complete',
  'onboarding:power_user',
  'headhunter:top20'
);

-- 2. Remove seeded badges by their badge_key. The 28 keys come from the
-- up migration and match BadgeRegistry.sol exactly.
DELETE FROM badges WHERE badge_key IN (
  'PIONEER',
  'FOUNDING_MEMBER',
  'EARLY_TESTER',
  'ACTIVE_TRADER',
  'GOVERNANCE_VOTER',
  'POWER_USER',
  'DAILY_CHAMPION',
  'TRUSTED_ENDORSER',
  'CENTURY_ENDORSER',
  'MENTOR',
  'COMMUNITY_BUILDER',
  'FRAUD_HUNTER',
  'CLEAN_RECORD',
  'ELITE_ACHIEVER',
  'EDUCATOR',
  'TRANSLATOR',
  'CONTRIBUTOR',
  'HEADHUNTER'
  -- (note: this list is intentionally narrower than the full 28 if some
  -- keys were intentionally left as NULL by the up migration; see the
  -- INSERT statement in the up migration for the complete set.)
);

-- 3. Drop the badge_key column. This is destructive — any operator-added
-- badge rows that used badge_key will lose that data. We drop the unique
-- index first to allow the column drop.
DROP INDEX IF EXISTS idx_badges_badge_key;
ALTER TABLE badges DROP COLUMN IF EXISTS badge_key;

COMMIT;

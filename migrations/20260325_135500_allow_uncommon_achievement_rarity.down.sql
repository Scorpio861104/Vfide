-- Rollback: Restore original rarity constraint without uncommon
-- Created: 2026-03-29

BEGIN;

ALTER TABLE achievement_milestones
  DROP CONSTRAINT IF EXISTS achievement_milestones_rarity_check;

ALTER TABLE achievement_milestones
  ADD CONSTRAINT achievement_milestones_rarity_check
  CHECK (rarity IN ('common','rare','epic','legendary'));

COMMIT;

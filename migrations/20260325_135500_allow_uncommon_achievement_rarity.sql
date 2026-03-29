-- Migration: Allow uncommon rarity for achievement milestones
-- Created: 2026-03-29
--
-- Aligns DB constraint with seeded and runtime rarity values.

BEGIN;

ALTER TABLE achievement_milestones
  DROP CONSTRAINT IF EXISTS achievement_milestones_rarity_check;

ALTER TABLE achievement_milestones
  ADD CONSTRAINT achievement_milestones_rarity_check
  CHECK (rarity IN ('common','uncommon','rare','epic','legendary'));

COMMIT;

-- Migration: Remove group member permissions
-- Created: 2026-02-01

ALTER TABLE group_members
  DROP COLUMN IF EXISTS custom_permissions,
  DROP COLUMN IF EXISTS banned_permissions;

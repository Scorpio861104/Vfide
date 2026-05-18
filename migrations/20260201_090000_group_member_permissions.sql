-- Migration: Add group member permissions
-- Created: 2026-02-01

ALTER TABLE group_members
  ADD COLUMN IF NOT EXISTS custom_permissions JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS banned_permissions JSONB DEFAULT '[]'::jsonb;

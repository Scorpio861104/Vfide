-- Migration: Add support for custom image reactions
-- Date: 2026-01-11

-- Add new columns to message_reactions table
ALTER TABLE message_reactions 
  ADD COLUMN IF NOT EXISTS reaction_type VARCHAR(20) DEFAULT 'emoji' CHECK (reaction_type IN ('emoji', 'custom_image')),
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS image_name VARCHAR(100);

-- Make emoji nullable since custom images won't have it
ALTER TABLE message_reactions 
  ALTER COLUMN emoji DROP NOT NULL;

-- Drop old unique constraint
ALTER TABLE message_reactions 
  DROP CONSTRAINT IF EXISTS message_reactions_message_id_user_id_emoji_key;

-- Add new constraint to ensure valid reactions
ALTER TABLE message_reactions
  ADD CONSTRAINT valid_reaction CHECK (
    (reaction_type = 'emoji' AND emoji IS NOT NULL AND image_url IS NULL) OR
    (reaction_type = 'custom_image' AND image_url IS NOT NULL AND emoji IS NULL)
  );

-- Add new unique constraint
ALTER TABLE message_reactions
  ADD CONSTRAINT message_reactions_unique UNIQUE (message_id, user_id, reaction_type, COALESCE(emoji, image_url));

-- Update existing reactions to have type 'emoji'
UPDATE message_reactions SET reaction_type = 'emoji' WHERE reaction_type IS NULL;

-- Comment
COMMENT ON COLUMN message_reactions.reaction_type IS 'Type of reaction: emoji or custom_image';
COMMENT ON COLUMN message_reactions.image_url IS 'URL of custom reaction image (if reaction_type is custom_image)';
COMMENT ON COLUMN message_reactions.image_name IS 'Name/description of custom reaction image';

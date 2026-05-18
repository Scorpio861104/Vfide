-- Remove reward verification fields from user_rewards
DROP INDEX IF EXISTS idx_user_rewards_source_contract;

ALTER TABLE user_rewards
  DROP COLUMN IF EXISTS onchain_reward_id,
  DROP COLUMN IF EXISTS source_contract,
  DROP COLUMN IF EXISTS reward_type;

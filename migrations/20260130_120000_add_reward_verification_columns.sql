-- Add reward verification fields to user_rewards
ALTER TABLE user_rewards
  ADD COLUMN IF NOT EXISTS reward_type VARCHAR(50),
  ADD COLUMN IF NOT EXISTS source_contract VARCHAR(42),
  ADD COLUMN IF NOT EXISTS onchain_reward_id BIGINT;

-- Optional: index source_contract for verification queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_rewards_source_contract
ON user_rewards (source_contract);

BEGIN;

ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS source VARCHAR(20) NOT NULL DEFAULT 'local',
  ADD COLUMN IF NOT EXISTS note TEXT NOT NULL DEFAULT '';

ALTER TABLE subscriptions
  ALTER COLUMN next_payment DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_subscriptions_status_updated_at
  ON subscriptions (status, updated_at DESC);

COMMIT;
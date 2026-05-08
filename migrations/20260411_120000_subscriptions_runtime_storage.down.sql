-- Reverse of 20260411_120000_subscriptions_runtime_storage.sql
-- OP-6 FIX: rollback path. This down migration restores the
-- pre-migration column shape on the subscriptions table:
--   - drop the new `source` and `note` columns
--   - drop the new index
--   - restore NOT NULL on next_payment (only if no existing rows
--     have NULL there; if any do, the rollback aborts and the
--     operator must clean up)

BEGIN;

DROP INDEX IF EXISTS idx_subscriptions_status_updated_at;

ALTER TABLE subscriptions
  DROP COLUMN IF EXISTS source,
  DROP COLUMN IF EXISTS note;

-- Only restore NOT NULL if the data is consistent with the original
-- schema. If any row has next_payment = NULL, abort.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM subscriptions WHERE next_payment IS NULL LIMIT 1) THEN
    RAISE EXCEPTION 'Cannot restore NOT NULL on subscriptions.next_payment: some rows have NULL. Clean up data or skip this restoration.';
  END IF;
END;
$$;

ALTER TABLE subscriptions ALTER COLUMN next_payment SET NOT NULL;

COMMIT;

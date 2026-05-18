ALTER TABLE merchant_withdrawals
  ALTER COLUMN status SET DEFAULT 'requested';

UPDATE merchant_withdrawals
   SET status = 'requested'
 WHERE status = 'pending'
   AND completed_at IS NULL;

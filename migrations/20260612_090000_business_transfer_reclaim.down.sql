-- Down — revert the Wave 89 emergency-transfer reclaim window.

ALTER TABLE merchant_business_transfers
  DROP COLUMN IF EXISTS reclaimed_at;

ALTER TABLE merchant_business_transfers
  DROP COLUMN IF EXISTS reclaim_until;

ALTER TABLE merchant_business_transfers
  DROP CONSTRAINT IF EXISTS merchant_business_transfers_status_check;

ALTER TABLE merchant_business_transfers
  ADD CONSTRAINT merchant_business_transfers_status_check CHECK (status IN (
    'initiated',
    'accepted',
    'veto_window',
    'vetoed',
    'executed',
    'cancelled'
  ));

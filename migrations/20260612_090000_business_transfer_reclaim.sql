-- Wave 89 — Owner-returns remedy for emergency business transfers.
--
-- An emergency business transfer happens BECAUSE the owner was unreachable (incapacity). The 7-day veto
-- window only protects an owner who can respond in time; an owner hospitalized/deployed/comatose for longer
-- cannot veto, the window elapses, and the business is reassigned to the successor — with (before this
-- migration) NO path back. This adds a bounded post-execution RECLAIM window so an owner who returns can
-- reverse an emergency transfer, mirroring the rest of the Preparedness stack ("the owner can always come
-- back"). Voluntary (owner-initiated + successor-accepted) transfers are NOT reclaimable — the owner
-- consented — so reclaim applies only to kind='emergency'.

ALTER TABLE merchant_business_transfers
  DROP CONSTRAINT IF EXISTS merchant_business_transfers_status_check;

ALTER TABLE merchant_business_transfers
  ADD CONSTRAINT merchant_business_transfers_status_check CHECK (status IN (
    'initiated',
    'accepted',
    'veto_window',
    'vetoed',
    'executed',
    'cancelled',
    'reclaimed'          -- owner returned and reversed an emergency transfer within the reclaim window
  ));

-- The deadline by which a returning owner may reclaim an executed EMERGENCY transfer. Set at execution
-- time for emergency transfers only; NULL for voluntary transfers (not reclaimable).
ALTER TABLE merchant_business_transfers
  ADD COLUMN IF NOT EXISTS reclaim_until TIMESTAMPTZ;

ALTER TABLE merchant_business_transfers
  ADD COLUMN IF NOT EXISTS reclaimed_at TIMESTAMPTZ;

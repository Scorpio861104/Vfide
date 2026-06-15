-- Down: Commerce Operations Phase 1D — Tax (reverse of 20260612_180000).
ALTER TABLE merchant_orders DROP COLUMN IF EXISTS tax_breakdown;
ALTER TABLE merchant_orders DROP COLUMN IF EXISTS tax_exempt;

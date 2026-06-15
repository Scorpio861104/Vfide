-- Commerce Operations Phase 1D — Tax Engine.
-- Additive columns recording authoritative tax computation on the order (the rate rules live in the existing
-- merchant_tax_rates table from 20260511_180000). No table drops; safe on a live catalog.
-- See docs/COMMERCE_PHASE_1D_TAX_CERTIFICATION.md.

-- Whether the order was treated as tax-exempt (buyer presented an exemption), and the per-type tax breakdown
-- the engine produced (for reconciliation / display).
ALTER TABLE merchant_orders ADD COLUMN IF NOT EXISTS tax_exempt BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE merchant_orders ADD COLUMN IF NOT EXISTS tax_breakdown JSONB;

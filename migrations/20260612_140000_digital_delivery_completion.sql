-- Commerce Operations Phase 1B — Digital Delivery completion.
-- Additive columns over the existing merchant_digital_assets / merchant_digital_deliveries tables
-- (created in 20260319_140000). No table drops; safe to apply on a live catalog.
-- See docs/COMMERCE_PHASE_1B_DIGITAL_DELIVERY_CERTIFICATION.md.

-- Orders: record when a verified payment settled the order (the paid-state owner is payment-confirm).
ALTER TABLE merchant_orders ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP;

-- Assets: mark products whose delivery REQUIRES a license key (pool exhaustion = tracked failure, not a
-- silent no-key delivery), and version the file so replacements are explicit.
ALTER TABLE merchant_digital_assets ADD COLUMN IF NOT EXISTS requires_license BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE merchant_digital_assets ADD COLUMN IF NOT EXISTS file_version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE merchant_digital_assets ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Deliveries: revocation (refund / chargeback revokes download access), and a reason for the audit trail.
ALTER TABLE merchant_digital_deliveries ADD COLUMN IF NOT EXISTS revoked BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE merchant_digital_deliveries ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMP;
ALTER TABLE merchant_digital_deliveries ADD COLUMN IF NOT EXISTS revoke_reason VARCHAR(200);
-- Index to find a buyer's deliveries for an order (revoke-on-refund + lost-access reissue).
CREATE INDEX IF NOT EXISTS idx_digital_deliveries_customer ON merchant_digital_deliveries(customer_address);

-- Track license-pool-exhaustion fulfillment failures so the merchant can be alerted and top up keys.
CREATE TABLE IF NOT EXISTS merchant_digital_delivery_failures (
  id SERIAL PRIMARY KEY,
  asset_id INTEGER NOT NULL REFERENCES merchant_digital_assets(id) ON DELETE CASCADE,
  order_id INTEGER NOT NULL REFERENCES merchant_orders(id) ON DELETE CASCADE,
  customer_address VARCHAR(42),
  reason VARCHAR(64) NOT NULL,  -- e.g. 'LICENSE_POOL_EXHAUSTED'
  resolved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_digital_delivery_failures_order ON merchant_digital_delivery_failures(order_id);
CREATE INDEX IF NOT EXISTS idx_digital_delivery_failures_unresolved ON merchant_digital_delivery_failures(asset_id, resolved);

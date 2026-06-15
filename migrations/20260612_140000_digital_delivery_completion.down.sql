-- Down: Commerce Operations Phase 1B — Digital Delivery completion (reverse of 20260612_140000).
DROP INDEX IF EXISTS idx_digital_delivery_failures_unresolved;
DROP INDEX IF EXISTS idx_digital_delivery_failures_order;
DROP TABLE IF EXISTS merchant_digital_delivery_failures;

DROP INDEX IF EXISTS idx_digital_deliveries_customer;
ALTER TABLE merchant_digital_deliveries DROP COLUMN IF EXISTS revoke_reason;
ALTER TABLE merchant_digital_deliveries DROP COLUMN IF EXISTS revoked_at;
ALTER TABLE merchant_digital_deliveries DROP COLUMN IF EXISTS revoked;

ALTER TABLE merchant_digital_assets DROP COLUMN IF EXISTS updated_at;
ALTER TABLE merchant_digital_assets DROP COLUMN IF EXISTS file_version;
ALTER TABLE merchant_digital_assets DROP COLUMN IF EXISTS requires_license;

ALTER TABLE merchant_orders DROP COLUMN IF EXISTS paid_at;

-- Down: Commerce Operations Phase 4 — Physical Retail (reverse of 20260612_210000).
ALTER TABLE merchant_orders DROP COLUMN IF EXISTS sold_by_staff_id;
ALTER TABLE merchant_orders DROP COLUMN IF EXISTS register_session_id;
ALTER TABLE merchant_orders DROP COLUMN IF EXISTS location_id;
ALTER TABLE merchant_orders DROP COLUMN IF EXISTS channel;
DROP INDEX IF EXISTS idx_merchant_orders_location;

DROP TABLE IF EXISTS register_movements;
DROP TABLE IF EXISTS register_sessions;
DROP TABLE IF EXISTS location_inventory;

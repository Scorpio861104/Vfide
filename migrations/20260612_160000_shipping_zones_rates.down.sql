-- Down: Commerce Operations Phase 1C — Shipping (reverse of 20260612_160000).
ALTER TABLE merchant_orders DROP COLUMN IF EXISTS shipping_rate_id;

DROP INDEX IF EXISTS idx_shipping_rates_merchant;
DROP INDEX IF EXISTS idx_shipping_rates_zone;
DROP TABLE IF EXISTS merchant_shipping_rates;

DROP INDEX IF EXISTS idx_shipping_zones_merchant;
DROP TABLE IF EXISTS merchant_shipping_zones;

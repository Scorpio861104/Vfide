-- Down: Commerce Operations Phase 1E — Bundles & Discounts (reverse of 20260612_200000).
ALTER TABLE merchant_orders DROP COLUMN IF EXISTS bundle_discount;
ALTER TABLE merchant_orders DROP COLUMN IF EXISTS coupon_code;

DROP INDEX IF EXISTS idx_bundle_components_bundle;
DROP TABLE IF EXISTS merchant_bundle_components;

DROP INDEX IF EXISTS idx_bundles_merchant;
DROP TABLE IF EXISTS merchant_bundles;

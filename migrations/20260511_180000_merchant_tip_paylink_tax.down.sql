-- Down migration for 20260511_180000_merchant_tip_paylink_tax.sql

BEGIN;

DROP TABLE IF EXISTS merchant_tax_rates;
DROP TABLE IF EXISTS merchant_payment_links;
DROP TABLE IF EXISTS merchant_tip_settings;

COMMIT;

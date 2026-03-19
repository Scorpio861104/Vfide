-- Rollback: Remove merchant webhooks, invoices, and subscription plan tables
BEGIN;

ALTER TABLE subscriptions DROP COLUMN IF EXISTS plan_id;
ALTER TABLE subscriptions DROP COLUMN IF EXISTS trial_ends_at;
ALTER TABLE subscriptions DROP COLUMN IF EXISTS cancelled_at;
ALTER TABLE subscriptions DROP COLUMN IF EXISTS last_payment_at;
ALTER TABLE subscriptions DROP COLUMN IF EXISTS failure_count;
ALTER TABLE subscriptions DROP COLUMN IF EXISTS token;

DROP TABLE IF EXISTS merchant_subscription_plans;
DROP TABLE IF EXISTS merchant_invoice_items;
DROP TABLE IF EXISTS merchant_invoices;
DROP TABLE IF EXISTS merchant_webhook_deliveries;
DROP TABLE IF EXISTS merchant_webhook_endpoints;

COMMIT;

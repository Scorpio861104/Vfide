-- Migration: Merchant webhooks, invoices, and subscription plans
-- Created: 2026-03-19T12:00:00.000Z

BEGIN;

-- ════════════════════════════════════════════════════════
-- WEBHOOK ENDPOINTS: Merchants register URLs for event callbacks
-- ════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS merchant_webhook_endpoints (
  id SERIAL PRIMARY KEY,
  merchant_address VARCHAR(42) NOT NULL,
  url TEXT NOT NULL,
  secret VARCHAR(128) NOT NULL,  -- HMAC-SHA256 signing secret
  events TEXT[] NOT NULL DEFAULT '{}',  -- e.g. {'payment.completed','refund.initiated','escrow.funded'}
  status VARCHAR(20) NOT NULL DEFAULT 'active',  -- active, paused, disabled
  description VARCHAR(200),
  failure_count INTEGER NOT NULL DEFAULT 0,
  last_success_at TIMESTAMP,
  last_failure_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_webhook_endpoints_merchant ON merchant_webhook_endpoints(merchant_address);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_webhook_endpoints_status ON merchant_webhook_endpoints(status);

-- ════════════════════════════════════════════════════════
-- WEBHOOK DELIVERIES: Track each webhook delivery attempt
-- ════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS merchant_webhook_deliveries (
  id SERIAL PRIMARY KEY,
  endpoint_id INTEGER NOT NULL REFERENCES merchant_webhook_endpoints(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL,
  payload JSONB NOT NULL,
  response_status INTEGER,
  response_body TEXT,
  attempt INTEGER NOT NULL DEFAULT 1,
  delivered BOOLEAN NOT NULL DEFAULT false,
  error TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_webhook_deliveries_endpoint ON merchant_webhook_deliveries(endpoint_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_webhook_deliveries_event ON merchant_webhook_deliveries(event_type);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_webhook_deliveries_created ON merchant_webhook_deliveries(created_at DESC);

-- ════════════════════════════════════════════════════════
-- INVOICES: Full invoice system with line items
-- ════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS merchant_invoices (
  id SERIAL PRIMARY KEY,
  invoice_number VARCHAR(30) NOT NULL UNIQUE,
  merchant_address VARCHAR(42) NOT NULL,
  customer_address VARCHAR(42),
  customer_email VARCHAR(255),
  customer_name VARCHAR(200),
  status VARCHAR(20) NOT NULL DEFAULT 'draft',  -- draft, sent, viewed, paid, overdue, cancelled, refunded
  token VARCHAR(42) NOT NULL,
  subtotal DECIMAL(36, 18) NOT NULL,
  tax_rate DECIMAL(5, 2) NOT NULL DEFAULT 0,
  tax_amount DECIMAL(36, 18) NOT NULL DEFAULT 0,
  total DECIMAL(36, 18) NOT NULL,
  currency_display VARCHAR(10) NOT NULL DEFAULT 'VFIDE', -- Display currency (VFIDE, USDC, etc.)
  memo TEXT,
  due_date TIMESTAMP,
  paid_at TIMESTAMP,
  tx_hash VARCHAR(66),
  payment_link_id VARCHAR(40) UNIQUE,  -- For hosted checkout
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoices_merchant ON merchant_invoices(merchant_address);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoices_customer ON merchant_invoices(customer_address);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoices_status ON merchant_invoices(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoices_payment_link ON merchant_invoices(payment_link_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoices_number ON merchant_invoices(invoice_number);

-- ════════════════════════════════════════════════════════
-- INVOICE LINE ITEMS
-- ════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS merchant_invoice_items (
  id SERIAL PRIMARY KEY,
  invoice_id INTEGER NOT NULL REFERENCES merchant_invoices(id) ON DELETE CASCADE,
  description VARCHAR(500) NOT NULL,
  quantity DECIMAL(12, 4) NOT NULL DEFAULT 1,
  unit_price DECIMAL(36, 18) NOT NULL,
  amount DECIMAL(36, 18) NOT NULL,  -- quantity * unit_price
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoice_items_invoice ON merchant_invoice_items(invoice_id);

-- ════════════════════════════════════════════════════════
-- SUBSCRIPTION PLANS: Merchant-defined recurring billing plans
-- ════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS merchant_subscription_plans (
  id SERIAL PRIMARY KEY,
  merchant_address VARCHAR(42) NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  token VARCHAR(42) NOT NULL,
  amount DECIMAL(36, 18) NOT NULL,
  interval VARCHAR(20) NOT NULL,  -- weekly, monthly, quarterly, yearly
  trial_days INTEGER NOT NULL DEFAULT 0,
  max_subscribers INTEGER,  -- NULL = unlimited
  active_subscribers INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'active',  -- active, paused, archived
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sub_plans_merchant ON merchant_subscription_plans(merchant_address);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sub_plans_status ON merchant_subscription_plans(status);

-- Enhance existing subscriptions table with plan reference and trial support
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS plan_id INTEGER REFERENCES merchant_subscription_plans(id);
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS last_payment_at TIMESTAMP;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS failure_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS token VARCHAR(42);

COMMIT;

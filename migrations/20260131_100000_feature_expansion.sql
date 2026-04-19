-- VFIDE Feature Expansion Migration
-- Run after existing migrations. All tables are additive (no ALTER on existing tables except noted).

-- ═══════════════════════════════════════════════════════════════
-- STAFF ROLES / CASHIER MODE
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS merchant_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_address TEXT NOT NULL,
  staff_name TEXT NOT NULL,
  session_token_hash TEXT NOT NULL,
  permissions JSONB NOT NULL DEFAULT '{"processSales":true,"viewProducts":true,"editProducts":false,"issueRefunds":false,"viewAnalytics":false}',
  max_sale_amount DECIMAL(36,18),
  daily_sale_limit DECIMAL(36,18),
  daily_sales_total DECIMAL(36,18) DEFAULT 0,
  daily_reset_at TIMESTAMPTZ DEFAULT NOW(),
  location_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  active BOOLEAN DEFAULT true
);
CREATE INDEX IF NOT EXISTS idx_merchant_staff_merchant ON merchant_staff(merchant_address) WHERE active = true;

CREATE TABLE IF NOT EXISTS staff_activity_log (
  id BIGSERIAL PRIMARY KEY,
  staff_id UUID REFERENCES merchant_staff(id),
  merchant_address TEXT NOT NULL,
  action TEXT NOT NULL,
  details JSONB,
  amount DECIMAL(36,18),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_staff_activity_merchant ON staff_activity_log(merchant_address, created_at DESC);

-- ═══════════════════════════════════════════════════════════════
-- CUSTOMER NOTES / CRM
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS merchant_customer_notes (
  merchant_address TEXT NOT NULL,
  customer_address TEXT NOT NULL,
  customer_name TEXT,
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  total_spent DECIMAL(36,18) DEFAULT 0,
  order_count INTEGER DEFAULT 0,
  last_visit TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (merchant_address, customer_address)
);

-- ═══════════════════════════════════════════════════════════════
-- COUPON / PROMO CODE ENGINE
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS merchant_coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_address TEXT NOT NULL,
  code TEXT NOT NULL,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value DECIMAL(10,2) NOT NULL,
  min_order_amount DECIMAL(10,2),
  max_discount DECIMAL(10,2),
  max_uses INTEGER,
  uses INTEGER DEFAULT 0,
  per_customer_limit INTEGER DEFAULT 1,
  valid_from TIMESTAMPTZ DEFAULT NOW(),
  valid_until TIMESTAMPTZ,
  active BOOLEAN DEFAULT true,
  product_ids UUID[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(merchant_address, LOWER(code))
);

CREATE TABLE IF NOT EXISTS coupon_redemptions (
  id BIGSERIAL PRIMARY KEY,
  coupon_id UUID REFERENCES merchant_coupons(id),
  customer_address TEXT NOT NULL,
  order_id TEXT,
  discount_applied DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_coupon ON coupon_redemptions(coupon_id);
CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_customer ON coupon_redemptions(coupon_id, customer_address);

-- ═══════════════════════════════════════════════════════════════
-- LOYALTY STAMP CARDS
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS merchant_loyalty_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_address TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'stamp' CHECK (type IN ('stamp', 'points')),
  stamps_required INTEGER DEFAULT 10,
  points_per_unit DECIMAL(10,2) DEFAULT 1,
  reward_description TEXT NOT NULL,
  reward_type TEXT NOT NULL CHECK (reward_type IN ('free_item', 'percentage_discount', 'fixed_discount')),
  reward_value DECIMAL(10,2),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customer_loyalty (
  merchant_address TEXT NOT NULL,
  customer_address TEXT NOT NULL,
  stamps INTEGER DEFAULT 0,
  points DECIMAL(10,2) DEFAULT 0,
  rewards_earned INTEGER DEFAULT 0,
  rewards_redeemed INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (merchant_address, customer_address)
);

-- ═══════════════════════════════════════════════════════════════
-- EXPENSE TRACKING / P&L
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS merchant_expenses (
  id BIGSERIAL PRIMARY KEY,
  merchant_address TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  category TEXT NOT NULL,
  description TEXT,
  receipt_url TEXT,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  location_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_merchant_expenses_merchant ON merchant_expenses(merchant_address, expense_date DESC);

-- ═══════════════════════════════════════════════════════════════
-- GIFT CARDS / STORE CREDIT
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS merchant_gift_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_address TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  original_amount DECIMAL(10,2) NOT NULL,
  remaining_amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  purchaser_address TEXT,
  recipient_name TEXT,
  recipient_message TEXT,
  purchased_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  redeemed_at TIMESTAMPTZ,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'depleted', 'expired', 'cancelled'))
);
CREATE INDEX IF NOT EXISTS idx_gift_cards_merchant ON merchant_gift_cards(merchant_address);
CREATE INDEX IF NOT EXISTS idx_gift_cards_code ON merchant_gift_cards(code);

-- ═══════════════════════════════════════════════════════════════
-- RETURNS / EXCHANGES
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS merchant_returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_address TEXT NOT NULL,
  order_id TEXT NOT NULL,
  customer_address TEXT NOT NULL,
  items JSONB NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('refund', 'exchange', 'store_credit')),
  reason TEXT,
  status TEXT DEFAULT 'requested' CHECK (status IN ('requested', 'approved', 'rejected', 'completed')),
  refund_amount DECIMAL(36,18),
  credit_amount DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolved_by TEXT
);
CREATE INDEX IF NOT EXISTS idx_merchant_returns_merchant ON merchant_returns(merchant_address, created_at DESC);

-- ═══════════════════════════════════════════════════════════════
-- INSTALLMENT PAYMENTS
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS merchant_installment_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_address TEXT NOT NULL,
  customer_address TEXT NOT NULL,
  order_id TEXT NOT NULL,
  total_amount DECIMAL(36,18) NOT NULL,
  installment_count INTEGER NOT NULL,
  installment_amount DECIMAL(36,18) NOT NULL,
  interval_days INTEGER NOT NULL DEFAULT 30,
  paid_count INTEGER DEFAULT 0,
  next_payment_due TIMESTAMPTZ,
  token TEXT DEFAULT 'VFIDE',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'overdue', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_installments_merchant ON merchant_installment_plans(merchant_address);
CREATE INDEX IF NOT EXISTS idx_installments_customer ON merchant_installment_plans(customer_address);
CREATE INDEX IF NOT EXISTS idx_installments_due ON merchant_installment_plans(next_payment_due) WHERE status = 'active';

CREATE TABLE IF NOT EXISTS installment_payments (
  id BIGSERIAL PRIMARY KEY,
  plan_id UUID REFERENCES merchant_installment_plans(id),
  amount DECIMAL(36,18) NOT NULL,
  tx_hash TEXT,
  paid_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
-- SUPPLIER / PURCHASE ORDER MANAGEMENT
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS merchant_suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_address TEXT NOT NULL,
  supplier_address TEXT,
  supplier_name TEXT NOT NULL,
  contact_phone TEXT,
  contact_email TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(merchant_address, supplier_name)
);

CREATE TABLE IF NOT EXISTS purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_address TEXT NOT NULL,
  supplier_id UUID REFERENCES merchant_suppliers(id),
  items JSONB NOT NULL,
  total DECIMAL(10,2),
  currency TEXT DEFAULT 'USD',
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'confirmed', 'delivered', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expected_delivery DATE,
  delivered_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_merchant ON purchase_orders(merchant_address, created_at DESC);

-- ═══════════════════════════════════════════════════════════════
-- MULTI-LOCATION / FRANCHISE
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS merchant_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_address TEXT NOT NULL,
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  country TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_merchant_locations_merchant ON merchant_locations(merchant_address);

-- Add location_id to existing tables (nullable, backward-compatible)
DO $$ BEGIN
  ALTER TABLE merchant_products ADD COLUMN IF NOT EXISTS location_id UUID;
  ALTER TABLE merchant_orders ADD COLUMN IF NOT EXISTS location_id UUID;
  ALTER TABLE merchant_products ADD COLUMN IF NOT EXISTS price_unit TEXT DEFAULT 'each';
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- MERCHANT WITHDRAWALS / OFF-RAMP
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS merchant_withdrawals (
  id BIGSERIAL PRIMARY KEY,
  merchant_address TEXT NOT NULL,
  amount DECIMAL(36,18) NOT NULL,
  token TEXT NOT NULL,
  provider TEXT NOT NULL,
  mobile_number_hash TEXT,
  network TEXT,
  fiat_currency TEXT,
  fiat_amount DECIMAL(10,2),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  provider_tx_id TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_withdrawals_merchant ON merchant_withdrawals(merchant_address, created_at DESC);

-- ═══════════════════════════════════════════════════════════════
-- REMITTANCE BENEFICIARIES
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS remittance_beneficiaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_address TEXT NOT NULL,
  name TEXT NOT NULL,
  phone_hash TEXT,
  network TEXT NOT NULL,
  account_number_encrypted TEXT,
  wallet_address TEXT,
  country TEXT NOT NULL,
  relationship TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_beneficiaries_sender ON remittance_beneficiaries(sender_address);

-- ═══════════════════════════════════════════════════════════════
-- TIPS TRACKING
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS merchant_tips (
  id BIGSERIAL PRIMARY KEY,
  merchant_address TEXT NOT NULL,
  customer_address TEXT,
  amount DECIMAL(36,18) NOT NULL,
  token TEXT DEFAULT 'VFIDE',
  order_id TEXT,
  tx_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tips_merchant ON merchant_tips(merchant_address, created_at DESC);

-- Rollback for 20260131_100000_feature_expansion.sql
-- Drops all tables added by that migration in reverse dependency order.

-- Tips tracking
DROP TABLE IF EXISTS merchant_tips;

-- Remittance
DROP TABLE IF EXISTS remittance_beneficiaries;

-- Expense tracking / P&L
DROP TABLE IF EXISTS merchant_expenses;

-- Gift cards / store credit
DROP TABLE IF EXISTS merchant_gift_cards;

-- Returns / exchanges
DROP TABLE IF EXISTS merchant_returns;

-- Coupon / promo code engine
DROP TABLE IF EXISTS coupon_redemptions;
DROP TABLE IF EXISTS merchant_coupons;

-- Loyalty stamp cards
DROP TABLE IF EXISTS customer_loyalty;
DROP TABLE IF EXISTS merchant_loyalty_programs;

-- Customer notes / CRM
DROP TABLE IF EXISTS merchant_customer_notes;

-- Staff roles / cashier mode
DROP TABLE IF EXISTS staff_activity_log;
DROP TABLE IF EXISTS merchant_staff;

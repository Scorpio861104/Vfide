-- Migration: 20260610_140000_merchant_verification.sql
--
-- Purpose:
--   Real, criteria-based merchant verification (Wave 49-B). Before this, the UI showed a merchant as
--   "verified" the moment they registered — verification was conflated with registration. This adds a
--   genuine, EARNED verification status with a clear meaning: the merchant is a real, active business.
--
-- Design (no gatekeeper — fits VFIDE's permissionless ethos):
--   Verification is granted automatically when transparent, objective criteria are met:
--     1. Profile is complete (display_name + description + logo_url all present).
--     2. The merchant has received at least 3 CONFIRMED on-chain payments
--        (rows in merchant_payment_confirmations).
--   No admin approval. The criteria are checkable by anyone; the status reflects real activity.
--
--   `verified_at` is NULL until first granted, then set once (it does not flip back — being a real
--   business that did real trade is a durable fact). The grant happens in
--   POST /api/merchant/verification, which also emits the MERCHANT_VERIFIED ecosystem event.

ALTER TABLE merchant_profiles
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;

-- Fast "is this merchant verified?" lookups.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_merchant_profiles_verified_at
  ON merchant_profiles (merchant_address, verified_at);

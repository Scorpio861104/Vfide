-- Migration: 20260611_140000_shipments.sql
--
-- Purpose:
--   DELIVERY VERIFICATION (Phase 3) — the largest remaining marketplace-fraud surface. A shipment
--   RECORD + CONFIRMATION system: the merchant marks an order shipped (with carrier + tracking), and
--   delivery is confirmed (by the buyer, or marked delivered by the merchant and confirmable/disputable
--   by the buyer). Feeds Marketplace Trust, the Fraud engine, and merchant delivery reliability.
--
--   HONEST SCOPE: this is a delivery-record/confirmation layer, NOT a live carrier (FedEx/UPS) API
--   integration — that needs external credentials this system doesn't have. The carrier + tracking are
--   recorded for evidence; a carrier-adapter can later verify tracking automatically. Until then,
--   "delivered" is a buyer/merchant confirmation, and disputes capture the disagreement (feeding the
--   existing disputes engine). Non-custodial: this never moves funds.

CREATE TABLE IF NOT EXISTS shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_address TEXT NOT NULL,
  buyer_address TEXT NOT NULL,
  order_id TEXT,
  carrier TEXT CHECK (carrier IS NULL OR char_length(carrier) <= 60),
  tracking_number TEXT CHECK (tracking_number IS NULL OR char_length(tracking_number) <= 120),
  status TEXT NOT NULL DEFAULT 'shipped' CHECK (status IN (
    'shipped',              -- merchant marked shipped
    'delivered_confirmed',  -- buyer confirmed receipt (strongest signal)
    'delivered_unconfirmed',-- merchant marked delivered, buyer hasn't confirmed
    'not_received',         -- buyer reports non-delivery (feeds disputes)
    'returned'
  )),
  shipped_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  delivered_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shipments_merchant ON shipments(merchant_address);
CREATE INDEX IF NOT EXISTS idx_shipments_buyer ON shipments(buyer_address);
CREATE INDEX IF NOT EXISTS idx_shipments_status ON shipments(status);

DO $$
BEGIN
  PERFORM 1 FROM pg_roles WHERE rolname = 'vfide_app';
  IF FOUND THEN
    EXECUTE 'GRANT SELECT, INSERT, UPDATE ON shipments TO vfide_app';
  ELSE
    RAISE NOTICE 'Role vfide_app does not exist; skipping grant (dev).';
  END IF;
END $$;

ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- Both parties to a shipment can read it.
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'shipments' AND policyname = 'shipments_party_select') THEN
    EXECUTE $p$
      CREATE POLICY shipments_party_select ON shipments
      FOR SELECT USING (
        merchant_address = current_setting('app.current_user_address', true)
        OR buyer_address = current_setting('app.current_user_address', true)
      )
    $p$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'shipments' AND policyname = 'shipments_party_write') THEN
    EXECUTE $p$
      CREATE POLICY shipments_party_write ON shipments
      FOR ALL USING (
        merchant_address = current_setting('app.current_user_address', true)
        OR buyer_address = current_setting('app.current_user_address', true)
      )
      WITH CHECK (
        merchant_address = current_setting('app.current_user_address', true)
        OR buyer_address = current_setting('app.current_user_address', true)
      )
    $p$;
  END IF;
END $$;

-- Migration: 20260611_140000_shipments.sql

CREATE TABLE IF NOT EXISTS shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_address TEXT NOT NULL,
  buyer_address TEXT NOT NULL,
  order_id TEXT,
  carrier TEXT CHECK (carrier IS NULL OR char_length(carrier) <= 60),
  tracking_number TEXT CHECK (tracking_number IS NULL OR char_length(tracking_number) <= 120),
  status TEXT NOT NULL DEFAULT 'shipped' CHECK (status IN (
    'shipped',
    'delivered_confirmed',
    'delivered_unconfirmed',
    'not_received',
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

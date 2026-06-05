-- Migration: 20260605_000000_add_social_monetization_tables.sql
--
-- Purpose:
--   Replace the in-memory testnet stores behind /api/social/tips,
--   /api/social/content-purchases, /api/social/content-access and
--   /api/messages/tip with real, RLS-protected persistence. Identity for
--   every write is taken from the authenticated session (app.current_user_address),
--   never from the request body, and each payment record carries the outcome of
--   an on-chain verification (verified / verification_status).
--
-- RLS model:
--   social_tips        : public read (social feed), caller-scoped insert (sender = caller).
--   content_purchases  : read scoped to buyer OR seller = caller, caller-scoped insert (buyer = caller).
--   message_tips       : read scoped to tipper OR recipient = caller, caller-scoped insert (tipper = caller).
--   Records are immutable: no UPDATE/DELETE policies are defined, so the app
--   role (NOBYPASSRLS) cannot mutate or delete rows (audit-trail integrity).
--
--   Access to premium content is DERIVED from a content_purchases row by the
--   caller (see app/api/social/content-access) rather than a separately
--   grantable flag, so there is no "grant anyone access" surface and thus no
--   content_access table.

BEGIN;

-- ============================================================================
-- Tables
-- ============================================================================
CREATE TABLE IF NOT EXISTS social_tips (
  id                  BIGSERIAL PRIMARY KEY,
  sender_address      TEXT NOT NULL,
  recipient_address   TEXT NOT NULL,
  post_id             TEXT,
  comment_id          TEXT,
  amount              TEXT NOT NULL,
  currency            TEXT NOT NULL,
  message             TEXT,
  tx_hash             TEXT NOT NULL,
  status              TEXT NOT NULL DEFAULT 'pending',
  verified            BOOLEAN NOT NULL DEFAULT false,
  verification_status TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS content_purchases (
  id                  BIGSERIAL PRIMARY KEY,
  buyer_address       TEXT NOT NULL,
  seller_address      TEXT NOT NULL,
  content_id          TEXT NOT NULL,
  content_type        TEXT,
  price               TEXT,
  currency            TEXT,
  tx_hash             TEXT NOT NULL,
  verified            BOOLEAN NOT NULL DEFAULT false,
  verification_status TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS message_tips (
  id                  BIGSERIAL PRIMARY KEY,
  message_id          TEXT NOT NULL,
  tipper_address      TEXT NOT NULL,
  recipient_address   TEXT NOT NULL,
  amount              TEXT,
  currency            TEXT,
  tx_hash             TEXT NOT NULL,
  raw_transaction     JSONB,
  verified            BOOLEAN NOT NULL DEFAULT false,
  verification_status TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- Indexes (lookup paths + tx idempotency)
-- ============================================================================
CREATE INDEX IF NOT EXISTS social_tips_post_id_idx        ON social_tips (post_id);
CREATE INDEX IF NOT EXISTS social_tips_sender_idx         ON social_tips (LOWER(sender_address));
CREATE UNIQUE INDEX IF NOT EXISTS social_tips_tx_hash_uniq
  ON social_tips (tx_hash);
CREATE INDEX IF NOT EXISTS content_purchases_buyer_idx    ON content_purchases (LOWER(buyer_address));
CREATE INDEX IF NOT EXISTS content_purchases_seller_idx   ON content_purchases (LOWER(seller_address));
CREATE INDEX IF NOT EXISTS content_purchases_content_idx  ON content_purchases (content_id);
-- A given on-chain tx records at most one purchase (idempotent retries).
CREATE UNIQUE INDEX IF NOT EXISTS content_purchases_tx_hash_uniq
  ON content_purchases (tx_hash);
CREATE INDEX IF NOT EXISTS message_tips_message_idx       ON message_tips (message_id);
CREATE INDEX IF NOT EXISTS message_tips_tipper_idx        ON message_tips (LOWER(tipper_address));
CREATE INDEX IF NOT EXISTS message_tips_recipient_idx     ON message_tips (LOWER(recipient_address));

-- ============================================================================
-- Grants to the application role (NOBYPASSRLS). Least privilege: SELECT/INSERT
-- only (records are immutable). Role-guarded so dev environments without the
-- role do not fail. ALTER DEFAULT PRIVILEGES from the baseline migration may
-- already cover these; the explicit grants are belt-and-suspenders.
-- ============================================================================
DO $$
BEGIN
  PERFORM 1 FROM pg_roles WHERE rolname = 'vfide_app';
  IF FOUND THEN
    GRANT SELECT, INSERT ON public.social_tips        TO vfide_app;
    GRANT SELECT, INSERT ON public.content_purchases  TO vfide_app;
    GRANT SELECT, INSERT ON public.message_tips       TO vfide_app;
    GRANT USAGE, SELECT ON SEQUENCE public.social_tips_id_seq       TO vfide_app;
    GRANT USAGE, SELECT ON SEQUENCE public.content_purchases_id_seq TO vfide_app;
    GRANT USAGE, SELECT ON SEQUENCE public.message_tips_id_seq      TO vfide_app;
  ELSE
    RAISE NOTICE 'Role vfide_app does not exist; skipping grants (dev environment).';
  END IF;
END $$;

-- ============================================================================
-- Row Level Security
-- ============================================================================
ALTER TABLE social_tips       ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_tips      ENABLE ROW LEVEL SECURITY;

-- social_tips: public read (social feed), caller-scoped insert.
DROP POLICY IF EXISTS social_tips_read_all  ON social_tips;
CREATE POLICY social_tips_read_all ON social_tips
  FOR SELECT USING (true);

DROP POLICY IF EXISTS social_tips_insert_own ON social_tips;
CREATE POLICY social_tips_insert_own ON social_tips
  FOR INSERT
  WITH CHECK (
    current_setting('app.current_user_address', true) IS NOT NULL
    AND current_setting('app.current_user_address', true) <> ''
    AND LOWER(sender_address) = LOWER(current_setting('app.current_user_address', true)::text)
  );

-- content_purchases: read if caller is buyer or seller; insert only as buyer.
DROP POLICY IF EXISTS content_purchases_read_party ON content_purchases;
CREATE POLICY content_purchases_read_party ON content_purchases
  FOR SELECT
  USING (
    LOWER(buyer_address)  = LOWER(current_setting('app.current_user_address', true)::text)
    OR LOWER(seller_address) = LOWER(current_setting('app.current_user_address', true)::text)
  );

DROP POLICY IF EXISTS content_purchases_insert_own ON content_purchases;
CREATE POLICY content_purchases_insert_own ON content_purchases
  FOR INSERT
  WITH CHECK (
    current_setting('app.current_user_address', true) IS NOT NULL
    AND current_setting('app.current_user_address', true) <> ''
    AND LOWER(buyer_address) = LOWER(current_setting('app.current_user_address', true)::text)
  );

-- message_tips: read if caller is tipper or recipient; insert only as tipper.
DROP POLICY IF EXISTS message_tips_read_party ON message_tips;
CREATE POLICY message_tips_read_party ON message_tips
  FOR SELECT
  USING (
    LOWER(tipper_address)    = LOWER(current_setting('app.current_user_address', true)::text)
    OR LOWER(recipient_address) = LOWER(current_setting('app.current_user_address', true)::text)
  );

DROP POLICY IF EXISTS message_tips_insert_own ON message_tips;
CREATE POLICY message_tips_insert_own ON message_tips
  FOR INSERT
  WITH CHECK (
    current_setting('app.current_user_address', true) IS NOT NULL
    AND current_setting('app.current_user_address', true) <> ''
    AND LOWER(tipper_address) = LOWER(current_setting('app.current_user_address', true)::text)
  );

COMMIT;

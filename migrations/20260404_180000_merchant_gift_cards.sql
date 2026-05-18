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

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_merchant_gift_cards_merchant_created
  ON merchant_gift_cards (merchant_address, purchased_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_merchant_gift_cards_code
  ON merchant_gift_cards (code);

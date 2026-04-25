-- Base merchants table (referenced by merchant_withdrawals, merchant_locations, etc.)
CREATE TABLE IF NOT EXISTS merchants (
    id SERIAL PRIMARY KEY,
    wallet_address VARCHAR(42) NOT NULL UNIQUE,
    vault_address VARCHAR(42),
    business_name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    description TEXT,
    logo_url VARCHAR(500),
    proof_score INTEGER DEFAULT 5000,
    is_registered BOOLEAN DEFAULT true,
    is_suspended BOOLEAN DEFAULT false,
    suspension_reason TEXT,
    total_sales NUMERIC(38, 18) DEFAULT 0,
    total_orders INTEGER DEFAULT 0,
    average_rating NUMERIC(3, 2) DEFAULT 0,
    review_count INTEGER DEFAULT 0,
    payout_address VARCHAR(42),
    auto_convert_enabled BOOLEAN DEFAULT false,
    registered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    suspended_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_merchants_wallet ON merchants(wallet_address);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_merchants_category ON merchants(category);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_merchants_registered ON merchants(is_registered) WHERE is_registered = true;

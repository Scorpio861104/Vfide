-- Base loans table for term loan tracking
CREATE TABLE IF NOT EXISTS loans (
    id SERIAL PRIMARY KEY,
    on_chain_id INTEGER NOT NULL,
    lender_address VARCHAR(42) NOT NULL,
    borrower_address VARCHAR(42),
    principal NUMERIC(38, 18) NOT NULL,
    interest_bps INTEGER NOT NULL,
    duration_seconds INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'active', 'repaid', 'defaulted', 'cancelled')),
    accepted_at TIMESTAMP WITH TIME ZONE,
    due_at TIMESTAMP WITH TIME ZONE,
    repaid_at TIMESTAMP WITH TIME ZONE,
    defaulted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_loans_lender ON loans(lender_address);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_loans_borrower ON loans(borrower_address);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_loans_status ON loans(status);

-- Flash loan tracking
CREATE TABLE IF NOT EXISTS flash_loans (
    id SERIAL PRIMARY KEY,
    lender_address VARCHAR(42) NOT NULL,
    borrower_address VARCHAR(42) NOT NULL,
    amount NUMERIC(38, 18) NOT NULL,
    fee NUMERIC(38, 18) NOT NULL,
    protocol_fee NUMERIC(38, 18) DEFAULT 0,
    tx_hash VARCHAR(66) NOT NULL,
    block_number BIGINT,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_flash_loans_lender ON flash_loans(lender_address);

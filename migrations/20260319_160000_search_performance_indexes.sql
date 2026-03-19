-- ════════════════════════════════════════════════════════
-- Search Performance Indexes
-- 2026-03-19 — Adds composite review index and merchant
-- directory FTS index for improved search performance
-- ════════════════════════════════════════════════════════

-- Composite index for rating queries: covers both product_id + status filter
-- Enables efficient avg rating computation without full table scan
CREATE INDEX IF NOT EXISTS idx_reviews_product_status
  ON merchant_reviews(product_id, status) INCLUDE (rating);

-- GIN index for merchant directory full-text search
CREATE INDEX IF NOT EXISTS idx_merchant_profiles_search
  ON merchant_profiles USING GIN(
    to_tsvector('english', coalesce(display_name, '') || ' ' || coalesce(tagline, '') || ' ' || coalesce(description, ''))
  );

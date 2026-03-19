-- Rollback: Search Performance Indexes

DROP INDEX IF EXISTS idx_reviews_product_status;
DROP INDEX IF EXISTS idx_merchant_profiles_search;

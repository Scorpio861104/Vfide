-- Rollback: Platform Categories

ALTER TABLE merchant_products DROP COLUMN IF EXISTS platform_category_id;
DROP TABLE IF EXISTS platform_categories CASCADE;

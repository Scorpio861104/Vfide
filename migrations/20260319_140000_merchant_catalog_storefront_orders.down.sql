-- Rollback: Merchant product catalog, storefront profiles, orders, reviews, bookings, digital goods
-- Reverse of 20260319_140000_merchant_catalog_storefront_orders.sql

BEGIN;

DROP TABLE IF EXISTS merchant_digital_deliveries CASCADE;
DROP TABLE IF EXISTS merchant_digital_assets CASCADE;
DROP TABLE IF EXISTS merchant_bookings CASCADE;
DROP TABLE IF EXISTS merchant_service_slots CASCADE;
DROP TABLE IF EXISTS merchant_reviews CASCADE;
DROP TABLE IF EXISTS merchant_order_items CASCADE;
DROP TABLE IF EXISTS merchant_orders CASCADE;
DROP TABLE IF EXISTS merchant_product_variants CASCADE;
DROP TABLE IF EXISTS merchant_products CASCADE;
DROP TABLE IF EXISTS merchant_categories CASCADE;
DROP TABLE IF EXISTS merchant_profiles CASCADE;

COMMIT;

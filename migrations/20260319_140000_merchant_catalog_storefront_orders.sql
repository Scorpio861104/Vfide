-- Migration: Merchant product catalog, storefront profiles, orders, reviews, bookings, digital goods
-- Created: 2026-03-19T14:00:00.000Z

BEGIN;

-- ════════════════════════════════════════════════════════
-- MERCHANT PROFILES: Extended storefront info beyond on-chain registration
-- ════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS merchant_profiles (
  id SERIAL PRIMARY KEY,
  merchant_address VARCHAR(42) NOT NULL UNIQUE,
  slug VARCHAR(60) UNIQUE,  -- URL-friendly handle e.g. "bobs-coffee"
  display_name VARCHAR(120) NOT NULL,
  tagline VARCHAR(200),
  description TEXT,
  logo_url TEXT,
  banner_url TEXT,
  website VARCHAR(500),
  contact_email VARCHAR(254),
  phone VARCHAR(30),
  business_hours JSONB,  -- e.g. {"mon":"9:00-17:00","tue":"9:00-17:00",...}
  address_line1 VARCHAR(200),
  address_line2 VARCHAR(200),
  city VARCHAR(100),
  state_province VARCHAR(100),
  postal_code VARCHAR(20),
  country VARCHAR(2),  -- ISO 3166-1 alpha-2
  social_links JSONB,  -- e.g. {"twitter":"@bob","instagram":"bobscoffee"}
  theme_color VARCHAR(7),  -- hex e.g. "#3B82F6"
  accepts_crypto BOOLEAN NOT NULL DEFAULT true,
  shipping_enabled BOOLEAN NOT NULL DEFAULT false,
  pickup_enabled BOOLEAN NOT NULL DEFAULT false,
  digital_goods_enabled BOOLEAN NOT NULL DEFAULT false,
  services_enabled BOOLEAN NOT NULL DEFAULT false,
  status VARCHAR(20) NOT NULL DEFAULT 'active',  -- active, paused, suspended
  featured BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_merchant_profiles_slug ON merchant_profiles(slug);
CREATE INDEX IF NOT EXISTS idx_merchant_profiles_status ON merchant_profiles(status);
CREATE INDEX IF NOT EXISTS idx_merchant_profiles_featured ON merchant_profiles(featured) WHERE featured = true;

-- ════════════════════════════════════════════════════════
-- PRODUCT CATEGORIES: Hierarchical category tree per merchant
-- ════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS merchant_categories (
  id SERIAL PRIMARY KEY,
  merchant_address VARCHAR(42) NOT NULL,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL,
  parent_id INTEGER REFERENCES merchant_categories(id) ON DELETE SET NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(merchant_address, slug)
);

CREATE INDEX IF NOT EXISTS idx_merchant_categories_merchant ON merchant_categories(merchant_address);

-- ════════════════════════════════════════════════════════
-- PRODUCTS: Persistent product catalog
-- ════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS merchant_products (
  id SERIAL PRIMARY KEY,
  merchant_address VARCHAR(42) NOT NULL,
  category_id INTEGER REFERENCES merchant_categories(id) ON DELETE SET NULL,
  name VARCHAR(200) NOT NULL,
  slug VARCHAR(200) NOT NULL,
  description TEXT,
  short_description VARCHAR(500),
  price NUMERIC(18,2) NOT NULL,  -- USD price
  compare_at_price NUMERIC(18,2),  -- "Was $X" strikethrough price
  currency VARCHAR(10) NOT NULL DEFAULT 'USD',
  token_price NUMERIC(30,18),  -- Optional fixed crypto price
  token VARCHAR(20),  -- e.g. "VFIDE", "USDC"
  sku VARCHAR(100),
  inventory_count INTEGER,  -- NULL = unlimited
  inventory_tracking BOOLEAN NOT NULL DEFAULT false,
  product_type VARCHAR(20) NOT NULL DEFAULT 'physical',  -- physical, digital, service
  images JSONB NOT NULL DEFAULT '[]',  -- [{url,alt,sort_order}]
  metadata JSONB,  -- flexible key-value for custom fields
  tags TEXT[] NOT NULL DEFAULT '{}',
  weight_grams INTEGER,  -- for shipping calc
  status VARCHAR(20) NOT NULL DEFAULT 'active',  -- active, draft, archived
  featured BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  view_count INTEGER NOT NULL DEFAULT 0,
  sold_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(merchant_address, slug)
);

CREATE INDEX IF NOT EXISTS idx_products_merchant ON merchant_products(merchant_address);
CREATE INDEX IF NOT EXISTS idx_products_category ON merchant_products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_status ON merchant_products(status);
CREATE INDEX IF NOT EXISTS idx_products_type ON merchant_products(product_type);
CREATE INDEX IF NOT EXISTS idx_products_tags ON merchant_products USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_products_search ON merchant_products USING GIN(
  to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, '') || ' ' || coalesce(short_description, ''))
);

-- ════════════════════════════════════════════════════════
-- PRODUCT VARIANTS: Size, color, etc.
-- ════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS merchant_product_variants (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES merchant_products(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,  -- e.g. "Large / Blue"
  sku VARCHAR(100),
  price_override NUMERIC(18,2),  -- NULL = use product price
  inventory_count INTEGER,
  sort_order INTEGER NOT NULL DEFAULT 0,
  attributes JSONB NOT NULL DEFAULT '{}',  -- {"size":"L","color":"Blue"}
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_product_variants_product ON merchant_product_variants(product_id);

-- ════════════════════════════════════════════════════════
-- ORDERS: Full order lifecycle management
-- ════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS merchant_orders (
  id SERIAL PRIMARY KEY,
  order_number VARCHAR(30) NOT NULL UNIQUE,
  merchant_address VARCHAR(42) NOT NULL,
  customer_address VARCHAR(42),
  customer_email VARCHAR(254),
  customer_name VARCHAR(200),
  status VARCHAR(30) NOT NULL DEFAULT 'pending',
  -- pending → confirmed → processing → shipped → delivered → completed
  -- pending → cancelled | any → refunded
  payment_status VARCHAR(20) NOT NULL DEFAULT 'unpaid',  -- unpaid, paid, refunded, partial_refund
  payment_method VARCHAR(20) NOT NULL DEFAULT 'crypto',  -- crypto
  tx_hash VARCHAR(66),
  token VARCHAR(20),
  subtotal NUMERIC(18,2) NOT NULL,
  tax_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  shipping_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  total NUMERIC(18,2) NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'USD',
  shipping_address JSONB,  -- {line1,line2,city,state,postal,country}
  shipping_method VARCHAR(100),
  tracking_number VARCHAR(200),
  tracking_url TEXT,
  notes TEXT,
  customer_notes TEXT,
  invoice_id INTEGER,  -- optional link to merchant_invoices
  fulfilled_at TIMESTAMP,
  shipped_at TIMESTAMP,
  delivered_at TIMESTAMP,
  cancelled_at TIMESTAMP,
  refunded_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_orders_merchant ON merchant_orders(merchant_address);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON merchant_orders(customer_address);
CREATE INDEX IF NOT EXISTS idx_orders_status ON merchant_orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_payment ON merchant_orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON merchant_orders(created_at DESC);

-- ════════════════════════════════════════════════════════
-- ORDER ITEMS: Line items on each order
-- ════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS merchant_order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES merchant_orders(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES merchant_products(id) ON DELETE SET NULL,
  variant_id INTEGER REFERENCES merchant_product_variants(id) ON DELETE SET NULL,
  name VARCHAR(200) NOT NULL,
  sku VARCHAR(100),
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(18,2) NOT NULL,
  total NUMERIC(18,2) NOT NULL,
  product_type VARCHAR(20) NOT NULL DEFAULT 'physical',
  metadata JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON merchant_order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON merchant_order_items(product_id);

-- ════════════════════════════════════════════════════════
-- REVIEWS: Purchase-verified review system
-- ════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS merchant_reviews (
  id SERIAL PRIMARY KEY,
  merchant_address VARCHAR(42) NOT NULL,
  product_id INTEGER REFERENCES merchant_products(id) ON DELETE CASCADE,
  reviewer_address VARCHAR(42) NOT NULL,
  order_id INTEGER REFERENCES merchant_orders(id) ON DELETE SET NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title VARCHAR(200),
  body TEXT,
  verified_purchase BOOLEAN NOT NULL DEFAULT false,
  helpful_count INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'published',  -- published, hidden, flagged
  merchant_reply TEXT,
  merchant_replied_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(reviewer_address, product_id)  -- one review per product per customer
);

CREATE INDEX IF NOT EXISTS idx_reviews_merchant ON merchant_reviews(merchant_address);
CREATE INDEX IF NOT EXISTS idx_reviews_product ON merchant_reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer ON merchant_reviews(reviewer_address);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON merchant_reviews(rating);

-- ════════════════════════════════════════════════════════
-- SERVICE BOOKINGS: Appointment/booking slots for service merchants
-- ════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS merchant_service_slots (
  id SERIAL PRIMARY KEY,
  merchant_address VARCHAR(42) NOT NULL,
  product_id INTEGER NOT NULL REFERENCES merchant_products(id) ON DELETE CASCADE,
  day_of_week INTEGER,  -- 0=Sun..6=Sat  (NULL = specific date)
  specific_date DATE,   -- for one-off slots
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  max_bookings INTEGER NOT NULL DEFAULT 1,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (day_of_week IS NOT NULL OR specific_date IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_service_slots_merchant ON merchant_service_slots(merchant_address);
CREATE INDEX IF NOT EXISTS idx_service_slots_product ON merchant_service_slots(product_id);

CREATE TABLE IF NOT EXISTS merchant_bookings (
  id SERIAL PRIMARY KEY,
  merchant_address VARCHAR(42) NOT NULL,
  product_id INTEGER NOT NULL REFERENCES merchant_products(id) ON DELETE CASCADE,
  slot_id INTEGER REFERENCES merchant_service_slots(id) ON DELETE SET NULL,
  customer_address VARCHAR(42),
  customer_email VARCHAR(254),
  customer_name VARCHAR(200),
  booking_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'confirmed',  -- confirmed, cancelled, completed, no_show
  order_id INTEGER REFERENCES merchant_orders(id) ON DELETE SET NULL,
  notes TEXT,
  reminder_sent BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_bookings_merchant ON merchant_bookings(merchant_address);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON merchant_bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_customer ON merchant_bookings(customer_address);

-- ════════════════════════════════════════════════════════
-- DIGITAL GOODS: File/key delivery after payment
-- ════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS merchant_digital_assets (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES merchant_products(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  file_url TEXT NOT NULL,  -- secure signed URL or storage path
  file_size_bytes BIGINT,
  file_type VARCHAR(100),
  download_limit INTEGER,  -- NULL = unlimited
  expires_hours INTEGER,   -- NULL = never
  license_key_pool TEXT[],  -- for serial key delivery
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_digital_assets_product ON merchant_digital_assets(product_id);

CREATE TABLE IF NOT EXISTS merchant_digital_deliveries (
  id SERIAL PRIMARY KEY,
  asset_id INTEGER NOT NULL REFERENCES merchant_digital_assets(id) ON DELETE CASCADE,
  order_id INTEGER NOT NULL REFERENCES merchant_orders(id) ON DELETE CASCADE,
  customer_address VARCHAR(42),
  download_token VARCHAR(64) NOT NULL UNIQUE,
  download_count INTEGER NOT NULL DEFAULT 0,
  license_key VARCHAR(500),
  expires_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_digital_deliveries_order ON merchant_digital_deliveries(order_id);
CREATE INDEX IF NOT EXISTS idx_digital_deliveries_token ON merchant_digital_deliveries(download_token);

COMMIT;

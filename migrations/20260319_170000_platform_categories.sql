-- ════════════════════════════════════════════════════════
-- PLATFORM-WIDE CATEGORY TAXONOMY
-- Global category tree that all merchants map products to,
-- enabling cross-merchant category browsing on the marketplace.
-- ════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS platform_categories (
  id SERIAL PRIMARY KEY,
  parent_id INTEGER REFERENCES platform_categories(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(120) NOT NULL UNIQUE,
  icon VARCHAR(50),             -- lucide icon name for UI
  description VARCHAR(500),
  sort_order INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'active',  -- active, hidden
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_platform_cat_parent ON platform_categories(parent_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_platform_cat_slug ON platform_categories(slug);

-- Add platform_category_id to merchant_products
ALTER TABLE merchant_products
  ADD COLUMN IF NOT EXISTS platform_category_id INTEGER REFERENCES platform_categories(id) ON DELETE SET NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_platform_cat ON merchant_products(platform_category_id);

-- ════════════════════════════════════════════════════════
-- SEED: Common top-level + second-level categories
-- Modeled after Amazon/eBay standard taxonomy
-- ════════════════════════════════════════════════════════

INSERT INTO platform_categories (name, slug, icon, sort_order) VALUES
  ('Electronics',         'electronics',        'Cpu',           1),
  ('Computers',           'computers',          'Monitor',       2),
  ('Clothing & Fashion',  'clothing-fashion',   'Shirt',         3),
  ('Home & Kitchen',      'home-kitchen',       'Home',          4),
  ('Health & Beauty',     'health-beauty',      'Heart',         5),
  ('Sports & Outdoors',   'sports-outdoors',    'Dumbbell',      6),
  ('Toys & Games',        'toys-games',         'Gamepad2',      7),
  ('Books & Media',       'books-media',        'BookOpen',      8),
  ('Automotive',          'automotive',         'Car',           9),
  ('Food & Grocery',      'food-grocery',       'UtensilsCrossed', 10),
  ('Art & Collectibles',  'art-collectibles',   'Palette',       11),
  ('Digital Goods',       'digital-goods',      'Download',      12),
  ('Services',            'services',           'Briefcase',     13),
  ('Pet Supplies',        'pet-supplies',       'PawPrint',      14),
  ('Baby & Kids',         'baby-kids',          'Baby',          15),
  ('Office & School',     'office-school',      'GraduationCap', 16),
  ('Jewelry & Watches',   'jewelry-watches',    'Gem',           17),
  ('Garden & Outdoor',    'garden-outdoor',     'Flower2',       18),
  ('Music & Instruments', 'music-instruments',  'Music',         19),
  ('Crypto & Web3',       'crypto-web3',        'Coins',         20)
ON CONFLICT (slug) DO NOTHING;

-- ── Sub-categories (Electronics) ──
INSERT INTO platform_categories (parent_id, name, slug, sort_order) VALUES
  ((SELECT id FROM platform_categories WHERE slug='electronics'), 'Smartphones',      'smartphones',        1),
  ((SELECT id FROM platform_categories WHERE slug='electronics'), 'Audio & Headphones','audio-headphones',   2),
  ((SELECT id FROM platform_categories WHERE slug='electronics'), 'Cameras & Photo',  'cameras-photo',      3),
  ((SELECT id FROM platform_categories WHERE slug='electronics'), 'Wearable Tech',    'wearable-tech',      4),
  ((SELECT id FROM platform_categories WHERE slug='electronics'), 'TV & Video',       'tv-video',           5),
  ((SELECT id FROM platform_categories WHERE slug='electronics'), 'Accessories',      'electronics-accessories', 6)
ON CONFLICT (slug) DO NOTHING;

-- ── Sub-categories (Computers) ──
INSERT INTO platform_categories (parent_id, name, slug, sort_order) VALUES
  ((SELECT id FROM platform_categories WHERE slug='computers'), 'Laptops',           'laptops',           1),
  ((SELECT id FROM platform_categories WHERE slug='computers'), 'Desktops',          'desktops',          2),
  ((SELECT id FROM platform_categories WHERE slug='computers'), 'Components & Parts','computer-components', 3),
  ((SELECT id FROM platform_categories WHERE slug='computers'), 'Networking',        'networking',        4),
  ((SELECT id FROM platform_categories WHERE slug='computers'), 'Software',          'software',          5),
  ((SELECT id FROM platform_categories WHERE slug='computers'), 'Peripherals',       'computer-peripherals', 6)
ON CONFLICT (slug) DO NOTHING;

-- ── Sub-categories (Clothing & Fashion) ──
INSERT INTO platform_categories (parent_id, name, slug, sort_order) VALUES
  ((SELECT id FROM platform_categories WHERE slug='clothing-fashion'), 'Men''s Clothing',   'mens-clothing',    1),
  ((SELECT id FROM platform_categories WHERE slug='clothing-fashion'), 'Women''s Clothing', 'womens-clothing',  2),
  ((SELECT id FROM platform_categories WHERE slug='clothing-fashion'), 'Shoes',             'shoes',            3),
  ((SELECT id FROM platform_categories WHERE slug='clothing-fashion'), 'Bags & Accessories','bags-accessories', 4),
  ((SELECT id FROM platform_categories WHERE slug='clothing-fashion'), 'Sunglasses',        'sunglasses',       5)
ON CONFLICT (slug) DO NOTHING;

-- ── Sub-categories (Home & Kitchen) ──
INSERT INTO platform_categories (parent_id, name, slug, sort_order) VALUES
  ((SELECT id FROM platform_categories WHERE slug='home-kitchen'), 'Furniture',     'furniture',        1),
  ((SELECT id FROM platform_categories WHERE slug='home-kitchen'), 'Kitchen & Dining','kitchen-dining', 2),
  ((SELECT id FROM platform_categories WHERE slug='home-kitchen'), 'Bedding & Bath','bedding-bath',     3),
  ((SELECT id FROM platform_categories WHERE slug='home-kitchen'), 'Decor',         'home-decor',       4),
  ((SELECT id FROM platform_categories WHERE slug='home-kitchen'), 'Lighting',      'lighting',         5),
  ((SELECT id FROM platform_categories WHERE slug='home-kitchen'), 'Smart Home',    'smart-home',       6)
ON CONFLICT (slug) DO NOTHING;

-- ── Sub-categories (Digital Goods) ──
INSERT INTO platform_categories (parent_id, name, slug, sort_order) VALUES
  ((SELECT id FROM platform_categories WHERE slug='digital-goods'), 'eBooks',           'ebooks',            1),
  ((SELECT id FROM platform_categories WHERE slug='digital-goods'), 'Digital Art & NFTs','digital-art-nfts', 2),
  ((SELECT id FROM platform_categories WHERE slug='digital-goods'), 'Templates & Themes','templates-themes', 3),
  ((SELECT id FROM platform_categories WHERE slug='digital-goods'), 'Online Courses',   'online-courses',    4),
  ((SELECT id FROM platform_categories WHERE slug='digital-goods'), 'Licenses & Keys',  'licenses-keys',     5)
ON CONFLICT (slug) DO NOTHING;

-- ── Sub-categories (Services) ──
INSERT INTO platform_categories (parent_id, name, slug, sort_order) VALUES
  ((SELECT id FROM platform_categories WHERE slug='services'), 'Web Development',    'web-development',   1),
  ((SELECT id FROM platform_categories WHERE slug='services'), 'Design & Creative',  'design-creative',   2),
  ((SELECT id FROM platform_categories WHERE slug='services'), 'Marketing',          'marketing-services', 3),
  ((SELECT id FROM platform_categories WHERE slug='services'), 'Consulting',         'consulting',        4),
  ((SELECT id FROM platform_categories WHERE slug='services'), 'Writing & Content',  'writing-content',   5),
  ((SELECT id FROM platform_categories WHERE slug='services'), 'Blockchain & Smart Contracts', 'blockchain-services', 6)
ON CONFLICT (slug) DO NOTHING;

-- ── Sub-categories (Crypto & Web3) ──
INSERT INTO platform_categories (parent_id, name, slug, sort_order) VALUES
  ((SELECT id FROM platform_categories WHERE slug='crypto-web3'), 'Hardware Wallets',  'hardware-wallets',  1),
  ((SELECT id FROM platform_categories WHERE slug='crypto-web3'), 'Mining Equipment',  'mining-equipment',  2),
  ((SELECT id FROM platform_categories WHERE slug='crypto-web3'), 'Merch & Apparel',   'crypto-merch',      3),
  ((SELECT id FROM platform_categories WHERE slug='crypto-web3'), 'Trading Tools',     'trading-tools',     4),
  ((SELECT id FROM platform_categories WHERE slug='crypto-web3'), 'DeFi & DAO Tools',  'defi-dao-tools',    5)
ON CONFLICT (slug) DO NOTHING;

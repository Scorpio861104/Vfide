/**
 * StoreClient — Interactive client island for the storefront
 * 
 * Handles: product grid, filtering, cart add, share link.
 * Receives server-fetched data as props (no client-side data fetch on mount).
 */
'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ShoppingCart, Share2, Filter, Grid, List, Package } from 'lucide-react';
import { MerchantTrustBadge } from '@/components/merchant/MerchantTrustBadge';
import { Footer } from '@/components/layout/Footer';
import { ProductCard } from './ProductCard';
import { ShareStoreSheet } from './ShareStoreSheet';

interface Product {
  id: string;
  name: string;
  slug: string;
  price: string;
  compare_at_price: string | null;
  images: (string | { url: string })[];
  product_type: string;
  description: string | null;
}

interface Merchant {
  merchant_address: string;
  display_name: string;
  theme_color: string | null;
}

interface StoreClientProps {
  merchant: Merchant;
  initialProducts: Product[];
  slug: string;
}

export function StoreClient({ merchant, initialProducts, slug }: StoreClientProps) {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'default' | 'price-asc' | 'price-desc'>('default');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showShare, setShowShare] = useState(false);

  const filtered = useMemo(() => {
    let result = initialProducts;

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q)
      );
    }

    if (sortBy === 'price-asc') {
      result = [...result].sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
    } else if (sortBy === 'price-desc') {
      result = [...result].sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
    }

    return result;
  }, [initialProducts, search, sortBy]);

  return (
    <>
      {/* Trust Badge */}
      <section className="border-b border-white/5">
        <div className="container mx-auto px-4 max-w-6xl py-4">
          <MerchantTrustBadge
            merchantAddress={merchant.merchant_address as `0x${string}`}
            variant="compact"
          />
        </div>
      </section>

      {/* Toolbar */}
      <section className="sticky top-20 z-30 bg-zinc-950/90 backdrop-blur-sm border-b border-white/5">
        <div className="container mx-auto px-4 max-w-6xl py-3">
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search products..."
                className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-gray-500 focus:border-cyan-500/50 focus:outline-none"
              />
            </div>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-gray-400 text-sm focus:outline-none"
            >
              <option value="default">Default</option>
              <option value="price-asc">Price: Low → High</option>
              <option value="price-desc">Price: High → Low</option>
            </select>

            {/* View toggle */}
            <div className="flex border border-white/10 rounded-xl overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2.5 ${viewMode === 'grid' ? 'bg-cyan-500/20 text-cyan-400' : 'text-gray-500 hover:text-white'}`}
              >
                <Grid size={16} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2.5 ${viewMode === 'list' ? 'bg-cyan-500/20 text-cyan-400' : 'text-gray-500 hover:text-white'}`}
              >
                <List size={16} />
              </button>
            </div>

            {/* Share */}
            <button
              onClick={() => setShowShare(true)}
              className="p-2.5 bg-white/5 border border-white/10 rounded-xl text-gray-400 hover:text-cyan-400 transition-colors"
            >
              <Share2 size={16} />
            </button>
          </div>
        </div>
      </section>

      {/* Product Grid */}
      <section className="py-8">
        <div className="container mx-auto px-4 max-w-6xl">
          {filtered.length === 0 ? (
            <div className="text-center py-16">
              <Package size={48} className="mx-auto mb-4 text-gray-600" />
              <p className="text-gray-400 text-lg">
                {search ? `No products match "${search}"` : 'No products available yet'}
              </p>
            </div>
          ) : (
            <div className={
              viewMode === 'grid'
                ? 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4'
                : 'space-y-3'
            }>
              <AnimatePresence mode="popLayout">
                {filtered.map((product, i) => (
                  <motion.div
                    key={product.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: i * 0.03 }}
                  >
                    <ProductCard
                      product={product}
                      merchantSlug={slug}
                      viewMode={viewMode}
                      themeColor={merchant.theme_color}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </section>

      <ShareStoreSheet
        show={showShare}
        onClose={() => setShowShare(false)}
        storeName={merchant.display_name}
        slug={slug}
      />

      <Footer />
    </>
  );
}

/**
 * StoreClient — Interactive client island for the storefront
 * 
 * Handles: product grid, filtering, cart add, share link.
 * Receives server-fetched data as props (no client-side data fetch on mount).
 */
'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ShoppingCart, Share2, Grid, List, Package, Minus, Plus, X } from 'lucide-react';
import { MerchantTrustBadge } from '@/components/merchant/MerchantTrustBadge';
import { Footer } from '@/components/layout/Footer';
import { CheckoutPanel } from '@/components/checkout/CheckoutPanel';
import { useCart } from '@/providers/CartProvider';
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
  const [showCheckout, setShowCheckout] = useState(false);
  const { items, itemCount, subtotal, updateQuantity, removeItem, clearCart } = useCart();

  const storeCartItems = useMemo(
    () => items.filter((item) => item.merchantSlug === slug),
    [items, slug]
  );

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

            {/* Cart */}
            <button
              type="button"
              onClick={() => {
                if (storeCartItems.length > 0) {
                  setShowCheckout((current) => !current);
                }
              }}
              aria-label={storeCartItems.length > 0 ? `View cart with ${itemCount} items` : 'Cart is empty'}
              className="relative p-2.5 bg-white/5 border border-white/10 rounded-xl text-gray-400 hover:text-cyan-400 transition-colors"
            >
              <ShoppingCart size={16} />
              {storeCartItems.length > 0 ? (
                <span className="absolute -right-1 -top-1 rounded-full bg-cyan-500 px-1.5 py-0.5 text-[10px] font-bold text-slate-950">
                  {itemCount}
                </span>
              ) : null}
            </button>

            {/* Share */}
            <button
              onClick={() => setShowShare(true)}
              aria-label="Share store"
              className="p-2.5 bg-white/5 border border-white/10 rounded-xl text-gray-400 hover:text-cyan-400 transition-colors"
            >
              <Share2 size={16} />
            </button>
          </div>
        </div>
      </section>

      {storeCartItems.length > 0 ? (
        <section className="border-b border-white/5 bg-cyan-500/5">
          <div className="container mx-auto max-w-6xl px-4 py-4">
            <div className="flex flex-col gap-4 rounded-2xl border border-cyan-500/20 bg-black/20 p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-bold text-white">{itemCount} item in cart{itemCount === 1 ? '' : 's'}</h2>
                  <p className="text-sm text-gray-400">Ready to check out with {merchant.display_name}</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <div className="text-xs text-gray-400">Subtotal</div>
                    <div className="text-base font-bold text-cyan-300">${subtotal.toFixed(2)}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowCheckout(true)}
                    className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-bold text-slate-950 transition hover:bg-cyan-400"
                  >
                    Checkout
                  </button>
                </div>
              </div>

              {!showCheckout ? (
                <div className="space-y-2">
                  {storeCartItems.map((item) => (
                    <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                      <div>
                        <div className="text-sm font-semibold text-white">{item.name}</div>
                        <div className="text-xs text-gray-400">${item.price.toFixed(2)} each</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          aria-label={`Decrease quantity for ${item.name}`}
                          onClick={() => updateQuantity(item.id, item.qty - 1)}
                          className="rounded-lg border border-white/10 p-1.5 text-gray-300 transition hover:text-white"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="min-w-6 text-center text-sm font-semibold text-white">{item.qty}</span>
                        <button
                          type="button"
                          aria-label={`Increase quantity for ${item.name}`}
                          onClick={() => updateQuantity(item.id, item.qty + 1)}
                          className="rounded-lg border border-white/10 p-1.5 text-gray-300 transition hover:text-white"
                        >
                          <Plus size={14} />
                        </button>
                        <button
                          type="button"
                          aria-label={`Remove ${item.name} from cart`}
                          onClick={() => removeItem(item.id)}
                          className="rounded-lg border border-white/10 p-1.5 text-gray-300 transition hover:text-red-300"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      {showCheckout && storeCartItems.length > 0 ? (
        <section className="border-b border-white/5 bg-black/20 py-8">
          <div className="container mx-auto max-w-6xl px-4">
            <CheckoutPanel
              items={storeCartItems.map((item) => ({
                name: item.name,
                price: item.price,
                qty: item.qty,
                imageUrl: item.imageUrl,
              }))}
              merchantAddress={merchant.merchant_address}
              merchantName={merchant.display_name}
              onCancel={() => setShowCheckout(false)}
              onComplete={() => {
                clearCart();
                setShowCheckout(false);
              }}
            />
          </div>
        </section>
      ) : null}

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

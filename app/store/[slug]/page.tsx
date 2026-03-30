/**
 * Public Merchant Storefront — /store/[slug]
 */
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useAccount } from 'wagmi';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { Star, MapPin, Package, ShoppingCart, ArrowLeft, ExternalLink, Globe, X, Plus, Minus, Search, CheckCircle, AlertCircle } from 'lucide-react';
import { getAuthHeaders } from '@/lib/auth/client';

interface MerchantProfile {
  merchant_address: string;
  slug: string;
  display_name: string;
  tagline: string | null;
  description: string | null;
  logo_url: string | null;
  banner_url: string | null;
  website: string | null;
  theme_color: string | null;
  city: string | null;
  state_province: string | null;
  country: string | null;
  social_links: Record<string, string> | null;
  business_hours: Record<string, string> | null;
  shipping_enabled: boolean;
  pickup_enabled: boolean;
  digital_goods_enabled: boolean;
  services_enabled: boolean;
  product_count: number;
  review_count: number;
  avg_rating: number | null;
  categories: { id: string; name: string; slug: string }[];
}

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: string;
  compare_at_price: string | null;
  product_type: 'physical' | 'digital' | 'service';
  images: string[];
  tags: string[];
  category_name: string | null;
  inventory_count: number | null;
  track_inventory: boolean;
  status: string;
}

interface Review {
  id: string;
  reviewer_address: string;
  rating: number;
  title: string | null;
  body: string | null;
  merchant_reply: string | null;
  created_at: string;
}

interface CartItem {
  product: Product;
  quantity: number;
}

export default function StorefrontPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const { address: walletAddress, isConnected } = useAccount();

  const [profile, setProfile] = useState<MerchantProfile | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewStats, setReviewStats] = useState<{ avg: number; total: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [checkoutState, setCheckoutState] = useState<'idle' | 'creating' | 'success' | 'error'>('idle');
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'products' | 'reviews' | 'about'>('products');
  const [productSearch, setProductSearch] = useState('');

  // Fetch profile + products + reviews in parallel
  useEffect(() => {
    if (!slug) {
      setError('Merchant not found');
      setLoading(false);
      return;
    }

    setLoading(true);

    Promise.all([
      fetch(`/api/merchant/profile?slug=${encodeURIComponent(slug)}`).then(r => r.ok ? r.json() : null),
      fetch(`/api/merchant/products?merchant=${encodeURIComponent(slug)}`).then(r => r.ok ? r.json() : null),
      fetch(`/api/merchant/reviews?merchant=${encodeURIComponent(slug)}&limit=10`).then(r => r.ok ? r.json() : null),
    ]).then(([profileData, productsData, reviewsData]) => {
      if (!profileData?.profile) {
        setError('Merchant not found');
        setLoading(false);
        return;
      }
      setProfile(profileData.profile);
      setProducts(productsData?.products ?? []);
      setReviews(reviewsData?.reviews ?? []);
      if (reviewsData?.stats) {
        setReviewStats({ avg: reviewsData.stats.avg_rating, total: reviewsData.stats.total_reviews });
      }
      setLoading(false);
    }).catch(() => {
      setError('Failed to load storefront');
      setLoading(false);
    });
  }, [slug]);

  const filteredProducts = products.filter(p => {
    const matchesCategory = !selectedCategory || p.category_name === selectedCategory;
    const matchesSearch = !productSearch || p.name.toLowerCase().includes(productSearch.toLowerCase())
      || (p.description?.toLowerCase().includes(productSearch.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  // Cart helpers
  const addToCart = useCallback((product: Product) => {
    setCart(prev => {
      const existing = prev.find(i => i.product.id === product.id);
      if (existing) {
        return prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { product, quantity: 1 }];
    });
  }, []);

  const updateCartQty = useCallback((productId: string, delta: number) => {
    setCart(prev =>
      prev.map(i => {
        if (i.product.id !== productId) return i;
        const newQty = i.quantity + delta;
        return newQty > 0 ? { ...i, quantity: newQty } : i;
      }).filter(i => i.quantity > 0)
    );
  }, []);

  const cartTotal = cart.reduce((s, i) => s + parseFloat(i.product.price) * i.quantity, 0);
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);

  const handleCheckout = useCallback(async () => {
    if (!profile || cart.length === 0) return;
    if (!isConnected || !walletAddress) {
      setCheckoutError('Connect your wallet to checkout.');
      setCheckoutState('error');
      return;
    }
    setCheckoutError(null);
    setCheckoutState('creating');
    try {
      const body = {
        merchant_address: profile.merchant_address,
        items: cart.map(i => ({
          product_id: i.product.id,
          name: i.product.name,
          quantity: i.quantity,
          unit_price: parseFloat(i.product.price),
        })),
        subtotal: cartTotal,
        tax_amount: 0,
        shipping_amount: 0,
        discount_amount: 0,
        total: cartTotal,
      };
      const res = await fetch('/api/merchant/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(body),
      });
      const data = await res.json() as { order?: { order_number?: string }; error?: string };
      if (!res.ok) throw new Error(data.error || 'Failed to place order');
      setOrderNumber(data.order?.order_number ?? null);
      setCart([]);
      setCheckoutState('success');
    } catch (e: unknown) {
      setCheckoutError(e instanceof Error ? e.message : 'Checkout failed');
      setCheckoutState('error');
    }
  }, [profile, cart, cartTotal, isConnected, walletAddress]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-gray-500 animate-pulse">Loading storefront...</div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 gap-4">
        <p className="text-gray-500 dark:text-gray-400">{error || 'Not found'}</p>
        <Link href="/merchants" className="text-blue-600 hover:underline flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Back to directory
        </Link>
      </div>
    );
  }

  const themeColor = profile.theme_color || '#3B82F6';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Banner */}
      <div className="relative h-48 md:h-64" style={{ backgroundColor: themeColor }}>
        {profile.banner_url && (
          <Image src={profile.banner_url} alt="" fill className="object-cover" sizes="100vw" />
        )}
        <div className="absolute inset-0 bg-black/20" />
        <Link
          href="/merchants"
          className="absolute top-4 left-4 text-white/80 hover:text-white flex items-center gap-1 text-sm"
        >
          <ArrowLeft className="w-4 h-4" /> Directory
        </Link>
      </div>

      {/* Profile header */}
      <div className="max-w-6xl mx-auto px-4 -mt-16 relative z-10">
        <div className="flex items-end gap-4 mb-6">
          {profile.logo_url ? (
            <img
              src={profile.logo_url}
              alt=""
              className="w-24 h-24 md:w-32 md:h-32 rounded-2xl border-4 border-white dark:border-gray-800 object-cover shadow-lg bg-white"
            />
          ) : (
            <div
              className="w-24 h-24 md:w-32 md:h-32 rounded-2xl border-4 border-white dark:border-gray-800 flex items-center justify-center text-white text-3xl font-bold shadow-lg"
              style={{ backgroundColor: themeColor }}
            >
              {profile.display_name[0]?.toUpperCase()}
            </div>
          )}
          <div className="pb-2">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">{profile.display_name}</h1>
            {profile.tagline && (
              <p className="text-gray-600 dark:text-gray-400 mt-1">{profile.tagline}</p>
            )}
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-500 dark:text-gray-400">
              {reviewStats && reviewStats.total > 0 && (
                <span className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                  {reviewStats.avg.toFixed(1)} ({reviewStats.total} review{reviewStats.total !== 1 ? 's' : ''})
                </span>
              )}
              {(profile.city || profile.country) && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {[profile.city, profile.state_province, profile.country].filter(Boolean).join(', ')}
                </span>
              )}
              {profile.website && (
                <a
                  href={profile.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-blue-600 hover:underline"
                >
                  <Globe className="w-3.5 h-3.5" /> Website
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700 mb-6">
          {(['products', 'reviews', 'about'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
                activeTab === tab
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {tab === 'products' ? `Products (${products.length})` : tab === 'reviews' ? `Reviews${reviewStats ? ` (${reviewStats.total})` : ''}` : 'About'}
            </button>
          ))}
        </div>

        {/* Products Tab */}
        {activeTab === 'products' && (
          <div>
            {/* In-store search bar */}
            <div className="mb-4 relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search products in this store..."
                value={productSearch}
                onChange={e => setProductSearch(e.target.value)}
                className="w-full pl-10 pr-8 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none"
                maxLength={100}
              />
              {productSearch && (
                <button onClick={() => setProductSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

          <div className="flex gap-6">
            {/* Categories sidebar */}
            {profile.categories && profile.categories.length > 0 && (
              <div className="hidden md:block w-48 flex-shrink-0">
                <h3 className="font-semibold text-sm text-gray-700 dark:text-gray-300 mb-2">Categories</h3>
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={`block w-full text-left px-3 py-1.5 text-sm rounded transition ${
                    !selectedCategory ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 font-medium' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  All
                </button>
                {profile.categories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.name)}
                    className={`block w-full text-left px-3 py-1.5 text-sm rounded transition ${
                      selectedCategory === cat.name ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 font-medium' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            )}

            {/* Product grid */}
            <div className="flex-1">
              {filteredProducts.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Package className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p>No products available</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredProducts.map(product => (
                    <motion.div
                      key={product.id}
                      className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow"
                      whileHover={{ y: -2 }}
                    >
                      {product.images?.[0] ? (
                        <div className="relative w-full h-40 overflow-hidden">
                          <Image src={product.images[0]} alt="" fill className="object-cover" sizes="(max-width: 768px) 50vw, 25vw" />
                        </div>
                      ) : (
                        <div className="w-full h-40 bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                          <Package className="w-8 h-8 text-gray-400" />
                        </div>
                      )}
                      <div className="p-4">
                        <h3 className="font-semibold text-gray-900 dark:text-white truncate">{product.name}</h3>
                        {product.description && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{product.description}</p>
                        )}
                        <div className="flex items-center justify-between mt-3">
                          <div>
                            <span className="text-lg font-bold" style={{ color: themeColor }}>
                              ${parseFloat(product.price).toFixed(2)}
                            </span>
                            {product.compare_at_price && parseFloat(product.compare_at_price) > parseFloat(product.price) && (
                              <span className="text-sm text-gray-400 line-through ml-2">
                                ${parseFloat(product.compare_at_price).toFixed(2)}
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() => addToCart(product)}
                            className="p-2 rounded-lg text-white transition hover:opacity-90"
                            style={{ backgroundColor: themeColor }}
                            disabled={product.track_inventory && (product.inventory_count ?? 0) <= 0}
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                        {product.track_inventory && (product.inventory_count ?? 0) <= 0 && (
                          <p className="text-xs text-red-500 mt-1">Out of stock</p>
                        )}
                        {product.category_name && (
                          <span className="text-xs text-gray-400 mt-1 inline-block">{product.category_name}</span>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>
          </div>
        )}

        {/* Reviews Tab */}
        {activeTab === 'reviews' && (
          <div className="max-w-2xl">
            {reviews.length === 0 ? (
              <p className="text-gray-500 py-8 text-center">No reviews yet</p>
            ) : (
              <div className="space-y-4">
                {reviews.map(review => (
                  <div key={review.id} className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map(s => (
                          <Star key={s} className={`w-4 h-4 ${s <= review.rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`} />
                        ))}
                      </div>
                      <span className="text-xs text-gray-400">
                        {new Date(review.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    {review.title && <h4 className="font-semibold text-gray-900 dark:text-white">{review.title}</h4>}
                    {review.body && <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{review.body}</p>}
                    <p className="text-xs text-gray-400 mt-2">
                      {review.reviewer_address.slice(0, 6)}...{review.reviewer_address.slice(-4)}
                    </p>
                    {review.merchant_reply && (
                      <div className="mt-3 pl-3 border-l-2 border-blue-300 dark:border-blue-700">
                        <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-1">Merchant Reply</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{review.merchant_reply}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* About Tab */}
        {activeTab === 'about' && (
          <div className="max-w-2xl space-y-6">
            {profile.description && (
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">About</h3>
                <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{profile.description}</p>
              </div>
            )}
            {profile.business_hours && Object.keys(profile.business_hours).length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Business Hours</h3>
                <div className="space-y-1">
                  {Object.entries(profile.business_hours).map(([day, hours]) => (
                    <div key={day} className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400 capitalize">{day}</span>
                      <span className="text-gray-900 dark:text-white">{hours}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {profile.social_links && Object.keys(profile.social_links).length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Social</h3>
                <div className="flex gap-3">
                  {Object.entries(profile.social_links).map(([platform, url]) => (
                    <a
                      key={platform}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline flex items-center gap-1 capitalize"
                    >
                      {platform} <ExternalLink className="w-3 h-3" />
                    </a>
                  ))}
                </div>
              </div>
            )}
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Capabilities</h3>
              <div className="flex flex-wrap gap-2">
                {profile.shipping_enabled && <span className="text-xs bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 px-2 py-1 rounded">Shipping</span>}
                {profile.pickup_enabled && <span className="text-xs bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 px-2 py-1 rounded">Pickup</span>}
                {profile.digital_goods_enabled && <span className="text-xs bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 px-2 py-1 rounded">Digital Goods</span>}
                {profile.services_enabled && <span className="text-xs bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 px-2 py-1 rounded">Services</span>}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Floating Cart Button */}
      {cartCount > 0 && (
        <button
          onClick={() => setShowCart(!showCart)}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2 text-white px-5 py-3 rounded-full shadow-lg hover:opacity-90 transition"
          style={{ backgroundColor: themeColor }}
        >
          <ShoppingCart className="w-5 h-5" />
          <span className="font-bold">{cartCount}</span>
          <span className="text-sm">${cartTotal.toFixed(2)}</span>
        </button>
      )}

      {/* Cart Drawer */}
      <AnimatePresence>
        {showCart && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/40 z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCart(false)}
            />
            <motion.div
              className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white dark:bg-gray-800 z-50 shadow-xl flex flex-col"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25 }}
            >
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Cart ({cartCount})</h2>
                <button onClick={() => setShowCart(false)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {cart.map(item => (
                  <div key={item.product.id} className="flex items-center gap-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white text-sm truncate">{item.product.name}</p>
                      <p className="text-sm text-gray-500">${parseFloat(item.product.price).toFixed(2)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateCartQty(item.product.id, -1)}
                        className="p-1 rounded bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-sm font-medium w-6 text-center text-gray-900 dark:text-white">{item.quantity}</span>
                      <button
                        onClick={() => updateCartQty(item.product.id, 1)}
                        className="p-1 rounded bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <p className="font-semibold text-sm text-gray-900 dark:text-white w-16 text-right">
                      ${(parseFloat(item.product.price) * item.quantity).toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>

              <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex justify-between mb-3">
                  <span className="font-medium text-gray-700 dark:text-gray-300">Total</span>
                  <span className="font-bold text-lg text-gray-900 dark:text-white">${cartTotal.toFixed(2)}</span>
                </div>
                <p className="text-xs text-gray-400 mb-3">
                  Pay with VFIDE tokens to {profile.display_name}
                </p>
                {checkoutState === 'success' ? (
                  <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-sm font-semibold py-3 justify-center">
                    <CheckCircle className="w-5 h-5" />
                    Order placed! #{orderNumber}
                  </div>
                ) : (
                  <>
                    {checkoutState === 'error' && checkoutError && (
                      <div className="flex items-center gap-2 text-red-500 text-xs mb-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        {checkoutError}
                      </div>
                    )}
                    <button
                      className="w-full py-3 rounded-lg text-white font-semibold transition hover:opacity-90 disabled:opacity-60"
                      style={{ backgroundColor: themeColor }}
                      onClick={handleCheckout}
                      disabled={checkoutState === 'creating' || cart.length === 0}
                    >
                      {checkoutState === 'creating' ? 'Placing order…' : 'Checkout'}
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Product Detail Page — Amazon-style individual product view
 * /product/[id]
 */
'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Star, ChevronLeft, ChevronRight, ShoppingCart, Heart, Share2,
  Truck, ShieldCheck, Package, Zap, Check, AlertTriangle,
  MapPin, Store, ArrowLeft, MessageSquare, ThumbsUp, ChevronDown,
} from 'lucide-react';

/* ─── Types ─── */
interface ProductImage { url: string; alt: string; sort_order: number }
interface Variant {
  id: string; name: string; sku: string | null;
  price_override: string | null; inventory_count: number | null;
  attributes: Record<string, string>; status: string;
}
interface Product {
  id: string; name: string; slug: string; description: string | null;
  short_description: string | null; price: string; compare_at_price: string | null;
  currency: string; token_price: string | null; token: string | null;
  product_type: string; images: ProductImage[]; tags: string[];
  featured: boolean; sold_count: number; view_count: number;
  inventory_count: number | null; inventory_tracking: boolean;
  merchant_address: string; merchant_slug: string | null;
  merchant_name: string | null; merchant_logo: string | null;
  merchant_theme: string | null; merchant_ships: boolean;
  category_name: string | null; category_slug: string | null;
  platform_category_id: number | null;
  platform_category_slug: string | null; platform_category_name: string | null;
  platform_parent_category_slug: string | null; platform_parent_category_name: string | null;
  avg_rating: number; review_count: number;
  variants: Variant[] | null;
  created_at: string;
}
interface RelatedProduct {
  id: string; name: string; slug: string; price: string;
  compare_at_price: string | null; images: ProductImage[];
  product_type: string; sold_count: number;
  merchant_slug: string; merchant_name: string;
  avg_rating: number; review_count: number;
}
interface Review {
  id: string; rating: number; title: string | null; body: string | null;
  reviewer_address: string; verified_purchase: boolean;
  helpful_count: number; merchant_reply: string | null;
  created_at: string;
}
interface ReviewStats {
  avg_rating: number; total_reviews: number;
  distribution: Record<string, number>;
}

/* ─── Helpers ─── */
function StarRating({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'lg' }) {
  const s = size === 'lg' ? 'w-5 h-5' : 'w-3.5 h-3.5';
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => {
        const fill = rating >= i ? 100 : rating >= i - 0.5 ? 50 : 0;
        return (
          <div key={i} className="relative">
            <Star className={`${s} text-gray-200 dark:text-gray-600`} />
            <div className="absolute inset-0 overflow-hidden" style={{ width: `${fill}%` }}>
              <Star className={`${s} text-amber-400 fill-amber-400`} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function formatCount(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

function percentSaving(price: string, compare: string): number {
  const p = parseFloat(price), c = parseFloat(compare);
  if (c <= p || c === 0) return 0;
  return Math.round(((c - p) / c) * 100);
}

/* ─── Recently Viewed (localStorage) ─── */
function addToRecentlyViewed(product: { id: string; name: string; price: string; images: ProductImage[]; merchant_slug: string | null }) {
  try {
    const KEY = 'vfide_recently_viewed';
    const existing = JSON.parse(localStorage.getItem(KEY) || '[]') as Array<{ id: string }>;
    const filtered = existing.filter((p: { id: string }) => p.id !== product.id);
    const entry: { id: string; name: string; price: string; image?: string; merchant_slug: string | null } = { id: product.id, name: product.name, price: product.price, image: product.images?.[0]?.url, merchant_slug: product.merchant_slug };
    filtered.unshift(entry);
    localStorage.setItem(KEY, JSON.stringify(filtered.slice(0, 20)));
  } catch { /* ignore */ }
}

function getRecentlyViewed(): Array<{ id: string; name: string; price: string; image?: string; merchant_slug?: string }> {
  try { return JSON.parse(localStorage.getItem('vfide_recently_viewed') || '[]'); } catch { return []; }
}

/* ─── Wishlist (localStorage) ─── */
function toggleWishlist(productId: string): boolean {
  try {
    const KEY = 'vfide_wishlist';
    const list = JSON.parse(localStorage.getItem(KEY) || '[]') as string[];
    const idx = list.indexOf(productId);
    if (idx >= 0) { list.splice(idx, 1); } else { list.push(productId); }
    localStorage.setItem(KEY, JSON.stringify(list));
    return idx < 0; // true = added
  } catch { return false; }
}

function isInWishlist(productId: string): boolean {
  try { return (JSON.parse(localStorage.getItem('vfide_wishlist') || '[]') as string[]).includes(productId); } catch { return false; }
}

/* ─── Main Component ─── */
export default function ProductDetailPage() {
  const params = useParams();
  const id = params?.id as string;

  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<RelatedProduct[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewStats, setReviewStats] = useState<ReviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // UI state
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [wishlisted, setWishlisted] = useState(false);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [recentlyViewed, setRecentlyViewed] = useState<Array<{ id: string; name: string; price: string; image?: string }>>([]);

  // Fetch product + reviews
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setSelectedImage(0);
    setQuantity(1);

    Promise.all([
      fetch(`/api/merchant/products?id=${encodeURIComponent(id)}`).then(r => r.ok ? r.json() : null),
      fetch(`/api/merchant/reviews?product_id=${encodeURIComponent(id)}&limit=10&sort=helpful`).then(r => r.ok ? r.json() : null),
    ]).then(([productData, reviewData]) => {
      if (!productData?.product) {
        setError('Product not found');
        setLoading(false);
        return;
      }
      setProduct(productData.product);
      setRelated(productData.related ?? []);
      setReviews(reviewData?.reviews ?? []);
      if (reviewData?.stats) setReviewStats(reviewData.stats);

      // Track view
      addToRecentlyViewed(productData.product);
      setWishlisted(isInWishlist(productData.product.id));

      // Load recently viewed (exclude current)
      setRecentlyViewed(getRecentlyViewed().filter(p => p.id !== productData.product.id).slice(0, 8));
      setLoading(false);
    }).catch(() => { setError('Failed to load product'); setLoading(false); });
  }, [id]);

  // Variant handling
  const activeVariant = useMemo(() =>
    selectedVariant && product?.variants
      ? product.variants.find(v => v.id === selectedVariant) : null
  , [selectedVariant, product]);

  const displayPrice = activeVariant?.price_override
    ? parseFloat(activeVariant.price_override)
    : product ? parseFloat(product.price) : 0;

  const images = product?.images?.length ? product.images : [{ url: '', alt: '', sort_order: 0 }];
  const inStock = product?.inventory_tracking
    ? (activeVariant ? (activeVariant.inventory_count ?? 0) > 0 : (product.inventory_count ?? 0) > 0)
    : true;
  const stockCount = activeVariant?.inventory_count ?? product?.inventory_count;
  const lowStock = product?.inventory_tracking && inStock && stockCount != null && stockCount <= 5;

  const handleImageNav = (dir: number) => {
    setSelectedImage(prev => {
      const next = prev + dir;
      if (next < 0) return images.length - 1;
      if (next >= images.length) return 0;
      return next;
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-pulse text-gray-400">Loading product...</div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex flex-col items-center justify-center gap-4">
        <Package className="w-16 h-16 text-gray-300" />
        <p className="text-gray-500">{error || 'Product not found'}</p>
        <Link href="/marketplace" className="text-blue-600 hover:underline flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Back to marketplace
        </Link>
      </div>
    );
  }

  const saving = product.compare_at_price ? percentSaving(product.price, product.compare_at_price) : 0;
  const themeColor = product.merchant_theme || '#2563EB';

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Breadcrumb */}
      <div className="max-w-7xl mx-auto px-4 py-3 text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1 flex-wrap">
        <Link href="/marketplace" className="hover:text-blue-600 hover:underline">Marketplace</Link>
        <span>/</span>
        {product.platform_parent_category_slug && (
          <>
            <Link href={`/marketplace?platform_category=${product.platform_parent_category_slug}`} className="hover:text-blue-600 hover:underline">{product.platform_parent_category_name}</Link>
            <span>/</span>
          </>
        )}
        {product.platform_category_slug && !product.platform_parent_category_slug && (
          <>
            <Link href={`/marketplace?platform_category=${product.platform_category_slug}`} className="hover:text-blue-600 hover:underline">{product.platform_category_name}</Link>
            <span>/</span>
          </>
        )}
        {product.platform_category_slug && product.platform_parent_category_slug && (
          <>
            <Link href={`/marketplace?platform_category=${product.platform_category_slug}`} className="hover:text-blue-600 hover:underline">{product.platform_category_name}</Link>
            <span>/</span>
          </>
        )}
        {product.merchant_slug && (
          <>
            <Link href={`/store/${product.merchant_slug}`} className="hover:text-blue-600 hover:underline">{product.merchant_name || product.merchant_slug}</Link>
            <span>/</span>
          </>
        )}
        {product.category_name && (
          <>
            <span>{product.category_name}</span>
            <span>/</span>
          </>
        )}
        <span className="text-gray-700 dark:text-gray-200 truncate max-w-xs">{product.name}</span>
      </div>

      {/* Main Product Section */}
      <div className="max-w-7xl mx-auto px-4 pb-12">
        <div className="grid lg:grid-cols-2 gap-8 xl:gap-12">

          {/* ── Left: Image Gallery ── */}
          <div>
            {/* Main image */}
            <div className="relative aspect-square bg-gray-100 dark:bg-gray-800 rounded-2xl overflow-hidden group">
              {images[selectedImage]?.url ? (
                <img
                  src={images[selectedImage].url}
                  alt={images[selectedImage].alt || product.name}
                  className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-110"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="w-20 h-20 text-gray-300 dark:text-gray-600" />
                </div>
              )}

              {/* Nav arrows */}
              {images.length > 1 && (
                <>
                  <button
                    onClick={() => handleImageNav(-1)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 p-2 bg-white/80 dark:bg-gray-900/80 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white dark:hover:bg-gray-900"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleImageNav(1)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-white/80 dark:bg-gray-900/80 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white dark:hover:bg-gray-900"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}

              {/* Badges */}
              <div className="absolute top-3 left-3 flex flex-col gap-1.5">
                {saving > 0 && (
                  <span className="bg-red-600 text-white text-xs font-bold px-2.5 py-1 rounded-md">-{saving}%</span>
                )}
                {product.featured && (
                  <span className="bg-amber-500 text-white text-xs font-bold px-2.5 py-1 rounded-md flex items-center gap-1"><Zap className="w-3 h-3" /> Best Seller</span>
                )}
              </div>
            </div>

            {/* Thumbnail strip */}
            {images.length > 1 && (
              <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
                {images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImage(i)}
                    className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition ${
                      i === selectedImage ? 'border-blue-600 ring-2 ring-blue-200' : 'border-gray-200 dark:border-gray-700 hover:border-gray-400'
                    }`}
                  >
                    {img.url ? (
                      <img src={img.url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                        <Package className="w-4 h-4 text-gray-400" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── Right: Product Info ── */}
          <div>
            {/* Title */}
            <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white leading-tight">
              {product.name}
            </h1>

            {/* Merchant + rating row */}
            <div className="flex flex-wrap items-center gap-3 mt-2">
              {product.merchant_slug && (
                <Link
                  href={`/store/${product.merchant_slug}`}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                >
                  <Store className="w-3.5 h-3.5" /> {product.merchant_name || product.merchant_slug}
                </Link>
              )}
              {product.review_count > 0 && (
                <button
                  onClick={() => document.getElementById('reviews-section')?.scrollIntoView({ behavior: 'smooth' })}
                  className="flex items-center gap-1.5 text-sm hover:text-blue-600"
                >
                  <StarRating rating={product.avg_rating} />
                  <span className="text-blue-600 dark:text-blue-400">{formatCount(Number(product.review_count))} rating{Number(product.review_count) !== 1 ? 's' : ''}</span>
                </button>
              )}
              {product.sold_count > 50 && (
                <span className="text-sm text-gray-500">{formatCount(product.sold_count)}+ bought</span>
              )}
            </div>

            <hr className="my-4 border-gray-200 dark:border-gray-700" />

            {/* Price block */}
            <div className="mb-4">
              {saving > 0 && (
                <div className="flex items-center gap-2 mb-1">
                  <span className="bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded">{saving}% off</span>
                  <span className="text-sm text-gray-500">Deal</span>
                </div>
              )}
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-gray-900 dark:text-white">
                  ${displayPrice.toFixed(2)}
                </span>
                {product.compare_at_price && parseFloat(product.compare_at_price) > parseFloat(product.price) && (
                  <span className="text-lg text-gray-400 line-through">
                    ${parseFloat(product.compare_at_price).toFixed(2)}
                  </span>
                )}
              </div>
              {product.token_price && product.token && (
                <p className="text-sm text-gray-500 mt-1">
                  Or pay {parseFloat(product.token_price).toFixed(2)} {product.token} tokens
                </p>
              )}
            </div>

            {/* Short description */}
            {product.short_description && (
              <p className="text-gray-700 dark:text-gray-300 text-sm mb-4">{product.short_description}</p>
            )}

            {/* Stock status */}
            <div className="mb-4">
              {inStock ? (
                <p className="text-green-600 dark:text-green-400 font-semibold flex items-center gap-1.5">
                  <Check className="w-4 h-4" /> In Stock
                  {lowStock && <span className="text-orange-500 font-normal text-sm">— Only {stockCount} left!</span>}
                </p>
              ) : (
                <p className="text-red-600 dark:text-red-400 font-semibold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" /> Out of Stock
                </p>
              )}
            </div>

            {/* Variants */}
            {product.variants && product.variants.length > 0 && (
              <div className="mb-4">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Options</p>
                <div className="flex flex-wrap gap-2">
                  {product.variants.map(v => (
                    <button
                      key={v.id}
                      onClick={() => setSelectedVariant(v.id === selectedVariant ? null : v.id)}
                      className={`px-3 py-2 rounded-lg border text-sm font-medium transition ${
                        v.id === selectedVariant
                          ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 ring-1 ring-blue-600'
                          : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-400'
                      } ${v.inventory_count === 0 ? 'opacity-50 line-through' : ''}`}
                      disabled={v.inventory_count === 0}
                    >
                      {v.name}
                      {v.price_override && <span className="ml-1 text-gray-400">(${parseFloat(v.price_override).toFixed(2)})</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity + Add to cart */}
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
                <button
                  onClick={() => setQuantity(q => Math.max(1, q - 1))}
                  className="px-3 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 font-bold"
                >
                  −
                </button>
                <span className="px-4 py-2 font-semibold text-gray-900 dark:text-white min-w-[3rem] text-center">
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity(q => Math.min(99, q + 1))}
                  className="px-3 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 font-bold"
                >
                  +
                </button>
              </div>

              <button
                disabled={!inStock}
                className="flex-1 py-3 rounded-xl font-bold text-white transition hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                style={{ backgroundColor: inStock ? themeColor : '#9CA3AF' }}
                onClick={() => alert(`Added ${quantity}× ${product.name} to cart — checkout integration coming soon`)}
              >
                <ShoppingCart className="w-5 h-5" />
                Add to Cart
              </button>

              <button
                onClick={() => { setWishlisted(toggleWishlist(product.id)); }}
                className={`p-3 rounded-xl border transition ${
                  wishlisted
                    ? 'border-red-300 bg-red-50 dark:bg-red-900/20 text-red-500'
                    : 'border-gray-300 dark:border-gray-600 text-gray-400 hover:text-red-400 hover:border-red-300'
                }`}
                title={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
              >
                <Heart className={`w-5 h-5 ${wishlisted ? 'fill-red-500' : ''}`} />
              </button>
            </div>

            {/* Trust badges */}
            <div className="grid grid-cols-2 gap-2 mb-6 text-xs text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-800 rounded-lg p-2.5">
                <ShieldCheck className="w-4 h-4 text-green-500 flex-shrink-0" /> Crypto-secured payment
              </div>
              {product.merchant_ships && (
                <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-800 rounded-lg p-2.5">
                  <Truck className="w-4 h-4 text-blue-500 flex-shrink-0" /> Shipping available
                </div>
              )}
              <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-800 rounded-lg p-2.5">
                <Zap className="w-4 h-4 text-amber-500 flex-shrink-0" /> Zero processing fees
              </div>
              {product.product_type === 'digital' && (
                <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-800 rounded-lg p-2.5">
                  <Package className="w-4 h-4 text-purple-500 flex-shrink-0" /> Instant delivery
                </div>
              )}
            </div>

            {/* Tags */}
            {product.tags?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-4">
                {product.tags.map(tag => (
                  <Link
                    key={tag}
                    href={`/marketplace?q=${encodeURIComponent(tag)}`}
                    className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2 py-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                  >
                    {tag}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Full Description ── */}
        {product.description && (
          <div className="mt-10 border-t border-gray-200 dark:border-gray-700 pt-8">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Product Description</h2>
            <div className="prose dark:prose-invert max-w-none text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
              {product.description}
            </div>
          </div>
        )}

        {/* ── Reviews Section ── */}
        <div id="reviews-section" className="mt-10 border-t border-gray-200 dark:border-gray-700 pt-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Customer Reviews</h2>

          {reviewStats && Number(reviewStats.total_reviews) > 0 ? (
            <div className="grid md:grid-cols-[280px_1fr] gap-8">
              {/* Rating summary */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-5">
                <div className="text-center mb-4">
                  <p className="text-5xl font-bold text-gray-900 dark:text-white">{Number(reviewStats.avg_rating).toFixed(1)}</p>
                  <StarRating rating={Number(reviewStats.avg_rating)} size="lg" />
                  <p className="text-sm text-gray-500 mt-1">{reviewStats.total_reviews} review{Number(reviewStats.total_reviews) !== 1 ? 's' : ''}</p>
                </div>
                {/* Distribution bars */}
                {[5, 4, 3, 2, 1].map(star => {
                  const count = Number(reviewStats.distribution?.[star] ?? 0);
                  const pct = Number(reviewStats.total_reviews) > 0 ? (count / Number(reviewStats.total_reviews)) * 100 : 0;
                  return (
                    <div key={star} className="flex items-center gap-2 text-sm mb-1.5">
                      <span className="w-4 text-right text-gray-600 dark:text-gray-400">{star}</span>
                      <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                      <div className="flex-1 h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div className="h-full bg-amber-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="w-8 text-right text-gray-500 text-xs">{Math.round(pct)}%</span>
                    </div>
                  );
                })}
              </div>

              {/* Review list */}
              <div className="space-y-4">
                {(showAllReviews ? reviews : reviews.slice(0, 5)).map(review => (
                  <div key={review.id} className="border-b border-gray-100 dark:border-gray-800 pb-4">
                    <div className="flex items-center gap-2 mb-1">
                      <StarRating rating={review.rating} />
                      {review.title && <span className="font-semibold text-gray-900 dark:text-white text-sm">{review.title}</span>}
                    </div>
                    <p className="text-xs text-gray-400 mb-2">
                      {review.reviewer_address.slice(0, 6)}...{review.reviewer_address.slice(-4)}
                      {review.verified_purchase && <span className="ml-1.5 text-green-600 font-medium">✓ Verified Purchase</span>}
                      <span className="ml-1.5">{new Date(review.created_at).toLocaleDateString()}</span>
                    </p>
                    {review.body && <p className="text-sm text-gray-700 dark:text-gray-300">{review.body}</p>}
                    {review.helpful_count > 0 && (
                      <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                        <ThumbsUp className="w-3 h-3" /> {review.helpful_count} found this helpful
                      </p>
                    )}
                    {review.merchant_reply && (
                      <div className="mt-3 ml-4 pl-3 border-l-2 border-blue-300 dark:border-blue-700">
                        <p className="text-xs text-blue-600 font-medium flex items-center gap-1"><MessageSquare className="w-3 h-3" /> Merchant Response</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">{review.merchant_reply}</p>
                      </div>
                    )}
                  </div>
                ))}

                {reviews.length > 5 && !showAllReviews && (
                  <button
                    onClick={() => setShowAllReviews(true)}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                  >
                    See all {reviews.length} reviews <ChevronDown className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-center py-6">No reviews yet. Be the first to review this product!</p>
          )}
        </div>

        {/* ── Related Products ── */}
        {related.length > 0 && (
          <div className="mt-10 border-t border-gray-200 dark:border-gray-700 pt-8">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Related Products</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
              {related.map(rp => (
                <Link key={rp.id} href={`/product/${rp.id}`}>
                  <motion.div
                    className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow"
                    whileHover={{ y: -2 }}
                  >
                    {rp.images?.[0]?.url ? (
                      <img src={rp.images[0].url} alt="" className="w-full aspect-square object-cover" />
                    ) : (
                      <div className="w-full aspect-square bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                        <Package className="w-6 h-6 text-gray-400" />
                      </div>
                    )}
                    <div className="p-2">
                      <p className="text-xs font-medium text-gray-900 dark:text-white line-clamp-2">{rp.name}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <StarRating rating={rp.avg_rating} />
                        <span className="text-[10px] text-gray-400">{rp.review_count}</span>
                      </div>
                      <p className="text-sm font-bold text-gray-900 dark:text-white mt-1">${parseFloat(rp.price).toFixed(2)}</p>
                    </div>
                  </motion.div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* ── Recently Viewed ── */}
        {recentlyViewed.length > 0 && (
          <div className="mt-10 border-t border-gray-200 dark:border-gray-700 pt-8 pb-8">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Recently Viewed</h2>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {recentlyViewed.map(rv => (
                <Link key={rv.id} href={`/product/${rv.id}`} className="flex-shrink-0 w-32">
                  <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-sm transition-shadow">
                    {rv.image ? (
                      <img src={rv.image} alt="" className="w-full aspect-square object-cover" />
                    ) : (
                      <div className="w-full aspect-square bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                        <Package className="w-5 h-5 text-gray-400" />
                      </div>
                    )}
                    <div className="p-1.5">
                      <p className="text-[11px] text-gray-700 dark:text-gray-300 line-clamp-2">{rv.name}</p>
                      <p className="text-xs font-bold text-gray-900 dark:text-white">${parseFloat(rv.price).toFixed(2)}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

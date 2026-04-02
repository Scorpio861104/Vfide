/**
 * ProductDetailModal — Full product view with trust signals + social sharing
 */
'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import {
  X, Star, Package, ShoppingCart, Plus, Minus, ChevronRight,
  Heart, Truck, Download, Clock, CheckCircle2,
} from 'lucide-react';
import { ShareProductToFeed } from '@/components/social/SocialCommerce';
import { MerchantTrustBadge } from '@/components/merchant/MerchantTrustBadge';
import { type ProductDetail, type RelatedProduct, type ProductDetailModalProps } from './product-detail-types';
import { ProductImageGallery } from './ProductImageGallery';

export function ProductDetailModal({ productId, onClose, onAddToCart }: ProductDetailModalProps) {
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [related, setRelated] = useState<RelatedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  const [currentImage, setCurrentImage] = useState(0);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/merchant/products?id=${productId}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.product) {
          setProduct(data.product);
          setRelated(data.related || []);
          if (data.product.variants?.length > 0) setSelectedVariant(data.product.variants[0].id);
        }
        setLoading(false);
      }).catch(() => setLoading(false));
  }, [productId]);

  const handleAddToCart = () => {
    if (!product) return;
    onAddToCart?.(product.id, quantity, selectedVariant || undefined);
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2000);
  };

  const loadRelated = (id: string) => {
    setLoading(true); setCurrentImage(0); setQuantity(1);
    fetch(`/api/merchant/products?id=${id}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.product) { setProduct(data.product); setRelated(data.related || []); } setLoading(false); })
      .catch(() => setLoading(false));
  };

  const activePrice = product
    ? (selectedVariant && product.variants?.find(v => v.id === selectedVariant)?.price_override) || product.price
    : '0';
  const hasDiscount = product?.compare_at_price && parseFloat(product.compare_at_price) > parseFloat(activePrice);
  const discountPct = hasDiscount ? Math.round((1 - parseFloat(activePrice) / parseFloat(product!.compare_at_price!)) * 100) : 0;
  const inStock = !product?.track_inventory || (product?.inventory_count ?? 1) > 0;
  const typeIcons = { physical: Truck, digital: Download, service: Clock };
  const typeLabels = { physical: 'Ships worldwide', digital: 'Instant download', service: 'Book online' };

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 backdrop-blur-sm py-8 px-4" onClick={onClose}>
        <motion.div initial={{ opacity: 0, y: 30, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 30, scale: 0.98 }}
          className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
          <button onClick={onClose} className="absolute top-4 right-4 z-10 p-2 bg-black/50 rounded-full text-gray-400 hover:text-white transition-colors"><X size={20} /></button>

          {loading ? (
            <div className="py-24 text-center text-gray-500">
              <div className="w-6 h-6 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin mx-auto mb-3" />Loading product...
            </div>
          ) : !product ? (
            <div className="py-24 text-center text-gray-500">Product not found</div>
          ) : (
            <>
              <div className="flex flex-col md:flex-row">
                <div className="md:w-1/2 bg-black/30 relative">
                  <ProductImageGallery images={product.images} name={product.name} currentImage={currentImage}
                    setCurrentImage={setCurrentImage} discountPct={discountPct} hasDiscount={!!hasDiscount} />
                </div>

                <div className="md:w-1/2 p-6 flex flex-col">
                  {product.product_type && (
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs px-2 py-0.5 bg-cyan-500/10 border border-cyan-500/20 rounded text-cyan-400 capitalize flex items-center gap-1">
                        {(() => { const Icon = typeIcons[product.product_type]; return <Icon size={10} />; })()}
                        {typeLabels[product.product_type]}
                      </span>
                    </div>
                  )}

                  <h2 className="text-2xl font-bold text-white mb-2">{product.name}</h2>

                  {product.review_count > 0 && (
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map(i => (
                          <Star key={i} size={14} className={i <= Math.round(product.avg_rating ?? 0) ? 'text-amber-400 fill-amber-400' : 'text-gray-600'} />
                        ))}
                      </div>
                      <span className="text-sm text-gray-400">{(product.avg_rating ?? 0).toFixed(1)} ({product.review_count} reviews)</span>
                    </div>
                  )}

                  <div className="flex items-baseline gap-3 mb-4">
                    <span className="text-3xl font-bold text-cyan-400 font-mono">${parseFloat(activePrice).toFixed(2)}</span>
                    {hasDiscount && <span className="text-lg text-gray-500 line-through font-mono">${parseFloat(product.compare_at_price!).toFixed(2)}</span>}
                  </div>

                  {product.long_description && <p className="text-gray-400 text-sm leading-relaxed mb-4 line-clamp-4">{product.long_description}</p>}

                  {product.variants && product.variants.length > 0 && (
                    <div className="mb-4">
                      <div className="text-xs text-gray-500 mb-2">Options</div>
                      <div className="flex flex-wrap gap-2">
                        {product.variants.map(v => (
                          <button key={v.id} onClick={() => setSelectedVariant(v.id)}
                            className={`px-3 py-1.5 rounded-lg text-sm transition-all border ${selectedVariant === v.id ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-400' : 'bg-white/3 border-white/10 text-gray-400 hover:border-white/20'}`}>
                            {v.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex items-center border border-white/10 rounded-lg">
                      <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="px-3 py-2 text-gray-400 hover:text-white"><Minus size={14} /></button>
                      <span className="px-3 py-2 text-white font-mono text-sm min-w-[2rem] text-center">{quantity}</span>
                      <button onClick={() => setQuantity(q => q + 1)} className="px-3 py-2 text-gray-400 hover:text-white"><Plus size={14} /></button>
                    </div>
                    <button onClick={handleAddToCart} disabled={!inStock}
                      className={`flex-1 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${addedToCart ? 'bg-emerald-500 text-white' : inStock ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:scale-[1.01]' : 'bg-white/5 text-gray-500 cursor-not-allowed'}`}>
                      {addedToCart ? <><CheckCircle2 size={16} /> Added!</> : inStock ? <><ShoppingCart size={16} /> Add to cart</> : 'Out of stock'}
                    </button>
                    <button onClick={() => setIsWishlisted(!isWishlisted)} className="p-2.5 rounded-xl border border-white/10 hover:border-red-500/30">
                      <Heart size={18} className={isWishlisted ? 'text-red-400 fill-red-400' : 'text-gray-500'} />
                    </button>
                  </div>

                  <ShareProductToFeed product={{ id: product.id, name: product.name, price: activePrice, compareAtPrice: product.compare_at_price,
                    description: product.long_description, imageUrl: product.images[0] ? (typeof product.images[0] === 'string' ? product.images[0] : (product.images[0] as { url: string }).url) : null,
                    merchantSlug: product.merchant_slug, merchantName: product.merchant_name, merchantAddress: product.merchant_address }} className="mb-4" />

                  <Link href={`/store/${product.merchant_slug}`} className="mt-auto">
                    <div className="flex items-center gap-3 p-3 bg-white/3 border border-white/5 rounded-xl hover:border-cyan-500/20 transition-colors">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs bg-blue-500">{product.merchant_name[0]?.toUpperCase()}</div>
                      <div className="flex-1"><div className="text-white text-sm font-medium">{product.merchant_name}</div><div className="text-xs text-gray-500">View all products</div></div>
                      <ChevronRight size={16} className="text-gray-600" />
                    </div>
                  </Link>
                </div>
              </div>

              <div className="px-6 pb-4"><MerchantTrustBadge merchantAddress={product.merchant_address as `0x${string}`} variant="full" /></div>

              {related.length > 0 && (
                <div className="px-6 pb-6 border-t border-white/5 pt-4">
                  <h3 className="text-white font-bold mb-3">You might also like</h3>
                  <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                    {related.slice(0, 6).map(r => (
                      <div key={r.id} className="flex-shrink-0 w-36 cursor-pointer group" onClick={() => loadRelated(r.id)}>
                        <div className="aspect-square rounded-lg bg-white/5 overflow-hidden mb-2">
                          {r.imageUrl ? <img src={r.imageUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                            : <div className="w-full h-full flex items-center justify-center"><Package size={20} className="text-gray-600" /></div>}
                        </div>
                        <div className="text-xs text-white truncate">{r.name}</div>
                        <div className="text-xs text-cyan-400 font-mono">${parseFloat(r.price).toFixed(2)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

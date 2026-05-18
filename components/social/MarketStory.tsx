/**
 * MarketStory — "Today at my stall" merchant stories
 *
 * Like Instagram stories but for commerce. A merchant posts
 * photos of today's products. Buyers tap to see price and
 * buy instantly without leaving the feed.
 *
 * Features:
 *   - Product card overlay on story photo
 *   - Inline "Buy now" that triggers checkout
 *   - ProofScore trust badge on merchant
 *   - Share to WhatsApp
 *   - Auto-expire after 24 hours
 */
'use client';

import { useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, ShoppingCart, MessageCircle, ChevronUp, ChevronDown, MapPin } from 'lucide-react';
import { safeWindowOpen } from '@/lib/security/urlValidation';

interface StoryProduct {
  id: string;
  name: string;
  price: number;
  currency: string;
  imageUrl?: string;
  inStock: boolean;
}

export interface MarketStoryData {
  id: string;
  merchant: {
    address: string;
    name: string;
    proofScore: number;
    location?: string;
    avatar?: string;
  };
  products: StoryProduct[];
  caption: string;
  imageUrl: string;
  postedAt: number;
  expiresAt: number;
  views: number;
}

interface MarketStoryProps {
  story: MarketStoryData;
  onBuy?: (productId: string) => void;
  onWhatsApp?: (story: MarketStoryData) => void;
  onView?: (storyId: string) => void;
  compact?: boolean;
}

function timeUntilExpiry(expiresAt: number): string {
  const ms = expiresAt - Date.now();
  if (ms <= 0) return 'Expired';
  const hours = Math.floor(ms / 3600000);
  if (hours > 0) return `${hours}h left`;
  return `${Math.floor(ms / 60000)}m left`;
}

export function MarketStory({ story, onBuy, onWhatsApp, onView, compact = false }: MarketStoryProps) {
  const [showProducts, setShowProducts] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const isExpired = story.expiresAt < Date.now();
  const scoreColor = story.merchant.proofScore >= 8000 ? '#10B981' : story.merchant.proofScore >= 6500 ? '#06B6D4' : '#F59E0B';

  const handleWhatsApp = () => {
    const productList = story.products.map(p => `${p.name} — ${p.currency}${p.price}`).join('\n');
    const msg = `${story.merchant.name}'s market today:\n\n${productList}\n\n${story.caption}\n\nBuy on VFIDE!`;
    safeWindowOpen(`https://wa.me/?text=${encodeURIComponent(msg)}`, {
      allowRelative: false,
      allowedHosts: ['wa.me'],
    });
    onWhatsApp?.(story);
  };

  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-32 shrink-0 cursor-pointer"
        onClick={() => onView?.(story.id)}
      >
        <div className="relative w-32 h-44 rounded-xl overflow-hidden border-2"
          style={{ borderColor: isExpired ? 'rgba(255,255,255,0.1)' : `${scoreColor}60` }}>
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-10" />
          <div className="absolute inset-0 bg-zinc-800" />
          {story.imageUrl && <Image src={story.imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover"  width={48} height={48} />}
          <div className="absolute bottom-0 left-0 right-0 p-2 z-20">
            <div className="text-white text-[10px] font-bold truncate">{story.merchant.name}</div>
            <div className="text-gray-400 text-[9px]">{story.products.length} items · {timeUntilExpiry(story.expiresAt)}</div>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/3 border border-white/10 rounded-2xl overflow-hidden"
    >
      {/* Story image */}
      <div className="relative aspect-[4/3] bg-zinc-800">
        {story.imageUrl && <Image src={story.imageUrl} alt={story.caption} className="w-full h-full object-cover"  width={48} height={48} />}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30" />

        {/* Merchant info overlay (top) */}
        <div className="absolute top-0 left-0 right-0 p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-white/10 backdrop-blur flex items-center justify-center text-white font-bold text-xs border"
              style={{ borderColor: `${scoreColor}60` }}>
              {story.merchant.avatar || story.merchant.name[0]}
            </div>
            <div>
              <div className="text-white text-xs font-bold flex items-center gap-1">
                {story.merchant.name}
                <Shield size={10} style={{ color: scoreColor }} />
              </div>
              {story.merchant.location && (
                <div className="text-gray-300 text-[9px] flex items-center gap-0.5">
                  <MapPin size={8} />{story.merchant.location}
                </div>
              )}
            </div>
          </div>
          <span className="text-gray-300 text-[10px] bg-black/30 backdrop-blur px-2 py-0.5 rounded-full">
            {timeUntilExpiry(story.expiresAt)}
          </span>
        </div>

        {/* Caption overlay (bottom) */}
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <p className="text-white text-sm">{story.caption}</p>
        </div>

        {/* Product count badge */}
        <button onClick={() => setShowProducts(!showProducts)}
          className="absolute bottom-3 right-3 flex items-center gap-1 px-2.5 py-1.5 bg-cyan-500/80 backdrop-blur text-white rounded-full text-xs font-bold">
          <ShoppingCart size={12} />{story.products.length} items
          {showProducts ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
        </button>
      </div>

      {/* Product list (expandable) */}
      <AnimatePresence>
        {showProducts && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-3 space-y-2">
              {story.products.map(product => (
                <div key={product.id}
                  className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                    selectedProduct === product.id
                      ? 'bg-cyan-500/10 border-cyan-500/20'
                      : 'bg-white/2 border-white/5'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {product.imageUrl && (
                      <Image src={product.imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover"  width={48} height={48} />
                    )}
                    <div>
                      <div className="text-white text-sm font-medium">{product.name}</div>
                      <div className="text-gray-500 text-xs">
                        {product.inStock ? 'In stock' : <span className="text-red-400">Sold out</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-cyan-400 font-mono font-bold text-sm">{product.currency}{product.price}</span>
                    {product.inStock && onBuy && (
                      <button onClick={() => { setSelectedProduct(product.id); onBuy(product.id); }}
                        className="px-3 py-1.5 bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 rounded-lg text-xs font-bold">
                        Buy
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* WhatsApp share */}
            <div className="px-3 pb-3">
              <button onClick={handleWhatsApp}
                className="w-full py-2 flex items-center justify-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs font-bold">
                <MessageCircle size={14} />Share on WhatsApp
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick actions bar */}
      <div className="flex items-center gap-1 px-3 py-2 border-t border-white/5">
        <span className="text-gray-600 text-xs">{story.views} views</span>
        <span className="flex-1" />
        <button onClick={handleWhatsApp} className="p-1.5 rounded-lg text-gray-500 hover:text-emerald-400 hover:bg-emerald-500/10">
          <MessageCircle size={16} />
        </button>
        <button onClick={() => setShowProducts(!showProducts)} className="p-1.5 rounded-lg text-gray-500 hover:text-cyan-400 hover:bg-cyan-500/10">
          <ShoppingCart size={16} />
        </button>
      </div>
    </motion.div>
  );
}

// ── Market Stories Row (horizontal scroll like Instagram) ────────────────

interface MarketStoriesRowProps {
  stories: MarketStoryData[];
  onView: (storyId: string) => void;
}

export function MarketStoriesRow({ stories, onView }: MarketStoriesRowProps) {
  const activeStories = stories.filter(s => s.expiresAt > Date.now());
  if (activeStories.length === 0) return null;

  return (
    <div className="mb-4">
      <div className="text-xs font-bold text-gray-500 uppercase tracking-wider px-1 mb-2">Today at the market</div>
      <div className="flex gap-2.5 overflow-x-auto scrollbar-hide pb-1">
        {activeStories.map(story => (
          <MarketStory key={story.id} story={story} compact onView={onView} />
        ))}
      </div>
    </div>
  );
}

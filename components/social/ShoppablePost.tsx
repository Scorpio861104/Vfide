'use client';

import { useState } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { ArrowRight, Heart, MessageCircle, Share2, Shield, ShoppingCart, Store, Zap } from 'lucide-react';
import Link from 'next/link';
import { type ShoppablePostProps, formatTimeAgo } from './social-commerce-types';

export function ShoppablePost({ product, postedBy, timestamp, caption, likes = 0, comments = 0, className = '' }: ShoppablePostProps) {
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(likes);

  const handleLike = () => {
    setIsLiked(!isLiked);
    setLikeCount(prev => isLiked ? prev - 1 : prev + 1);
  };

  const shortAddr = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  const timeAgo = formatTimeAgo(timestamp);
  const hasDiscount = product.compareAtPrice && parseFloat(product.compareAtPrice) > parseFloat(product.price);
  const discountPct = hasDiscount ? Math.round((1 - parseFloat(product.price) / parseFloat(product.compareAtPrice!)) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white/3 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden ${className}`}
    >
      {/* Post header */}
      <div className="px-4 py-3 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-500/30 to-blue-500/30 flex items-center justify-center text-xs font-bold text-cyan-400">
          {postedBy.name[0]?.toUpperCase() || '?'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-white font-medium text-sm">{postedBy.name || shortAddr(postedBy.address)}</span>
            <span className="flex items-center gap-0.5 text-xs text-emerald-400">
              <Zap size={9} /> {postedBy.proofScore}
            </span>
          </div>
          <div className="text-xs text-gray-500">{timeAgo}</div>
        </div>
      </div>

      {/* Caption */}
      {caption && (
        <div className="px-4 pb-3 text-sm text-gray-300">{caption}</div>
      )}

      {/* Product card */}
      <Link href={`/store/${product.merchantSlug}?product=${product.id}`}>
        <div className="mx-4 mb-3 bg-white/3 border border-white/10 rounded-xl overflow-hidden hover:border-cyan-500/30 transition-colors cursor-pointer">
          {product.imageUrl && (
            <div className="relative h-48 bg-white/5">
              <Image src={product.imageUrl} alt={product.name} className="w-full h-full object-cover"  width={48} height={48} />
              {hasDiscount && (
                <div className="absolute top-2 right-2 px-2 py-1 bg-red-500 text-white text-xs font-bold rounded-lg">
                  -{discountPct}%
                </div>
              )}
            </div>
          )}
          <div className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-white font-medium mb-1">{product.name}</div>
                {product.description && (
                  <div className="text-xs text-gray-400 line-clamp-2 mb-2">{product.description}</div>
                )}
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Store size={12} />
                  <span>{product.merchantName}</span>
                  {product.merchantProofScore && (
                    <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 rounded">
                      <Shield size={9} /> {product.merchantProofScore}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-cyan-400 font-mono font-bold text-lg">${parseFloat(product.price).toFixed(2)}</div>
                {hasDiscount && (
                  <div className="text-xs text-gray-500 line-through">${parseFloat(product.compareAtPrice!).toFixed(2)}</div>
                )}
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs text-gray-500 capitalize">{product.productType || 'physical'}</span>
              <span className="text-xs text-cyan-400 flex items-center gap-1">
                View in store <ArrowRight size={12} />
              </span>
            </div>
          </div>
        </div>
      </Link>

      {/* Social actions */}
      <div className="px-4 py-3 border-t border-white/5 flex items-center gap-6">
        <button onClick={handleLike} className="flex items-center gap-1.5 text-sm transition-colors group">
          <Heart size={16} className={isLiked ? 'text-red-400 fill-red-400' : 'text-gray-500 group-hover:text-red-400'} />
          <span className={isLiked ? 'text-red-400' : 'text-gray-500'}>{likeCount}</span>
        </button>
        <button className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-cyan-400 transition-colors">
          <MessageCircle size={16} />
          <span>{comments}</span>
        </button>
        <button className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-cyan-400 transition-colors">
          <Share2 size={16} />
        </button>
        <Link
          href={`/store/${product.merchantSlug}`}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-xs font-bold rounded-lg hover:scale-[1.02] transition-transform"
        >
          <ShoppingCart size={12} /> Buy now
        </Link>
      </div>
    </motion.div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════════
// PurchaseProofEvent — Generated automatically after a purchase
// Shows in feed as "Alice bought from Bob's Fabrics"
// ═══════════════════════════════════════════════════════════════════════════════


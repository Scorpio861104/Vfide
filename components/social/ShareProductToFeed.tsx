'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
import { useAccount } from 'wagmi';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Package, Send, Share2, Store, X, Zap } from 'lucide-react';
import { toast } from '@/lib/toast';
import { type ShareProductToFeedProps } from './social-commerce-types';

export function ShareProductToFeed({ product, className = '' }: ShareProductToFeedProps) {
  const { address, isConnected } = useAccount();
  const [showModal, setShowModal] = useState(false);
  const [caption, setCaption] = useState('');
  const [isPosting, setIsPosting] = useState(false);

  const handlePost = async () => {
    if (!isConnected || !address) {
      toast.error('Connect your wallet to post.');
      return;
    }

    setIsPosting(true);
    try {
      // Post to social feed API with product metadata
      const res = await fetch('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'product_share',
          content: caption.trim() || `Check out ${product.name} from ${product.merchantName}!`,
          metadata: {
            productId: product.id,
            productName: product.name,
            productPrice: product.price,
            productImage: product.imageUrl,
            productType: product.productType || 'physical',
            merchantSlug: product.merchantSlug,
            merchantName: product.merchantName,
            merchantAddress: product.merchantAddress,
            merchantProofScore: product.merchantProofScore,
          },
        }),
      });

      if (!res.ok) throw new Error('Failed to post');

      toast.success('Posted to your feed!');
      setShowModal(false);
      setCaption('');
    } catch {
      toast.error('Failed to share. Try again.');
    }
    setIsPosting(false);
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-cyan-400 hover:border-cyan-500/30 transition-all text-sm ${className}`}
      >
        <Share2 size={14} />
        Share to feed
      </button>

      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-lg overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
                <h3 className="text-white font-bold flex items-center gap-2">
                  <Share2 size={18} className="text-cyan-400" />
                  Share to feed
                </h3>
                <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-white transition-colors">
                  <X size={18} />
                </button>
              </div>

              {/* Product preview */}
              <div className="px-5 py-4">
                <div className="flex items-start gap-3 bg-white/3 border border-white/5 rounded-xl p-3 mb-4">
                  {product.imageUrl ? (
                    <Image src={product.imageUrl} alt="" className="w-16 h-16 rounded-lg object-cover flex-shrink-0"  width={48} height={48} />
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
                      <Package size={20} className="text-gray-500" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-medium truncate">{product.name}</div>
                    <div className="text-cyan-400 font-mono font-bold">${parseFloat(product.price).toFixed(2)}</div>
                    <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                      <Store size={10} /> {product.merchantName}
                      {product.merchantProofScore && (
                        <span className="flex items-center gap-0.5 text-emerald-400">
                          <Zap size={9} /> {product.merchantProofScore}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Caption input */}
                <textarea
                  value={caption}
                  onChange={(e) =>  setCaption(e.target.value)}
                  placeholder="Add a caption... (optional)"
                  maxLength={500}
                  rows={3}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-gray-500 focus:border-cyan-500/50 focus:outline-none resize-none"
                />
                <div className="text-xs text-gray-500 text-right mt-1">{caption.length}/500</div>
              </div>

              {/* Actions */}
              <div className="px-5 py-4 border-t border-white/5 flex justify-end gap-3">
                <button onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-400 hover:text-white transition-colors text-sm">
                  Cancel
                </button>
                <button
                  onClick={handlePost}
                  disabled={isPosting}
                  className="px-6 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl font-bold text-sm flex items-center gap-2 hover:scale-[1.02] transition-transform disabled:opacity-50"
                >
                  {isPosting ? <><Loader2 size={14} className="animate-spin" /> Posting...</> : <><Send size={14} /> Post</>}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}


// ═══════════════════════════════════════════════════════════════════════════════
// ShoppablePost — Rendered in social feed when a product_share activity appears
// ═══════════════════════════════════════════════════════════════════════════════


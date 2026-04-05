/**
 * LiveSelling — Broadcast from your stall, sell in real-time
 *
 * Merchant goes live. Viewers watch. Product cards pop up.
 * Buyers tap to purchase without leaving the stream.
 * Purchase notifications animate across the screen.
 * ProofScore visible. Trust is part of the show.
 *
 * Uses getUserMedia for camera, WebSocket for real-time events.
 */
'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Video, VideoOff, ShoppingCart, Shield, Heart, Send, Users, X, MessageCircle, Mic, MicOff, RotateCcw, Package, Sparkles } from 'lucide-react';

interface LiveProduct {
  id: string; name: string; price: number; currency: string; imageUrl?: string; stock: number;
}

interface LiveComment {
  id: string; user: string; proofScore: number; text: string; timestamp: number;
}

interface LivePurchase {
  id: string; buyer: string; productName: string; amount: number; timestamp: number;
}

// ── Purchase notification that floats across the screen ──────────────────

function PurchaseToast({ purchase }: { purchase: LivePurchase }) {
  return (
    <motion.div
      initial={{ x: -200, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 300, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
      className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/20 backdrop-blur-lg border border-emerald-500/30 rounded-full"
    >
      <Sparkles size={12} className="text-emerald-400" />
      <span className="text-emerald-400 text-xs font-bold">{purchase.buyer} bought {purchase.productName}!</span>
      <span className="text-white text-xs font-mono">{purchase.amount}</span>
    </motion.div>
  );
}

// ── Live Viewer (for buyers watching a stream) ───────────────────────────

interface LiveViewerProps {
  merchantName: string;
  merchantScore: number;
  viewerCount: number;
  products: LiveProduct[];
  comments: LiveComment[];
  purchases: LivePurchase[];
  streamUrl?: string;
  onBuy?: (productId: string) => void;
  onComment?: (text: string) => void;
  onLike?: () => void;
  onClose?: () => void;
}

export function LiveViewer({
  merchantName, merchantScore, viewerCount,
  products, comments, purchases, streamUrl,
  onBuy, onComment, onLike, onClose,
}: LiveViewerProps) {
  const [commentText, setCommentText] = useState('');
  const [showProducts, setShowProducts] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [floatingHearts, setFloatingHearts] = useState<number[]>([]);
  const commentsEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll comments
  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments.length]);

  const handleLike = () => {
    setLikeCount(prev => prev + 1);
    const id = Date.now();
    setFloatingHearts(prev => [...prev, id]);
    setTimeout(() => setFloatingHearts(prev => prev.filter(h => h !== id)), 2000);
    onLike?.();
  };

  const handleSend = () => {
    if (!commentText.trim()) return;
    onComment?.(commentText);
    setCommentText('');
  };

  const scoreColor = merchantScore >= 8000 ? '#10B981' : merchantScore >= 6500 ? '#06B6D4' : '#F59E0B';

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Video area */}
      <div className="flex-1 relative bg-zinc-900">
        {streamUrl && <video src={streamUrl} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" />}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/40" />

        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-black/40 backdrop-blur rounded-full">
              <div className="w-7 h-7 rounded-full bg-red-500 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
              </div>
              <div>
                <div className="text-white text-xs font-bold flex items-center gap-1">
                  {merchantName} <Shield size={9} style={{ color: scoreColor }} />
                </div>
                <div className="text-gray-400 text-[9px]">{viewerCount} watching</div>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 bg-black/40 backdrop-blur rounded-full text-white"><X size={18} /></button>
        </div>

        {/* Floating hearts */}
        <div className="absolute right-6 bottom-40 pointer-events-none">
          <AnimatePresence>
            {floatingHearts.map(id => (
              <motion.div
                key={id}
                initial={{ opacity: 1, y: 0, scale: 1, x: 0 }}
                animate={{ opacity: 0, y: -150, scale: 0.5, x: Math.random() * 40 - 20 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 2, ease: 'easeOut' }}
                className="absolute bottom-0"
              >
                <Heart size={24} fill="#EC4899" stroke="#EC4899" />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Purchase toasts */}
        <div className="absolute left-3 top-20 space-y-1.5">
          <AnimatePresence>
            {purchases.slice(-3).map(p => <PurchaseToast key={p.id} purchase={p} />)}
          </AnimatePresence>
        </div>

        {/* Product showcase button */}
        {products.length > 0 && (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowProducts(!showProducts)}
            className="absolute bottom-4 left-3 flex items-center gap-2 px-3 py-2 bg-cyan-500/80 backdrop-blur rounded-xl"
          >
            <Package size={16} className="text-white" />
            <span className="text-white text-xs font-bold">{products.length} Products</span>
          </motion.button>
        )}
      </div>

      {/* Product shelf (slides up) */}
      <AnimatePresence>
        {showProducts && (
          <motion.div
            initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
            className="bg-zinc-900 border-t border-white/10 overflow-hidden"
          >
            <div className="p-3 flex gap-2.5 overflow-x-auto scrollbar-hide">
              {products.map(p => (
                <div key={p.id} className="shrink-0 w-36 p-2.5 bg-white/5 border border-white/10 rounded-xl">
                  {p.imageUrl && <img src={p.imageUrl} alt="" className="w-full h-20 rounded-lg object-cover mb-2" />}
                  <div className="text-white text-xs font-medium truncate">{p.name}</div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-cyan-400 font-mono text-xs font-bold">{p.currency}{p.price}</span>
                    <button onClick={() => onBuy?.(p.id)}
                      className="px-2 py-1 bg-cyan-500/20 text-cyan-400 rounded text-[10px] font-bold">Buy</button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Comments + input */}
      <div className="bg-zinc-950 border-t border-white/5">
        {/* Scrollable comments */}
        <div className="h-28 overflow-y-auto px-3 py-2 space-y-1.5 scrollbar-hide">
          {comments.map(c => (
            <div key={c.id} className="flex items-start gap-1.5">
              <span className="text-cyan-400 text-[10px] font-bold shrink-0">{c.user}</span>
              <span className="text-white text-xs">{c.text}</span>
            </div>
          ))}
          <div ref={commentsEndRef} />
        </div>

        {/* Input */}
        <div className="flex items-center gap-2 px-3 py-2 border-t border-white/5">
          <input
            value={commentText} onChange={e => setCommentText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder="Say something..."
            className="flex-1 px-3 py-2 bg-white/5 rounded-full text-white text-xs placeholder-gray-600 focus:outline-none"
          />
          <button onClick={handleSend} className="p-2 text-cyan-400"><Send size={18} /></button>
          <button onClick={handleLike} className="p-2 text-pink-400"><Heart size={18} /></button>
        </div>
      </div>
    </div>
  );
}

// ── Go Live Button (for merchants) ───────────────────────────────────────

interface GoLiveButtonProps {
  onGoLive: () => void;
  isLive: boolean;
}

export function GoLiveButton({ onGoLive, isLive }: GoLiveButtonProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={onGoLive}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm ${
        isLive
          ? 'bg-red-500/20 border border-red-500/30 text-red-400'
          : 'bg-gradient-to-r from-red-500 to-pink-500 text-white'
      }`}
    >
      {isLive ? (
        <><div className="w-2.5 h-2.5 rounded-full bg-red-400 animate-pulse" />End Live</>
      ) : (
        <><Video size={16} />Go Live</>
      )}
    </motion.button>
  );
}

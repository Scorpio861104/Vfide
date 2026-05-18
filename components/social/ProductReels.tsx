/**
 * ProductReels — TikTok meets commerce
 *
 * Full-screen vertical video feed. Swipe up for next.
 * Every reel is a product showcase. Buy button overlaid.
 * ProofScore badge on every creator. Trust is visible.
 *
 * Uses native <video> with IntersectionObserver for auto-play.
 * Works on $60 Android phones — no heavy dependencies.
 */
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { Heart, MessageCircle, Share2, ShoppingCart, Shield, Music2, Bookmark, MoreHorizontal, Volume2, VolumeX, Play } from 'lucide-react';

export interface ReelData {
  id: string;
  videoUrl: string;
  thumbnailUrl?: string;
  creator: { address: string; name: string; avatar?: string; proofScore: number; followers: number };
  product?: { id: string; name: string; price: number; currency: string; inStock: boolean };
  caption: string;
  soundName?: string;
  likes: number;
  comments: number;
  shares: number;
  saved: boolean;
}

interface ProductReelProps {
  reel: ReelData;
  isActive: boolean;
  onLike?: (id: string) => void;
  onBuy?: (productId: string) => void;
  onComment?: (id: string) => void;
  onShare?: (id: string) => void;
  onFollow?: (address: string) => void;
  onSave?: (id: string) => void;
}

function formatCount(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toString();
}

export function ProductReel({ reel, isActive, onLike, onBuy, onComment, onShare, onFollow, onSave }: ProductReelProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(reel.likes);
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [saved, setSaved] = useState(reel.saved);
  const [showHeart, setShowHeart] = useState(false);

  // Auto-play/pause based on visibility
  useEffect(() => {
    if (!videoRef.current) return;
    if (isActive) {
      videoRef.current.play().catch(() => {});
      setPlaying(true);
    } else {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
      setPlaying(false);
    }
  }, [isActive]);

  const handleDoubleTap = useCallback(() => {
    if (!liked) {
      setLiked(true);
      setLikeCount(prev => prev + 1);
      setShowHeart(true);
      setTimeout(() => setShowHeart(false), 800);
      onLike?.(reel.id);
    }
  }, [liked, reel.id, onLike]);

  const handleTap = useCallback(() => {
    if (!videoRef.current) return;
    if (playing) { videoRef.current.pause(); setPlaying(false); }
    else { videoRef.current.play(); setPlaying(true); }
  }, [playing]);

  const scoreColor = reel.creator.proofScore >= 8000 ? '#10B981' : reel.creator.proofScore >= 6500 ? '#06B6D4' : '#F59E0B';

  return (
    <div className="relative w-full h-full bg-black snap-start snap-always">
      {/* Video */}
      <video
        ref={videoRef}
        src={reel.videoUrl}
        poster={reel.thumbnailUrl}
        loop muted={muted} playsInline
        className="absolute inset-0 w-full h-full object-cover"
        onClick={handleTap}
        onDoubleClick={handleDoubleTap}
      />

      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30 pointer-events-none" />

      {/* Double-tap heart */}
      <AnimatePresence>
        {showHeart && (
          <motion.div
            initial={{ scale: 0, opacity: 1 }}
            animate={{ scale: 1.5, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
          >
            <Heart size={80} fill="#EC4899" stroke="#EC4899" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pause icon */}
      {!playing && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <Play size={48} className="text-white/60" fill="white" fillOpacity={0.4} />
        </div>
      )}

      {/* Right action bar */}
      <div className="absolute right-3 bottom-32 flex flex-col items-center gap-5">
        {/* Creator avatar */}
        <button onClick={() => onFollow?.(reel.creator.address)} className="relative">
          <div className="w-11 h-11 rounded-full border-2 flex items-center justify-center text-white font-bold bg-zinc-800"
            style={{ borderColor: scoreColor }}>
            {reel.creator.avatar || reel.creator.name[0]}
          </div>
          <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-cyan-500 flex items-center justify-center text-white text-[10px] font-bold border-2 border-black">+</div>
        </button>

        {/* Like */}
        <button onClick={() => { setLiked(!liked); setLikeCount(p => liked ? p - 1 : p + 1); onLike?.(reel.id); }}
          className="flex flex-col items-center gap-0.5">
          <Heart size={28} fill={liked ? '#EC4899' : 'none'} stroke={liked ? '#EC4899' : 'white'} strokeWidth={2} />
          <span className="text-white text-[10px] font-bold">{formatCount(likeCount)}</span>
        </button>

        {/* Comment */}
        <button onClick={() => onComment?.(reel.id)} className="flex flex-col items-center gap-0.5">
          <MessageCircle size={28} stroke="white" strokeWidth={2} />
          <span className="text-white text-[10px] font-bold">{formatCount(reel.comments)}</span>
        </button>

        {/* Share */}
        <button onClick={() => onShare?.(reel.id)} className="flex flex-col items-center gap-0.5">
          <Share2 size={24} stroke="white" strokeWidth={2} />
          <span className="text-white text-[10px] font-bold">{formatCount(reel.shares)}</span>
        </button>

        {/* Save */}
        <button onClick={() => { setSaved(!saved); onSave?.(reel.id); }}>
          <Bookmark size={24} fill={saved ? 'white' : 'none'} stroke="white" strokeWidth={2} />
        </button>

        {/* Sound */}
        <button onClick={() => { setMuted(!muted); if (videoRef.current) videoRef.current.muted = !muted; }}>
          {muted ? <VolumeX size={20} stroke="white" /> : <Volume2 size={20} stroke="white" />}
        </button>
      </div>

      {/* Bottom info */}
      <div className="absolute bottom-4 left-3 right-16">
        {/* Creator info */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-white font-bold text-sm">@{reel.creator.name}</span>
          <span className="flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: `${scoreColor}30`, color: scoreColor }}>
            <Shield size={8} />{reel.creator.proofScore}
          </span>
        </div>

        {/* Caption */}
        <p className="text-white text-sm mb-2 line-clamp-2">{reel.caption}</p>

        {/* Product card (if shoppable) */}
        {reel.product && (
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => onBuy?.(reel.product!.id)}
            className="flex items-center gap-2 px-3 py-2 bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl"
          >
            <ShoppingCart size={16} className="text-cyan-400" />
            <div className="flex-1 text-left">
              <div className="text-white text-xs font-bold">{reel.product.name}</div>
              <div className="text-gray-300 text-[10px]">{reel.product.inStock ? 'In stock' : 'Sold out'}</div>
            </div>
            <span className="text-cyan-400 font-mono font-bold text-sm">{reel.product.currency}{reel.product.price}</span>
          </motion.button>
        )}

        {/* Sound */}
        {reel.soundName && (
          <div className="flex items-center gap-1.5 mt-2 text-white/60 text-[10px]">
            <Music2 size={10} className="animate-spin" style={{ animationDuration: '3s' }} />
            {reel.soundName}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Full-screen Reels Viewer ─────────────────────────────────────────────

interface ReelsViewerProps {
  reels: ReelData[];
  startIndex?: number;
  onClose?: () => void;
}

export function ReelsViewer({ reels, startIndex = 0, onClose }: ReelsViewerProps) {
  const [activeIndex, setActiveIndex] = useState(startIndex);
  const containerRef = useRef<HTMLDivElement>(null);

  // Snap scroll observer
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.7) {
            const idx = parseInt(entry.target.getAttribute('data-index') || '0');
            setActiveIndex(idx);
          }
        });
      },
      { root: container, threshold: 0.7 }
    );

    container.querySelectorAll('[data-index]').forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, [reels.length]);

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* Close button */}
      {onClose && (
        <button onClick={onClose} className="absolute top-4 left-4 z-50 p-2 rounded-full bg-black/30 backdrop-blur text-white">
          <span className="text-lg">✕</span>
        </button>
      )}

      {/* Scroll container */}
      <div ref={containerRef} className="h-full overflow-y-scroll snap-y snap-mandatory scrollbar-hide">
        {reels.map((reel, i) => (
          <div key={reel.id} data-index={i} className="h-screen snap-start snap-always">
            <ProductReel reel={reel} isActive={i === activeIndex} />
          </div>
        ))}
      </div>

      {/* Progress dots */}
      <div className="absolute top-4 right-4 z-50 flex flex-col gap-1">
        {reels.slice(Math.max(0, activeIndex - 2), activeIndex + 3).map((_, i) => {
          const realIdx = Math.max(0, activeIndex - 2) + i;
          return (
            <div key={realIdx} className={`w-1 rounded-full transition-all ${realIdx === activeIndex ? 'h-4 bg-white' : 'h-1.5 bg-white/30'}`} />
          );
        })}
      </div>
    </div>
  );
}

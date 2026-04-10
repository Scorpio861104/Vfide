/**
 * MarketVibes — "Show your market right now"
 *
 * Once a day, VFIDE sends a prompt: "Show your market!"
 * You have 2 minutes to take a photo with both cameras.
 * Front camera shows you, back camera shows your stall.
 * Raw. Authentic. No filters. Real market life.
 *
 * Late posts are marked "Late" like BeReal.
 * ProofScore bonus for posting within the window.
 */
'use client';

import { useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Clock, MapPin, Shield, RotateCcw, Check, Sparkles } from 'lucide-react';

interface VibePost {
  id: string;
  author: { address: string; name: string; proofScore: number; location?: string };
  frontImageUrl: string;
  backImageUrl: string;
  caption: string;
  postedAt: number;
  promptAt: number;
  isLate: boolean;
  reactions: Record<string, number>;
}

interface MarketVibesCaptureProps {
  promptTime: number;
  onCapture: (frontImage: Blob, backImage: Blob, caption: string) => void;
  timeRemaining: number;
}

export function MarketVibesCapture({ promptTime, onCapture, timeRemaining }: MarketVibesCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [frontImage, setFrontImage] = useState<Blob | null>(null);
  const [backImage, setBackImage] = useState<Blob | null>(null);
  const [caption, setCaption] = useState('');
  const [capturing, setCapturing] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = useCallback(async (facing: 'user' | 'environment') => {
    try {
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setFacingMode(facing);
    } catch {}
  }, []);

  const capturePhoto = useCallback(async () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
    const blob = await new Promise<Blob>((resolve) => canvas.toBlob(b => resolve(b!), 'image/jpeg', 0.85));

    if (facingMode === 'environment') {
      setBackImage(blob);
      await startCamera('user');
    } else {
      setFrontImage(blob);
    }
  }, [facingMode, startCamera]);

  const isLate = timeRemaining <= 0;
  const minutes = Math.max(0, Math.floor(timeRemaining / 60));
  const seconds = Math.max(0, Math.floor(timeRemaining % 60));

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Timer */}
      <div className="absolute top-4 left-0 right-0 z-30 flex justify-center">
        <div className={`px-4 py-1.5 rounded-full text-sm font-bold ${isLate ? 'bg-amber-500/20 text-amber-400' : 'bg-white/10 text-white'}`}>
          {isLate ? (
            <span className="flex items-center gap-1"><Clock size={14} />Late — post anyway!</span>
          ) : (
            <span className="flex items-center gap-1"><Sparkles size={14} />{minutes}:{seconds.toString().padStart(2, '0')} remaining</span>
          )}
        </div>
      </div>

      {/* Camera viewfinder */}
      <div className="flex-1 relative">
        <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" />

        {/* Captured preview (small PIP) */}
        {backImage && !frontImage && (
          <div className="absolute top-16 left-4 w-24 h-32 rounded-xl overflow-hidden border-2 border-white/30 z-20">
            <Image src={URL.createObjectURL(backImage)} alt="Market" className="w-full h-full object-cover"  width={48} height={48} />
            <div className="absolute bottom-1 left-1 text-[8px] text-white bg-black/50 px-1 rounded">Market</div>
          </div>
        )}

        {/* Capture instruction */}
        <div className="absolute bottom-20 left-0 right-0 text-center z-20">
          <p className="text-white text-sm font-medium">
            {!backImage ? 'Show your market' : !frontImage ? 'Now show yourself' : 'Add a caption'}
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="p-4 flex items-center justify-center gap-6">
        {(!backImage || !frontImage) ? (
          <>
            <button onClick={() => startCamera(facingMode === 'user' ? 'environment' : 'user')}
              className="p-3 rounded-full bg-white/10 text-white"><RotateCcw size={20} /></button>
            <button onClick={capturePhoto}
              className="w-16 h-16 rounded-full border-4 border-white flex items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-white" />
            </button>
            <div className="w-12" />
          </>
        ) : (
          <div className="flex-1 flex gap-2">
            <input value={caption} onChange={e =>  setCaption(e.target.value)} placeholder="What's the vibe today?"
              className="flex-1 px-4 py-3 bg-white/10 rounded-xl text-white text-sm placeholder-gray-400 focus:outline-none" />
            <button onClick={() => { if (frontImage && backImage) onCapture(frontImage, backImage, caption); }}
              className="px-4 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold rounded-xl text-sm flex items-center gap-1">
              <Check size={16} />Post
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

interface MarketVibeCardProps {
  vibe: VibePost;
  onReact?: (vibeId: string, reaction: string) => void;
}

export function MarketVibeCard({ vibe, onReact }: MarketVibeCardProps) {
  const [showFront, setShowFront] = useState(false);
  const scoreColor = vibe.author.proofScore >= 8000 ? '#10B981' : '#06B6D4';

  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="rounded-2xl overflow-hidden border border-white/10">
      {/* Dual image */}
      <div className="relative aspect-[3/4] bg-zinc-800 cursor-pointer" onClick={() => setShowFront(!showFront)}>
        <Image src={showFront ? vibe.frontImageUrl : vibe.backImageUrl} alt="" className="w-full h-full object-cover"  width={48} height={48} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {/* PIP of the other camera */}
        <div className="absolute top-3 left-3 w-20 h-28 rounded-xl overflow-hidden border-2 border-white/30" onClick={e => { e.stopPropagation(); setShowFront(!showFront); }}>
          <Image src={showFront ? vibe.backImageUrl : vibe.frontImageUrl} alt="" className="w-full h-full object-cover"  width={48} height={48} />
        </div>

        {/* Late badge */}
        {vibe.isLate && (
          <div className="absolute top-3 right-3 px-2 py-0.5 bg-amber-500/20 text-amber-400 text-[10px] font-bold rounded-full">Late</div>
        )}

        {/* Bottom info */}
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-white text-sm font-bold">{vibe.author.name}</span>
            <span className="flex items-center gap-0.5 text-[10px]" style={{ color: scoreColor }}><Shield size={8} />{vibe.author.proofScore}</span>
          </div>
          {vibe.caption && <p className="text-white/80 text-xs">{vibe.caption}</p>}
          {vibe.author.location && <p className="text-gray-400 text-[10px] flex items-center gap-0.5 mt-1"><MapPin size={8} />{vibe.author.location}</p>}
        </div>
      </div>

      {/* Reaction bar */}
      <div className="flex items-center gap-1 px-3 py-2 bg-zinc-900">
        {['🔥', '💪', '❤️', '🙌', '💰'].map(emoji => (
          <button key={emoji} onClick={() => onReact?.(vibe.id, emoji)}
            className="px-2.5 py-1 rounded-full text-xs bg-white/5 hover:bg-white/10 transition-all">
            {emoji} {vibe.reactions[emoji] || ''}
          </button>
        ))}
      </div>
    </motion.div>
  );
}

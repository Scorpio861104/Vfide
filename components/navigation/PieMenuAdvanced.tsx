/**
 * PieMenu Advanced Enhancements
 *
 * 1. SwipeGesture — Directional swipe on V button for instant navigation
 * 2. RevenuePulse — Today's sales visible on the V button
 * 3. StreakFlame — Consecutive activity days with fire animation
 * 4. AchievementBurst — Badge earn celebration on the V button
 * 5. AmbientTone — Section-aware audio pitch shifting
 * 6. OfflineRing — ProofScore ring grays out offline, refills on reconnect
 * 7. TransactionChime — Musical intervals sized to payment amount
 */
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue } from 'framer-motion';

// ═══════════════════════════════════════════════════════════════════════════
//  1. SWIPE GESTURE — Directional swipe for instant navigation
// ═══════════════════════════════════════════════════════════════════════════

interface SwipeConfig {
  left?: string;   // href
  right?: string;
  up?: string;
  down?: string;
  threshold?: number; // px, default 40
}

const DEFAULT_SWIPE: SwipeConfig = {
  left: '/pos',        // Swipe left → POS
  up: '/pay',          // Swipe up → Send money
  right: '/feed',      // Swipe right → Feed
  down: '/dashboard',  // Swipe down → Dashboard
  threshold: 40,
};

export function useSwipeGesture(
  onSwipe: (direction: 'left' | 'right' | 'up' | 'down', href: string) => void,
  config: SwipeConfig = DEFAULT_SWIPE
) {
  const startX = useRef(0);
  const startY = useRef(0);
  const threshold = config.threshold || 40;

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const firstTouch = e.touches[0];
    if (!firstTouch) return;
    startX.current = firstTouch.clientX;
    startY.current = firstTouch.clientY;
  }, []);

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    const changedTouch = e.changedTouches[0];
    if (!changedTouch) return;
    const dx = changedTouch.clientX - startX.current;
    const dy = changedTouch.clientY - startY.current;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    if (Math.max(absDx, absDy) < threshold) return; // Too short

    if (absDx > absDy) {
      // Horizontal
      if (dx < 0 && config.left) onSwipe('left', config.left);
      if (dx > 0 && config.right) onSwipe('right', config.right);
    } else {
      // Vertical
      if (dy < 0 && config.up) onSwipe('up', config.up);
      if (dy > 0 && config.down) onSwipe('down', config.down);
    }
  }, [config, onSwipe, threshold]);

  return { onTouchStart, onTouchEnd };
}

interface SwipeHintProps {
  visible: boolean;
  config?: SwipeConfig;
}

export function SwipeHints({ visible, config = DEFAULT_SWIPE }: SwipeHintProps) {
  if (!visible) return null;

  const hints = [
    { dir: 'left', label: 'POS', x: -52, y: 0, href: config.left },
    { dir: 'up', label: 'Send', x: 0, y: -52, href: config.up },
    { dir: 'right', label: 'Feed', x: 52, y: 0, href: config.right },
    { dir: 'down', label: 'Home', x: 0, y: 52, href: config.down },
  ].filter(h => h.href);

  return (
    <AnimatePresence>
      {hints.map((h, i) => (
        <motion.div
          key={h.dir}
          initial={{ opacity: 0, x: 0, y: 0, scale: 0.5 }}
          animate={{ opacity: 0.6, x: h.x, y: h.y, scale: 1 }}
          exit={{ opacity: 0, scale: 0.5 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25, delay: i * 0.05 }}
          className="absolute text-[8px] font-bold text-gray-500 uppercase tracking-wider pointer-events-none"
          style={{ transform: `translate(${h.x}px, ${h.y}px)` }}
        >
          {h.label}
        </motion.div>
      ))}
    </AnimatePresence>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  2. REVENUE PULSE — Today's sales on the V button
// ═══════════════════════════════════════════════════════════════════════════

interface RevenuePulseProps {
  todayRevenue: number;
  todayOrders: number;
  currency?: string;
  visible: boolean;
}

export function RevenuePulse({ todayRevenue, todayOrders, currency = '$', visible }: RevenuePulseProps) {
  if (!visible || todayRevenue === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap"
    >
      <div className="px-2 py-0.5 rounded-md text-[9px] font-bold"
        style={{
          background: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(16,185,129,0.05))',
          border: '1px solid rgba(16,185,129,0.2)',
          color: '#10B981',
          boxShadow: '0 0 8px rgba(16,185,129,0.15)',
        }}>
        {currency}{todayRevenue.toLocaleString()} · {todayOrders} sales
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  3. STREAK FLAME — Consecutive activity days
// ═══════════════════════════════════════════════════════════════════════════

const STREAK_KEY = 'vfide_streak';

interface StreakData {
  count: number;
  lastDate: string; // YYYY-MM-DD
}

export function useStreak(): number {
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    try {
      const today = new Date().toISOString().split('T')[0] ?? '';
      const stored = localStorage.getItem(STREAK_KEY);
      let data: StreakData = stored ? JSON.parse(stored) : { count: 0, lastDate: '' };

      if (data.lastDate === today) {
        setStreak(data.count);
        return;
      }

      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0] ?? '';
      if (data.lastDate === yesterday) {
        data.count++;
      } else {
        data.count = 1; // Streak broken
      }
      data.lastDate = today;
      localStorage.setItem(STREAK_KEY, JSON.stringify(data));
      setStreak(data.count);
    } catch { setStreak(0); }
  }, []);

  return streak;
}

interface StreakFlameProps {
  streak: number;
}

export function StreakFlame({ streak }: StreakFlameProps) {
  if (streak < 2) return null;

  const intensity = Math.min(1, streak / 30); // Max intensity at 30 days
  const size = 14 + intensity * 6; // 14-20px

  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      className="absolute -bottom-3 -left-2 flex items-center gap-0.5 pointer-events-none"
    >
      {/* Flame SVG */}
      <svg width={size} height={size} viewBox="0 0 24 24" style={{ filter: `drop-shadow(0 0 ${2 + intensity * 4}px rgba(249,115,22,${0.3 + intensity * 0.4}))` }}>
        <motion.path
          d="M12 2C10 6 6 8.5 6 13c0 3.3 2.7 6 6 6s6-2.7 6-6c0-4.5-4-7-6-11z"
          fill={`rgba(249,115,22,${0.6 + intensity * 0.4})`}
          stroke="rgba(234,88,12,0.8)"
          strokeWidth="0.5"
          animate={{ scale: [1, 1.05, 1], opacity: [0.9, 1, 0.9] }}
          transition={{ duration: 0.8, repeat: Infinity }}
        />
        <motion.path
          d="M12 8c-1 2.5-3 3.5-3 6.5c0 1.7 1.3 3 3 3s3-1.3 3-3c0-3-2-4-3-6.5z"
          fill={`rgba(251,191,36,${0.5 + intensity * 0.5})`}
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 0.6, repeat: Infinity, delay: 0.1 }}
        />
      </svg>
      <span className="text-[9px] font-bold" style={{ color: `rgba(249,115,22,${0.7 + intensity * 0.3})` }}>
        {streak}
      </span>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  4. ACHIEVEMENT BURST — Badge earn celebration
// ═══════════════════════════════════════════════════════════════════════════

interface AchievementBurstProps {
  badgeName: string | null;
  badgeIcon?: React.ReactNode;
  onComplete: () => void;
}

export function AchievementBurst({ badgeName, badgeIcon, onComplete }: AchievementBurstProps) {
  useEffect(() => {
    if (badgeName) {
      const timer = setTimeout(onComplete, 3500);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [badgeName, onComplete]);

  if (!badgeName) return null;

  const particles = Array.from({ length: 12 }, (_, i) => ({
    angle: (i * 30) * Math.PI / 180,
    distance: 40 + Math.random() * 30,
    size: 3 + Math.random() * 4,
    color: ['#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#10B981'][i % 5],
  }));

  return (
    <div className="absolute inset-0 pointer-events-none z-30">
      {/* Gold ring expansion */}
      <motion.div
        className="absolute inset-0 rounded-2xl"
        initial={{ scale: 1, opacity: 0.8 }}
        animate={{ scale: 2, opacity: 0 }}
        transition={{ duration: 1, ease: 'easeOut' }}
        style={{ border: '3px solid #F59E0B' }}
      />

      {/* Confetti particles */}
      {particles.map((p, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width: p.size, height: p.size,
            background: p.color,
            left: '50%', top: '50%',
            boxShadow: `0 0 6px ${p.color}80`,
          }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
          animate={{
            x: Math.cos(p.angle) * p.distance,
            y: Math.sin(p.angle) * p.distance,
            opacity: 0,
            scale: 0,
          }}
          transition={{ duration: 1.2, ease: 'easeOut', delay: 0.1 }}
        />
      ))}

      {/* Badge name flash */}
      <motion.div
        className="absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap"
        initial={{ opacity: 0, y: 10, scale: 0.8 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ delay: 0.3 }}
      >
        <div className="px-3 py-1 rounded-lg text-[10px] font-bold text-amber-400"
          style={{
            background: 'linear-gradient(135deg, rgba(245,158,11,0.2), rgba(245,158,11,0.05))',
            border: '1px solid rgba(245,158,11,0.3)',
            boxShadow: '0 0 12px rgba(245,158,11,0.2)',
          }}>
          {badgeName} earned!
        </div>
      </motion.div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  5. AMBIENT TONE — Section-aware audio pitch
// ═══════════════════════════════════════════════════════════════════════════

const SECTION_TONES: Record<string, { freq: number; type: OscillatorType }> = {
  merchant: { freq: 340, type: 'sine' },        // Warm, grounded
  social: { freq: 520, type: 'sine' },           // Bright, friendly
  governance: { freq: 280, type: 'triangle' },   // Deep, authoritative
  rewards: { freq: 620, type: 'sine' },          // High, celebratory
  vault: { freq: 420, type: 'triangle' },        // Secure, steady
  home: { freq: 460, type: 'sine' },             // Neutral, welcoming
  pay: { freq: 380, type: 'sine' },              // Clear, transactional
};

export function useSectionTone() {
  const audioRef = useRef<AudioContext | null>(null);

  const playTone = useCallback((section: string) => {
    if (typeof window === 'undefined') return;
    const config = SECTION_TONES[section] ?? SECTION_TONES.home;
    if (!config) return;

    try {
      if (!audioRef.current) audioRef.current = new AudioContext();
      const ctx = audioRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = config.type;
      osc.frequency.setValueAtTime(config.freq, ctx.currentTime);

      // Quick gentle envelope
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.03, ctx.currentTime + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.2);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } catch {}
  }, []);

  useEffect(() => {
    return () => { audioRef.current?.close(); audioRef.current = null; };
  }, []);

  return playTone;
}

// ═══════════════════════════════════════════════════════════════════════════
//  6. OFFLINE RING — ProofScore ring grays out offline
// ═══════════════════════════════════════════════════════════════════════════

export function useOnlineStatus() {
  const [online, setOnline] = useState(true);
  const [justReconnected, setJustReconnected] = useState(false);

  useEffect(() => {
    const goOnline = () => {
      setOnline(true);
      setJustReconnected(true);
      setTimeout(() => setJustReconnected(false), 2000);
    };
    const goOffline = () => { setOnline(false); setJustReconnected(false); };

    setOnline(navigator.onLine);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  return { online, justReconnected };
}

interface OfflineIndicatorProps {
  online: boolean;
  justReconnected: boolean;
}

export function OfflineIndicator({ online, justReconnected }: OfflineIndicatorProps) {
  return (
    <>
      {/* Grayscale overlay when offline */}
      {!online && (
        <div className="absolute inset-0 rounded-2xl pointer-events-none z-20"
          style={{ background: 'rgba(0,0,0,0.4)', filter: 'grayscale(1)' }} />
      )}

      {/* Reconnection sweep */}
      {justReconnected && (
        <motion.div
          className="absolute inset-0 rounded-2xl pointer-events-none z-20 overflow-hidden"
          initial={{ opacity: 1 }} animate={{ opacity: 0 }} transition={{ duration: 1.5 }}
        >
          <motion.div
            className="absolute inset-0"
            initial={{ x: '-100%' }}
            animate={{ x: '200%' }}
            transition={{ duration: 0.8, ease: 'easeInOut' }}
            style={{ background: 'linear-gradient(90deg, transparent, rgba(16,185,129,0.3), transparent)', width: '50%' }}
          />
        </motion.div>
      )}

      {/* Offline label */}
      {!online && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute -top-6 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded text-[8px] font-bold text-red-400 bg-red-500/10 border border-red-500/20 whitespace-nowrap pointer-events-none"
        >
          Offline
        </motion.div>
      )}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  7. TRANSACTION CHIME — Musical intervals by payment size
// ═══════════════════════════════════════════════════════════════════════════

// Small payment: single note (C5)
// Medium payment: two notes (C5 → E5, a major third)
// Large payment: three notes (C5 → E5 → G5, a major chord)
// Huge payment: four notes (C5 → E5 → G5 → C6, full octave chord)

const NOTE_FREQS = {
  C5: 523.25,
  E5: 659.25,
  G5: 783.99,
  C6: 1046.50,
};

export function useTransactionChime() {
  const audioRef = useRef<AudioContext | null>(null);

  const chime = useCallback((amountUSD: number) => {
    if (typeof window === 'undefined') return;

    let notes: number[];
    if (amountUSD < 5) notes = [NOTE_FREQS.C5];
    else if (amountUSD < 50) notes = [NOTE_FREQS.C5, NOTE_FREQS.E5];
    else if (amountUSD < 500) notes = [NOTE_FREQS.C5, NOTE_FREQS.E5, NOTE_FREQS.G5];
    else notes = [NOTE_FREQS.C5, NOTE_FREQS.E5, NOTE_FREQS.G5, NOTE_FREQS.C6];

    try {
      if (!audioRef.current) audioRef.current = new AudioContext();
      const ctx = audioRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime);

        const startTime = ctx.currentTime + i * 0.12;
        gain.gain.setValueAtTime(0.0001, startTime);
        gain.gain.exponentialRampToValueAtTime(0.04, startTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.5);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(startTime);
        osc.stop(startTime + 0.6);
      });
    } catch {}
  }, []);

  useEffect(() => {
    return () => { audioRef.current?.close(); audioRef.current = null; };
  }, []);

  return chime;
}

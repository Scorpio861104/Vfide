/**
 * PieMenu Enhancements — Bolt-on modules for the existing PieMenu
 *
 * 1. ProofScoreRing — Glowing ring around the V button showing trust level
 * 2. QuickActions — Long-press V for 3 instant actions (no full menu needed)
 * 3. useHaptics — Web Vibration API for native-feel feedback
 * 4. SmartRecents — Tracks most-visited pages, shows them first
 * 5. NotificationPulse — V button ripples when payments arrive
 * 6. MenuSearch — Inline search to filter items
 * 7. FavoritePin — Star items to pin them to top
 *
 * Integration: import these into PieMenu.tsx and wire them in.
 */
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { Search, Star, QrCode, Send, ShoppingCart, Zap, Bell } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';

// ═══════════════════════════════════════════════════════════════════════════
//  1. PROOFSCORE RING — Wraps the V button with a trust-colored arc
// ═══════════════════════════════════════════════════════════════════════════

const SCORE_COLORS = [
  { threshold: 8000, color: '#10B981', label: 'Trusted' },      // emerald
  { threshold: 6500, color: '#06B6D4', label: 'Building' },     // cyan
  { threshold: 5000, color: '#F59E0B', label: 'Neutral' },      // amber
  { threshold: 0,    color: '#EF4444', label: 'Low' },          // red
];

function getScoreColor(score: number): string {
  return (SCORE_COLORS.find(s => score >= s.threshold) || SCORE_COLORS[SCORE_COLORS.length - 1]!).color;
}

interface ProofScoreRingProps {
  score: number;       // 0-10000
  size?: number;       // px, default 56 (wraps 48px button)
  children: React.ReactNode;
}

export function ProofScoreRing({ score, size = 56, children }: ProofScoreRingProps) {
  const normalizedScore = Math.min(10000, Math.max(0, score)) / 10000;
  const color = getScoreColor(score);
  const circumference = Math.PI * (size - 4);
  const dashOffset = circumference * (1 - normalizedScore);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      {/* Score ring */}
      <svg className="absolute inset-0" width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        {/* Track */}
        <circle cx={size / 2} cy={size / 2} r={(size - 4) / 2}
          fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="2" />
        {/* Progress arc */}
        <circle cx={size / 2} cy={size / 2} r={(size - 4) / 2}
          fill="none" stroke={color} strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{
            filter: `drop-shadow(0 0 4px ${color}80)`,
            transition: 'stroke-dashoffset 1s ease, stroke 0.5s ease',
          }} />
      </svg>
      {/* Glow behind ring */}
      <div className="absolute inset-0 rounded-full" style={{
        boxShadow: `0 0 12px ${color}30, 0 0 24px ${color}15`,
        transition: 'box-shadow 0.5s ease',
      }} />
      {/* Button content (centered) */}
      <div className="absolute inset-1 flex items-center justify-center">
        {children}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  2. QUICK ACTIONS — Long-press V for instant actions
// ═══════════════════════════════════════════════════════════════════════════

interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  href: string;
  color: string;
}

const DEFAULT_QUICK_ACTIONS: QuickAction[] = [
  { id: 'scan', label: 'Scan QR', icon: <QrCode size={18} />, href: '/pay', color: '#06B6D4' },
  { id: 'pos', label: 'POS', icon: <ShoppingCart size={18} />, href: '/pos', color: '#10B981' },
  { id: 'send', label: 'Send', icon: <Send size={18} />, href: '/pay', color: '#8B5CF6' },
];

interface QuickActionsProps {
  actions?: QuickAction[];
  visible: boolean;
  onSelect: (href: string) => void;
  anchorX: number;
  anchorY: number;
}

export function QuickActions({ actions = DEFAULT_QUICK_ACTIONS, visible, onSelect, anchorX, anchorY }: QuickActionsProps) {
  return (
    <AnimatePresence>
      {visible && (
        <div className="fixed z-[101]" style={{ left: anchorX, top: anchorY }}>
          {actions.map((action, i) => {
            // Fan out in an arc above the button
            const angle = -90 - 40 + (i * 40); // -130, -90, -50 degrees
            const radius = 72;
            const x = Math.cos((angle * Math.PI) / 180) * radius;
            const y = Math.sin((angle * Math.PI) / 180) * radius;

            return (
              <motion.button
                key={action.id}
                initial={{ opacity: 0, x: 0, y: 0, scale: 0.3 }}
                animate={{ opacity: 1, x, y, scale: 1 }}
                exit={{ opacity: 0, x: 0, y: 0, scale: 0.3 }}
                transition={{ type: 'spring', stiffness: 500, damping: 25, delay: i * 0.05 }}
                onClick={() => onSelect(action.href)}
                className="absolute flex flex-col items-center gap-1"
                style={{ transform: `translate(${x}px, ${y}px)` }}
              >
                <div className="w-11 h-11 rounded-xl flex items-center justify-center"
                  style={{
                    background: `linear-gradient(145deg, ${action.color}25, ${action.color}10)`,
                    border: `1px solid ${action.color}40`,
                    boxShadow: `0 0 16px ${action.color}30, 0 4px 12px rgba(0,0,0,0.4)`,
                    color: action.color,
                  }}>
                  {action.icon}
                </div>
                <span className="text-[9px] font-bold text-gray-300 whitespace-nowrap">{action.label}</span>
              </motion.button>
            );
          })}
        </div>
      )}
    </AnimatePresence>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  3. HAPTIC FEEDBACK — Web Vibration API
// ═══════════════════════════════════════════════════════════════════════════

export function useHaptics() {
  const canVibrate = typeof navigator !== 'undefined' && 'vibrate' in navigator;

  const tap = useCallback(() => {
    if (canVibrate) navigator.vibrate(8);
  }, [canVibrate]);

  const success = useCallback(() => {
    if (canVibrate) navigator.vibrate([10, 30, 10]);
  }, [canVibrate]);

  const error = useCallback(() => {
    if (canVibrate) navigator.vibrate([30, 50, 30, 50, 30]);
  }, [canVibrate]);

  const heavy = useCallback(() => {
    if (canVibrate) navigator.vibrate(25);
  }, [canVibrate]);

  return { tap, success, error, heavy, canVibrate };
}

// ═══════════════════════════════════════════════════════════════════════════
//  4. SMART RECENTS — Tracks page visits, surfaces most-used
// ═══════════════════════════════════════════════════════════════════════════

interface PageVisit {
  href: string;
  label: string;
  count: number;
  lastVisited: number;
}

const RECENTS_KEY = 'vfide_nav_recents';
const MAX_RECENTS = 6;

export function useSmartRecents() {
  const [recents, setRecents] = useState<PageVisit[]>([]);
  const pathname = usePathname();

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENTS_KEY);
      if (stored) setRecents(JSON.parse(stored));
    } catch {}
  }, []);

  // Track current page visit
  useEffect(() => {
    if (!pathname || pathname === '/') return;

    setRecents(prev => {
      const existing = prev.find(r => r.href === pathname);
      let updated: PageVisit[];

      if (existing) {
        updated = prev.map(r =>
          r.href === pathname
            ? { ...r, count: r.count + 1, lastVisited: Date.now() }
            : r
        );
      } else {
        const label = pathname.split('/').filter(Boolean).pop() || pathname;
        updated = [...prev, { href: pathname, label: label.replace(/-/g, ' '), count: 1, lastVisited: Date.now() }];
      }

      // Sort by frequency * recency, keep top N
      updated.sort((a, b) => {
        const scoreA = a.count * Math.max(1, 1 - (Date.now() - a.lastVisited) / 604800000); // decay over 7 days
        const scoreB = b.count * Math.max(1, 1 - (Date.now() - b.lastVisited) / 604800000);
        return scoreB - scoreA;
      });
      updated = updated.slice(0, MAX_RECENTS);

      try { localStorage.setItem(RECENTS_KEY, JSON.stringify(updated)); } catch {}
      return updated;
    });
  }, [pathname]);

  return recents;
}

interface SmartRecentsBarProps {
  recents: PageVisit[];
  onSelect: (href: string) => void;
}

export function SmartRecentsBar({ recents, onSelect }: SmartRecentsBarProps) {
  if (recents.length === 0) return null;

  return (
    <div className="border-b border-white/5 px-3 py-2">
      <div className="text-[9px] uppercase tracking-wider text-gray-600 font-bold mb-1.5 px-1">Frequent</div>
      <div className="flex flex-wrap gap-1">
        {recents.slice(0, 4).map(r => (
          <button key={r.href} onClick={() => onSelect(r.href)}
            className="px-2 py-1 rounded-md text-[10px] font-medium text-gray-400 bg-white/3 border border-white/5 hover:bg-white/8 hover:text-white transition-all capitalize truncate max-w-[90px]">
            {r.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  5. NOTIFICATION PULSE — V button ripples on events
// ═══════════════════════════════════════════════════════════════════════════

interface NotificationPulseProps {
  active: boolean;
  count?: number;
  color?: string;
}

export function NotificationPulse({ active, count = 0, color = '#06B6D4' }: NotificationPulseProps) {
  if (!active && count === 0) return null;

  return (
    <>
      {/* Pulse rings */}
      {active && (
        <>
          <motion.div
            className="absolute inset-0 rounded-2xl pointer-events-none"
            animate={{ scale: [1, 1.5], opacity: [0.4, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut' }}
            style={{ border: `2px solid ${color}` }}
          />
          <motion.div
            className="absolute inset-0 rounded-2xl pointer-events-none"
            animate={{ scale: [1, 1.8], opacity: [0.2, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut', delay: 0.3 }}
            style={{ border: `1px solid ${color}` }}
          />
        </>
      )}

      {/* Count badge */}
      {count > 0 && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white z-20"
          style={{
            background: `linear-gradient(135deg, ${color}, ${color}CC)`,
            boxShadow: `0 0 8px ${color}60, 0 2px 4px rgba(0,0,0,0.3)`,
          }}>
          {count > 9 ? '9+' : count}
        </motion.div>
      )}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  6. MENU SEARCH — Type to filter items inline
// ═══════════════════════════════════════════════════════════════════════════

interface MenuSearchProps {
  value: string;
  onChange: (value: string) => void;
  resultCount: number;
}

export function MenuSearch({ value, onChange, resultCount }: MenuSearchProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Auto-focus when menu opens
    const timer = setTimeout(() => inputRef.current?.focus(), 200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="relative px-2 py-1.5 border-b border-white/5">
      <div className="relative">
        <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-600" />
        <input
          ref={inputRef}
          value={value}
          onChange={e =>  onChange(e.target.value)}
          placeholder="Search pages..."
          className="w-full pl-7 pr-3 py-1.5 bg-white/3 border border-white/5 rounded-lg text-xs text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500/30"
        />
        {value && (
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] text-gray-600">
            {resultCount}
          </span>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  7. FAVORITE PINS — Star items to pin them
// ═══════════════════════════════════════════════════════════════════════════

const FAVORITES_KEY = 'vfide_nav_favorites';

export function useFavorites() {
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const stored = localStorage.getItem(FAVORITES_KEY);
      if (stored) setFavorites(new Set(JSON.parse(stored)));
    } catch {}
  }, []);

  const toggleFavorite = useCallback((itemId: string) => {
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) { next.delete(itemId); } else { next.add(itemId); }
      try { localStorage.setItem(FAVORITES_KEY, JSON.stringify([...next])); } catch {}
      return next;
    });
  }, []);

  const isFavorite = useCallback((itemId: string) => favorites.has(itemId), [favorites]);

  return { favorites, toggleFavorite, isFavorite };
}

interface FavoriteStarProps {
  itemId: string;
  isFavorite: boolean;
  onToggle: (id: string) => void;
  color?: string;
}

export function FavoriteStar({ itemId, isFavorite, onToggle, color = '#F59E0B' }: FavoriteStarProps) {
  return (
    <motion.button
      onClick={e => { e.stopPropagation(); onToggle(itemId); }}
      whileTap={{ scale: 0.8 }}
      className="w-5 h-5 flex items-center justify-center rounded shrink-0"
      aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
    >
      <Star
        size={12}
        fill={isFavorite ? color : 'none'}
        stroke={isFavorite ? color : 'rgba(255,255,255,0.15)'}
        style={isFavorite ? { filter: `drop-shadow(0 0 4px ${color}60)` } : undefined}
      />
    </motion.button>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  8. LONG PRESS HOOK — Detect long-press vs tap
// ═══════════════════════════════════════════════════════════════════════════

export function useLongPress(
  onLongPress: () => void,
  onTap: () => void,
  delay = 400
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLong = useRef(false);

  const start = useCallback(() => {
    isLong.current = false;
    timerRef.current = setTimeout(() => {
      isLong.current = true;
      onLongPress();
    }, delay);
  }, [onLongPress, delay]);

  const end = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!isLong.current) onTap();
    isLong.current = false;
  }, [onTap]);

  const cancel = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    isLong.current = false;
  }, []);

  return {
    onTouchStart: start,
    onTouchEnd: end,
    onTouchCancel: cancel,
    onMouseDown: start,
    onMouseUp: end,
    onMouseLeave: cancel,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
//  9. PAYMENT RECEIVED RIPPLE — Satisfying animation on incoming tx
// ═══════════════════════════════════════════════════════════════════════════

interface PaymentRippleProps {
  trigger: boolean;
  color?: string;
}

export function PaymentRipple({ trigger, color = '#10B981' }: PaymentRippleProps) {
  const [ripples, setRipples] = useState<number[]>([]);

  useEffect(() => {
    if (trigger) {
      const id = Date.now();
      setRipples(prev => [...prev, id]);
      setTimeout(() => setRipples(prev => prev.filter(r => r !== id)), 2000);
    }
  }, [trigger]);

  return (
    <>
      {ripples.map(id => (
        <motion.div
          key={id}
          className="absolute inset-0 rounded-2xl pointer-events-none"
          initial={{ scale: 1, opacity: 0.6, borderWidth: 3 }}
          animate={{ scale: 2.5, opacity: 0, borderWidth: 0 }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
          style={{ borderColor: color, borderStyle: 'solid' }}
        />
      ))}
    </>
  );
}

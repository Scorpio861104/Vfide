/**
 * GlassCard — THE single glassmorphism card component
 * 
 * Consolidates 8 duplicate definitions from:
 * - components/ui/PageLayout.tsx
 * - app/badges/page.tsx
 * - app/dashboard/components/shared.tsx
 * - app/council/components/OverviewTab.tsx
 * - app/vault/components/VaultContent.tsx
 * - app/vault/recover/components/VisualEffects.tsx
 * - app/treasury/page.tsx
 * - app/sanctum/page.tsx
 * 
 * MIGRATION: Replace all inline GlassCard definitions with:
 *   import { GlassCard } from '@/components/ui/GlassCard';
 */

'use client';

import { type ReactNode } from 'react';
import { motion } from 'framer-motion';

// ── Named gradient presets ──────────────────────────────────────────────────
const GRADIENT_MAP = {
  cyan: 'from-cyan-500/20 to-blue-500/10',
  gold: 'from-amber-500/20 to-orange-500/10',
  red: 'from-red-500/20 to-red-500/5',
  green: 'from-emerald-500/20 to-emerald-500/5',
  purple: 'from-purple-500/20 to-purple-500/5',
  pink: 'from-pink-500/20 to-pink-500/5',
} as const;

type GradientName = keyof typeof GRADIENT_MAP;

export interface GlassCardProps {
  children: ReactNode;
  className?: string;
  /** 
   * Enable gradient background. 
   * - true: default white gradient 
   * - string name: named gradient preset (cyan, gold, red, green, purple, pink)
   */
  gradient?: boolean | GradientName;
  /** 
   * Enable glow shadow effect.
   * - true: default cyan glow
   * - string: custom glow color (CSS color value)
   */
  glow?: boolean | string;
  /** Enable hover lift + scale animation (default: true) */
  hover?: boolean;
  /** Click handler — enables cursor-pointer and tap animation */
  onClick?: () => void;
}

export function GlassCard({
  children,
  className = '',
  gradient = false,
  glow = false,
  hover = true,
  onClick,
}: GlassCardProps) {
  // Resolve gradient class
  let bgClass: string;
  if (gradient === true) {
    bgClass = 'bg-gradient-to-br from-white/10 via-white/5 to-transparent';
  } else if (typeof gradient === 'string' && gradient in GRADIENT_MAP) {
    bgClass = `bg-gradient-to-br ${GRADIENT_MAP[gradient as GradientName]}`;
  } else {
    bgClass = 'bg-white/5';
  }

  // Resolve glow style
  const glowColor = glow === true ? 'rgba(0,240,255,0.12)' : typeof glow === 'string' ? glow : undefined;
  const glowStyle = glowColor
    ? { boxShadow: `0 0 40px ${glowColor}, 0 4px 30px rgba(0,0,0,0.2)` }
    : undefined;

  return (
    <motion.div
      whileHover={hover ? { y: -2, scale: 1.005 } : undefined}
      whileTap={onClick ? { scale: 0.98 } : undefined}
      onClick={onClick}
      className={`relative overflow-hidden rounded-2xl backdrop-blur-xl ${bgClass} border border-white/10 ${
        hover ? 'transition-all duration-300 hover:border-white/20 ring-effect' : ''
      } ${onClick ? 'cursor-pointer' : ''} ${className}`}
      style={glowStyle}
    >
      {children}
    </motion.div>
  );
}

'use client';

import type { ReactNode } from 'react';
import { m, LazyMotion, domAnimation } from 'framer-motion';
import {
  ArrowRight,
  ChevronRight,
  Heart,
  Shield,
  Store,
  Users,
  Zap,
  type LucideIcon,
} from 'lucide-react';

const ICON_MAP = {
  Shield,
  Zap,
  Users,
  Store,
  Heart,
  ArrowRight,
  ChevronRight,
} satisfies Record<string, LucideIcon>;

/* Accent colour → CSS values */
const COLOR_MAP: Record<string, { hex: string; glow: string; bg: string; border: string }> = {
  '#00F0FF': { hex: '#00F0FF', glow: 'rgba(0,240,255,0.35)',   bg: 'rgba(0,240,255,0.10)',   border: 'rgba(0,240,255,0.22)' },
  '#FFD700': { hex: '#FFD700', glow: 'rgba(255,215,0,0.35)',   bg: 'rgba(255,215,0,0.10)',   border: 'rgba(255,215,0,0.20)' },
  '#00FF88': { hex: '#00FF88', glow: 'rgba(0,255,136,0.35)',   bg: 'rgba(0,255,136,0.10)',   border: 'rgba(0,255,136,0.20)' },
  '#A78BFA': { hex: '#A78BFA', glow: 'rgba(167,139,250,0.35)', bg: 'rgba(167,139,250,0.10)', border: 'rgba(167,139,250,0.22)' },
  '#F472B6': { hex: '#F472B6', glow: 'rgba(244,114,182,0.35)', bg: 'rgba(244,114,182,0.10)', border: 'rgba(244,114,182,0.20)' },
  '#FB923C': { hex: '#FB923C', glow: 'rgba(251,146,60,0.35)',  bg: 'rgba(251,146,60,0.10)',  border: 'rgba(251,146,60,0.20)' },
};

function resolveColor(raw: string) {
  return COLOR_MAP[raw] ?? { hex: raw, glow: `${raw}55`, bg: `${raw}18`, border: `${raw}35` };
}

interface FeatureCardProps {
  icon: ReactNode | keyof typeof ICON_MAP;
  title: string;
  description: string;
  color: string;
  delay?: number;
}

export function FeatureCard({ icon, title, description, color, delay = 0 }: FeatureCardProps) {
  const Icon = typeof icon === 'string' && icon in ICON_MAP
    ? ICON_MAP[icon as keyof typeof ICON_MAP]
    : null;

  const c = resolveColor(color);

  return (
    <m.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.55, delay }}
      whileHover={{ y: -6, transition: { duration: 0.25 } }}
      className="group relative h-full"
    >
      {/* Hover glow halo */}
      <div
        className="pointer-events-none absolute -inset-px rounded-[1.35rem] opacity-0 blur-xl transition-opacity duration-500 group-hover:opacity-100"
        style={{ background: `radial-gradient(ellipse at 50% 0%, ${c.glow}, transparent 70%)` }}
        aria-hidden="true"
      />

      {/* Card body */}
      <div className="feature-card-premium relative h-full">
        {/* Top accent line — shown on hover, dimmed at rest */}
        <div
          className="absolute top-0 left-0 right-0 h-px rounded-t-[1.35rem] opacity-40 transition-opacity duration-300 group-hover:opacity-100"
          style={{ background: `linear-gradient(90deg, transparent, ${c.hex}, transparent)` }}
          aria-hidden="true"
        />

        {/* Icon box */}
        <div
          className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg"
          style={{
            background: c.bg,
            border: `1px solid ${c.border}`,
            boxShadow: `0 0 16px -6px ${c.glow}`,
          }}
        >
          <div style={{ color: c.hex }}>
            {Icon ? <Icon className="h-6 w-6" strokeWidth={1.8} /> : icon}
          </div>
        </div>

        <h3 className="mb-3 text-lg font-bold text-zinc-50 leading-snug transition-colors group-hover:text-white">
          {title}
        </h3>

        <p className="text-sm leading-relaxed text-zinc-400 transition-colors group-hover:text-zinc-300">
          {description}
        </p>
      </div>
    </m.div>
  );
}

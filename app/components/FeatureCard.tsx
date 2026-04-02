'use client';

import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.6, delay }}
      whileHover={{ y: -8, transition: { duration: 0.3 } }}
      className="group relative"
    >
      <div
        className="absolute inset-0 rounded-2xl opacity-0 blur-xl transition-opacity duration-500 group-hover:opacity-100 -z-10"
        style={{ background: `linear-gradient(135deg, ${color}20, transparent)` }}
      />
      <div className="glass-card relative h-full overflow-hidden rounded-2xl p-5 sm:p-6 md:p-8">
        <div
          className="absolute top-0 left-0 right-0 h-px opacity-0 transition-opacity group-hover:opacity-100"
          style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }}
        />

        <div
          className="mb-5 flex h-14 w-14 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110"
          style={{ background: `${color}15` }}
        >
          <div style={{ color }}>
            {Icon ? <Icon className="h-7 w-7" /> : icon}
          </div>
        </div>

        <h2 className="mb-3 text-xl font-semibold text-zinc-50 transition-colors group-hover:text-white">
          {title}
        </h2>

        <p className="leading-relaxed text-zinc-400 transition-colors group-hover:text-zinc-300">
          {description}
        </p>
      </div>
    </motion.div>
  );
}

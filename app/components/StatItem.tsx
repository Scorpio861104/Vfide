'use client';

import { motion } from 'framer-motion';

import { useAnimatedCounter } from './useAnimatedCounter';
import { usePrefersReducedMotion } from './usePrefersReducedMotion';

const NEON_CLASSES: Record<string, string> = {
  cyan:    'stat-number-cyan',
  amber:   'stat-number-amber',
  emerald: 'stat-number-emerald',
  pink:    'stat-number-pink',
};

interface StatItemProps {
  value: number;
  label: string;
  prefix?: string;
  suffix?: string;
  color: string;
}

export function StatItem({ value, label, prefix = '', suffix = '', color }: StatItemProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const { count, setIsVisible } = useAnimatedCounter(value, prefersReducedMotion ? 0 : 2000);

  const neonClass = NEON_CLASSES[color] ?? '';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      onViewportEnter={() => setIsVisible(true)}
      className="relative text-center"
    >
      <div className={`stat-number-neon mb-2 text-3xl sm:text-4xl md:text-5xl font-black ${neonClass}`}>
        {prefix}
        {count.toLocaleString()}
        {suffix}
      </div>
      <div className="text-xs font-bold uppercase tracking-widest text-zinc-500 mt-1">
        {label}
      </div>
    </motion.div>
  );
}

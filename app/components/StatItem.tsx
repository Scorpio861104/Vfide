'use client';

import { motion } from 'framer-motion';

import { useAnimatedCounter } from './useAnimatedCounter';
import { usePrefersReducedMotion } from './usePrefersReducedMotion';

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

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      onViewportEnter={() => setIsVisible(true)}
      className="relative text-center"
    >
      <div className="counter mb-2 text-3xl font-bold sm:text-4xl md:text-5xl" style={{ color }}>
        {prefix}
        {count.toLocaleString()}
        {suffix}
      </div>
      <div className="text-sm uppercase tracking-wider text-zinc-500">{label}</div>
    </motion.div>
  );
}

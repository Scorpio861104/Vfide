'use client';

import type { ElementType } from 'react';
import { motion } from 'framer-motion';

interface FeatureCardProps {
  icon: ElementType;
  title: string;
  description: string;
  color: 'green' | 'blue' | 'purple' | 'orange';
  reduceMotion?: boolean;
}

export function FeatureCard({
  icon: Icon,
  title,
  description,
  color,
  reduceMotion = false,
}: FeatureCardProps) {
  const colorClasses = {
    green: { bg: 'from-emerald-500/20 to-green-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400', glow: 'group-hover:shadow-emerald-500/20' },
    blue: { bg: 'from-blue-500/20 to-cyan-500/10', border: 'border-blue-500/30', text: 'text-blue-400', glow: 'group-hover:shadow-blue-500/20' },
    purple: { bg: 'from-purple-500/20 to-pink-500/10', border: 'border-purple-500/30', text: 'text-purple-400', glow: 'group-hover:shadow-purple-500/20' },
    orange: { bg: 'from-orange-500/20 to-amber-500/10', border: 'border-orange-500/30', text: 'text-orange-400', glow: 'group-hover:shadow-orange-500/20' },
  } as const;

  const c = colorClasses[color];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      whileHover={reduceMotion ? undefined : { y: -3, scale: 1.01 }}
      className={`group relative rounded-2xl border bg-gradient-to-br p-6 backdrop-blur-xl transition-all duration-300 hover:shadow-xl ${c.bg} ${c.border} ${c.glow}`}
    >
      <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${c.bg} opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-50`} />

      <div className="relative z-10 text-center">
        <div className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border bg-gradient-to-br ${c.bg} ${c.border}`}>
          <Icon className={`h-8 w-8 ${c.text}`} />
        </div>
        <h3 className={`mb-2 text-lg font-bold ${c.text}`}>{title}</h3>
        <p className="text-sm leading-relaxed text-gray-400">{description}</p>
      </div>
    </motion.div>
  );
}

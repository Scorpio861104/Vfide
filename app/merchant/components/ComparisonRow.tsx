'use client';

import { motion } from 'framer-motion';

const COLOR_STYLES = {
  blue: 'from-blue-500/15 to-cyan-500/10 border-blue-500/30 text-blue-300',
  purple: 'from-purple-500/15 to-fuchsia-500/10 border-purple-500/30 text-purple-300',
  orange: 'from-orange-500/15 to-amber-500/10 border-orange-500/30 text-orange-300',
  cyan: 'from-cyan-500/20 to-blue-500/15 border-cyan-500/40 text-cyan-200',
} as const;

interface ComparisonRowProps {
  platform: string;
  fee: string;
  color?: keyof typeof COLOR_STYLES;
  highlight?: boolean;
}

export function ComparisonRow({
  platform,
  fee,
  color = 'blue',
  highlight = false,
}: ComparisonRowProps) {
  const tone = COLOR_STYLES[color] ?? COLOR_STYLES.blue;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      whileHover={{ x: 4 }}
      className={`group rounded-2xl border bg-gradient-to-r p-4 transition-all ${tone} ${
        highlight ? 'shadow-lg shadow-cyan-500/10' : ''
      }`}
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-lg font-bold text-white">{platform}</div>
          <div className="text-sm text-gray-400">Typical merchant processing cost</div>
        </div>
        <div className={`text-right font-mono text-sm sm:text-base ${highlight ? 'text-cyan-300' : 'text-white/85'}`}>
          {fee}
        </div>
      </div>
    </motion.div>
  );
}

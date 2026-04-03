'use client';

// Extracted from page.tsx — verify imports
import { GlassCard } from '@/components/ui/GlassCard';
import { motion } from 'framer-motion';

export function Section({ title, subtitle, icon, iconColor, children, delay = 0 }: SectionProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden"
    >
      <div className="px-6 py-4 border-b border-zinc-800 flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${iconColor} flex items-center justify-center text-white shadow-lg`}>
          {icon}
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-100">{title}</h2>
          <p className="text-xs text-gray-500">{subtitle}</p>
        </div>
      </div>
      <div className="p-4">
        {children}
      </div>
    </motion.section>
  );
}

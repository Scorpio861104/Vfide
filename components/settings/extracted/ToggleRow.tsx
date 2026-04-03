'use client';

// Extracted from page.tsx — verify imports
import { GlassCard } from '@/components/ui/GlassCard';
import { motion } from 'framer-motion';

export function ToggleRow({ label, description, checked, onChange, icon }: ToggleRowProps) {
  return (
  <motion.div 
    className="flex items-start justify-between gap-3 p-4 bg-zinc-900 border border-zinc-800 rounded-xl hover:border-zinc-700 transition-colors group"
    whileHover={{ scale: 1.01 }}
    transition={{ type: "spring", stiffness: 400, damping: 25 }}
  >
    <div className="flex items-start gap-3">
      {icon && (
        <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-gray-400 group-hover:text-yellow-500 transition-colors">
          {icon}
        </div>
      )}
      <div>
        <div className="text-sm font-medium text-gray-100">{label}</div>
        {description && <div className="text-xs text-gray-500 mt-0.5">{description}</div>}
      </div>
    </div>
    <AnimatedToggle checked={checked} onChange={onChange} ariaLabel={label} />
  </motion.div>
  );
}

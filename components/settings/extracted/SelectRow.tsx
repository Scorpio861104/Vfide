'use client';

// Extracted from page.tsx — verify imports
import { GlassCard } from '@/components/ui/GlassCard';
import { motion } from 'framer-motion';

export function SelectRow({ label, value, onChange, options, description, icon }: SelectRowProps) {
  return (
  <motion.div 
    className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl hover:border-zinc-700 transition-colors group"
    whileHover={{ scale: 1.01 }}
    transition={{ type: "spring", stiffness: 400, damping: 25 }}
  >
    <div className="flex items-start gap-3 mb-3">
      {icon && (
        <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-gray-400 group-hover:text-yellow-500 transition-colors">
          {icon}
        </div>
      )}
      <div className="flex-1">
        <div className="text-sm font-medium text-gray-100">{label}</div>
        {description && <div className="text-xs text-gray-500 mt-0.5">{description}</div>}
      </div>
    </div>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 border border-zinc-700 rounded-lg bg-zinc-800 text-gray-100 focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500 transition-all outline-none cursor-pointer"
      aria-label={label}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  </motion.div>
  );
}

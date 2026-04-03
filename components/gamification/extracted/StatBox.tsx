'use client';

// Extracted from page.tsx — verify imports
import { GlassCard } from '@/components/ui/GlassCard';
import { motion } from 'framer-motion';

export function StatBox({ label, value, icon, color }: StatBoxProps) {
  return (
    <div
      className={`rounded-lg p-4 md:p-6 bg-gradient-to-br ${color} text-white shadow-lg`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs md:text-sm font-medium opacity-90 mb-1 md:mb-2">
            {label}
          </p>
          <p className="text-2xl md:text-3xl font-bold">{value}</p>
        </div>
        <span className="text-3xl md:text-4xl opacity-80">{icon}</span>
      </div>
    </div>
  );
}

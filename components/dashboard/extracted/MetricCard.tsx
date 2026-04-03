'use client';

// Extracted from page.tsx — verify imports
import { GlassCard } from '@/components/ui/GlassCard';
import { motion } from 'framer-motion';

export function MetricCard({
  label,
  value,
  change,
  icon,
  highlight = false,
}: {
  label: string;
  value: number;
  change: number;
  icon: string;
  highlight?: boolean;
}) {
  const isPositive = change >= 0;

  return (
    <div className={`rounded-lg p-4 border ${
      highlight
        ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700'
        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
    }`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs md:text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
            {label}
          </p>
          <p className="text-lg md:text-2xl font-bold text-gray-900 dark:text-white">
            {typeof value === 'number' && label.includes('Balance')
              ? `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
              : typeof value === 'number'
              ? value.toLocaleString()
              : value}
          </p>
        </div>
        <span className="text-2xl md:text-3xl">{icon}</span>
      </div>
      {label !== 'Alerts' && (
        <div className={`mt-2 text-xs md:text-sm font-medium ${
          isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
        }`}>
          {isPositive ? '↑' : '↓'} {Math.abs(change).toFixed(1)}%
        </div>
      )}
    </div>
  );
}

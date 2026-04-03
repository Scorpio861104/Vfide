'use client';

// Extracted from page.tsx — verify imports
import { GlassCard } from '@/components/ui/GlassCard';
import { motion } from 'framer-motion';

export function AlertItem({ alert }: { alert: Alert }) {
  const bgColor = {
    success: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700',
    info: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700',
    warning: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700',
    error: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700',
  };

  const iconColor = {
    success: '✅',
    info: 'ℹ️',
    warning: '⚠️',
    error: '❌',
  };

  return (
    <div className={`rounded-lg p-4 border ${bgColor[alert.type]} ${alert.read ? 'opacity-75' : ''}`}>
      <div className="flex gap-3">
        <span className="text-xl shrink-0">{iconColor[alert.type]}</span>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 dark:text-white text-sm">
            {alert.title}
          </p>
          <p className="text-xs md:text-sm text-gray-700 dark:text-gray-300 mt-1">
            {alert.message}
          </p>
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {new Date(alert.timestamp).toLocaleTimeString()}
            </span>
            {alert.action && (
              <a
                href={alert.action.href}
                className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
              >
                {alert.action.label}
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

// Extracted from page.tsx — verify imports
import { GlassCard } from '@/components/ui/GlassCard';
import { motion } from 'framer-motion';

export function SavedSearchItem({ search, onUse, onDelete }: SavedSearchItemProps) {
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
      <div className="flex items-start justify-between mb-2">
        <div>
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
            {search.name}
          </h4>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {search.query || 'Custom filters'}
          </p>
        </div>
        <button
          onClick={() => onDelete(search.id)}
          className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
          aria-label="Delete saved search"
        >
          ✕
        </button>
      </div>

      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-3">
        <span>Used {search.useCount} times</span>
        {search.lastUsed && <span>{formatTimestamp(search.lastUsed)}</span>}
      </div>

      <button
        onClick={() => onUse(search)}
        className="w-full px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
      >
        Use Search
      </button>
    </div>
  );
};

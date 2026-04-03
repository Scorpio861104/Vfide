'use client';

// Extracted from page.tsx — verify imports
import { GlassCard } from '@/components/ui/GlassCard';
import { motion } from 'framer-motion';

export function HistoryItem({ item, onReuse, onDelete }: HistoryItemProps) {
  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
      <div className="flex-1 cursor-pointer" onClick={() => onReuse(item)}>
        <div className="flex items-center space-x-2 mb-1">
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            &quot;{item.query}&quot;
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            • {item.resultsCount} results
          </span>
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {formatTimestamp(item.timestamp)}
        </div>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete(item.id);
        }}
        className="ml-2 p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
        aria-label="Delete history item"
      >
        ✕
      </button>
    </div>
  );
};

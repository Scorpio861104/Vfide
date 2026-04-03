'use client';

// Extracted from page.tsx — verify imports
import { GlassCard } from '@/components/ui/GlassCard';
import { motion } from 'framer-motion';

export function SuggestionCard({ suggestion, onFollow, onDismiss }: SuggestionCardProps) {
  return (
  <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
    <div className="flex items-start gap-3 mb-3">
      <span className="text-3xl">{suggestion.user.avatar}</span>
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">{suggestion.user.displayName}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">@{suggestion.user.username}</p>
          </div>
          <div className="text-right text-xs font-semibold bg-gradient-to-r from-blue-500 to-purple-500 text-white px-2 py-1 rounded">
            {suggestion.score}%
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          {getReasonIcon(suggestion.reason)} {getReasonLabel(suggestion.reason)}
        </p>
      </div>
    </div>

    <div className="flex gap-2">
      <button
        onClick={() => onFollow(suggestion.userId)}
        className="flex-1 px-3 py-2 bg-blue-600 text-white rounded font-medium text-sm hover:bg-blue-700 transition-colors"
      >
        Follow
      </button>
      <button
        onClick={() => onDismiss(suggestion.userId)}
        className="flex-1 px-3 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded font-medium text-sm hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
      >
        Dismiss
      </button>
    </div>
  </div>
  );
}

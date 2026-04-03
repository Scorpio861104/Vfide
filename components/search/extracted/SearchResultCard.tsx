'use client';

// Extracted from page.tsx — verify imports
import { GlassCard } from '@/components/ui/GlassCard';
import { motion } from 'framer-motion';

export function SearchResultCard({ result, onSelect }: SearchResultCardProps) {
  return (
    <div
      className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => onSelect(result.id)}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center space-x-2">
          <span className="text-2xl">{getContentTypeIcon(result.type)}</span>
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
            {getContentTypeLabel(result.type)}
          </span>
          <span className={`px-2 py-0.5 text-xs rounded-full ${getStatusBadgeColor(result.status)}`}>
            {result.status}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
            {result.score}%
          </span>
        </div>
      </div>

      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
        {result.title}
      </h3>

      <p className="text-sm text-gray-600 dark:text-gray-300 mb-3 line-clamp-2">
        {result.description}
      </p>

      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1">
            <img
              src={result.author.avatar}
              alt={result.author.displayName}
              className="w-5 h-5 rounded-full"
            />
            <span>{result.author.displayName}</span>
          </div>
          <span>•</span>
          <span>{formatDate(result.createdAt)}</span>
          <span>•</span>
          <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">
            {result.category}
          </span>
        </div>
        {result.attachments && result.attachments > 0 && (
          <div className="flex items-center space-x-1">
            <span>📎</span>
            <span>{result.attachments}</span>
          </div>
        )}
      </div>

      {result.tags && result.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {result.tags.map((tag, idx) => (
            <span
              key={idx}
              className="px-2 py-0.5 text-xs bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-300 rounded"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

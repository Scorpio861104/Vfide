'use client';

// Extracted from page.tsx — verify imports
import { GlassCard } from '@/components/ui/GlassCard';
import { motion } from 'framer-motion';

export function ApiKeyCard({
  apiKey,
  onRevoke,
}: {
  apiKey: ApiKey;
  onRevoke: () => void;
}) {
  return (
    <motion.div 
      className="rounded-lg p-4 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ borderColor: 'rgba(59, 130, 246, 0.5)' }}
    >
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <p className="font-bold text-gray-900 dark:text-white">
              {apiKey.name}
            </p>
            <motion.span 
              className={`px-2 py-1 rounded text-xs font-medium ${
                apiKey.status === 'active'
                  ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300'
                  : 'bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-300'
              }`}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
            >
              {apiKey.status}
            </motion.span>
          </div>
          <motion.p
            className="text-sm font-mono text-gray-600 dark:text-gray-400 break-all"
            animate={{ opacity: 0.85 }}
          >
            {apiKey.maskedKey}
          </motion.p>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
            Created {new Date(apiKey.createdAt).toLocaleDateString()}
            {apiKey.lastUsed && ` · Last used ${new Date(apiKey.lastUsed).toLocaleDateString()}`}
          </p>
        </div>
        <div className="flex gap-2">
          {apiKey.status === 'active' && (
            <>
              <motion.button
                onClick={onRevoke}
                className="px-3 py-1 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Revoke
              </motion.button>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}

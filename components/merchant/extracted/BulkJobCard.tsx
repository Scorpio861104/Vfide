'use client';

// Extracted from page.tsx — verify imports
import { GlassCard } from '@/components/ui/GlassCard';
import { motion } from 'framer-motion';

export function BulkJobCard({ job }: { job: BulkPaymentJob }) {
  const progress = (job.successCount / job.totalRows) * 100;

  return (
    <div className="rounded-lg p-4 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="font-bold text-gray-900 dark:text-white truncate">
            📄 {job.filename}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {job.successCount} of {job.totalRows} processed · Total: ${job.totalAmount.toLocaleString()}
          </p>
          {job.status === 'processing' && (
            <div className="mt-2 w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
            job.status === 'processing'
              ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300'
              : job.status === 'completed'
              ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300'
              : 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300'
          }`}>
            {job.status === 'processing' ? '⏳ Processing' : job.status === 'completed' ? '✅ Completed' : '❌ Failed'}
          </span>
        </div>
      </div>
    </div>
  );
}

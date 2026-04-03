'use client';

// Extracted from page.tsx — verify imports
import { GlassCard } from '@/components/ui/GlassCard';
import { motion } from 'framer-motion';

export function RequestCard({ request }: { request: PaymentRequest }) {
  const statusColors = {
    pending: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700 text-yellow-800 dark:text-yellow-300',
    sent: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700 text-blue-800 dark:text-blue-300',
    completed: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700 text-green-800 dark:text-green-300',
    expired: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700 text-red-800 dark:text-red-300',
    cancelled: 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300',
  };

  return (
    <div className="rounded-lg p-4 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="font-bold text-gray-900 dark:text-white truncate">
            {request.amount} {request.currency} · {request.memo || 'Payment request'}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 truncate">
            To {request.toAddress}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
            Created {new Date(request.createdAt).toLocaleDateString()} · Updated {new Date(request.updatedAt).toLocaleDateString()}
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <span className={`px-3 py-1 rounded-full text-xs font-medium border ${statusColors[request.status] ?? statusColors.pending}`}>
            {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
          </span>
          <button
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
            onClick={() => navigator.clipboard.writeText(request.id)}
          >
            Copy Link
          </button>
        </div>
      </div>
    </div>
  );
}

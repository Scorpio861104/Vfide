'use client';

// Extracted from page.tsx — verify imports
import { GlassCard } from '@/components/ui/GlassCard';
import { motion } from 'framer-motion';

export function FriendRequestCard({ request, onAccept, onReject }: FriendRequestCardProps) {
  return (
  <motion.div 
    className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 flex items-center justify-between"
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: 20 }}
    whileHover={{ scale: 1.01 }}
  >
    <div className="flex items-center gap-3 flex-1">
      <motion.span 
        className="text-3xl"
        whileHover={{ scale: 1.2 }}
      >
        {request.fromUser.avatar}
      </motion.span>
      <div>
        <h3 className="font-semibold">{request.fromUser.displayName}</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">@{request.fromUser.username}</p>
        <p className="text-xs text-gray-500 mt-1">{formatTimeAgo(request.createdAt)}</p>
      </div>
    </div>
    <div className="flex gap-2">
      <motion.button
        onClick={() => onAccept(request.id)}
        className="px-4 py-2 bg-green-600 text-white rounded font-medium text-sm hover:bg-green-700 transition-colors flex items-center gap-1"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <Check className="w-4 h-4" /> Accept
      </motion.button>
      <motion.button
        onClick={() => onReject(request.id)}
        className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded font-medium text-sm hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors flex items-center gap-1"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <X className="w-4 h-4" /> Reject
      </motion.button>
    </div>
  </motion.div>
  );
}

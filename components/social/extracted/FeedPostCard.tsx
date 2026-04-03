'use client';

// Extracted from page.tsx — verify imports
import { GlassCard } from '@/components/ui/GlassCard';
import { motion } from 'framer-motion';

export function FeedPostCard({ post, onLike, onComment, onShare }: FeedPostCardProps) {
  return (
  <motion.div 
    className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    whileHover={{ boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
  >
    <div className="flex items-center gap-3 mb-3">
      <motion.span 
        className="text-2xl"
        whileHover={{ scale: 1.2 }}
      >
        {post.user.avatar}
      </motion.span>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-sm">{post.user.displayName}</h3>
          {post.user.isVerified && <span className="text-xs">✅</span>}
        </div>
        <p className="text-xs text-gray-500">{formatTimeAgo(post.timestamp)}</p>
      </div>
      <span className="text-lg">{getPostTypeIcon(post.type)}</span>
    </div>

    <p className="text-sm mb-3">{post.content}</p>

    <div className="flex gap-4 text-xs text-gray-600 dark:text-gray-400 mb-3">
      <span>{post.likes} likes</span>
      <span>{post.comments} comments</span>
      <span>{post.shares} shares</span>
    </div>

    <div className="flex gap-2">
      <motion.button
        onClick={() => onLike(post.id)}
        className={`flex-1 px-3 py-2 rounded font-medium text-sm transition-colors flex items-center justify-center gap-1 ${
          post.liked
            ? 'bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400'
            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
        }`}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <Heart className={`w-4 h-4 ${post.liked ? 'fill-current' : ''}`} />
        {post.liked ? 'Liked' : 'Like'}
      </motion.button>
      <motion.button
        onClick={() => onComment(post.id)}
        className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded font-medium text-sm hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center justify-center gap-1"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <MessageCircle className="w-4 h-4" /> Comment
      </motion.button>
      <motion.button
        onClick={() => onShare(post.id)}
        className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded font-medium text-sm hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center justify-center gap-1"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <Share2 className="w-4 h-4" /> Share
      </motion.button>
    </div>
  </motion.div>
  );
}

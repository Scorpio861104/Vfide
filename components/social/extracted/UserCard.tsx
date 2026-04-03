'use client';

// Extracted from page.tsx — verify imports
import { GlassCard } from '@/components/ui/GlassCard';
import { motion } from 'framer-motion';

export function UserCard({
  user,
  relationship,
  onFollow,
  onUnfollow,
  onAddFriend,
  onRemoveFriend,
  onBlock,
}: UserCardProps) {
  return (
  <motion.div 
    className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    whileHover={{ scale: 1.02, boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
  >
    <div className="flex items-start justify-between mb-3">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <motion.span 
            className="text-3xl"
            whileHover={{ scale: 1.2, rotate: 10 }}
          >
            {user.avatar}
          </motion.span>
          <div>
            <div className="flex items-center gap-1">
              <h3 className="font-semibold">{user.displayName}</h3>
              {user.isVerified && <span>✅</span>}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">@{user.username}</p>
          </div>
        </div>
        {user.bio && <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{user.bio}</p>}
      </div>
      <motion.button
        onClick={() => onBlock(user.id)}
        className="text-gray-400 hover:text-red-600 transition-colors"
        title="Block user"
        whileHover={{ scale: 1.2 }}
        whileTap={{ scale: 0.9 }}
      >
        <Ban className="w-4 h-4" />
      </motion.button>
    </div>

    <div className="grid grid-cols-3 gap-2 mb-3 text-center text-sm">
      <div>
        <div className="font-semibold">{user.proofScore}</div>
        <div className="text-xs text-gray-600 dark:text-gray-400">Proof Score</div>
      </div>
      <div>
        <div className="font-semibold">{user.badges}</div>
        <div className="text-xs text-gray-600 dark:text-gray-400">Badges</div>
      </div>
      <div>
        <div className="font-semibold">{user.followers}</div>
        <div className="text-xs text-gray-600 dark:text-gray-400">Followers</div>
      </div>
    </div>

    <div className="flex gap-2">
      {relationship.status === 'following' ? (
        <motion.button
          onClick={() => onUnfollow(user.id)}
          className="flex-1 px-3 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded font-medium text-sm hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          Following
        </motion.button>
      ) : (
        <motion.button
          onClick={() => onFollow(user.id)}
          className="flex-1 px-3 py-2 bg-blue-600 text-white rounded font-medium text-sm hover:bg-blue-700 transition-colors"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          Follow
        </motion.button>
      )}

      {relationship.status === 'friend' ? (
        <motion.button
          onClick={() => onRemoveFriend(user.id)}
          className="flex-1 px-3 py-2 bg-purple-600 text-white rounded font-medium text-sm hover:bg-purple-700 transition-colors"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          Friend
        </motion.button>
      ) : relationship.status === 'friend_requested' ? (
        <motion.button
          disabled
          className="flex-1 px-3 py-2 bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-300 rounded font-medium text-sm cursor-not-allowed"
        >
          Requested
        </motion.button>
      ) : (
        <motion.button
          onClick={() => onAddFriend(user.id)}
          className="flex-1 px-3 py-2 bg-green-600 text-white rounded font-medium text-sm hover:bg-green-700 transition-colors"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          Add Friend
        </motion.button>
      )}
    </div>
  </motion.div>
  );
}

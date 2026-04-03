'use client';

// Extracted from page.tsx — verify imports
import { GlassCard } from '@/components/ui/GlassCard';
import { motion } from 'framer-motion';

export function DelegationItem({ delegation, onRevoke, index = 0 }: DelegationItemProps) {
  const [isHovered, setIsHovered] = useState(false);
  const { playSuccess: _playSuccess, playError } = useTransactionSounds();
  
  const handleRevoke = () => {
    playError(); // Use error sound for revoke action
    onRevoke(delegation.delegator);
  };
  
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20, height: 0 }}
      transition={{ 
        duration: 0.4, 
        delay: index * 0.05,
        ease: [0.22, 1, 0.36, 1]
      }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      whileHover={{ scale: 1.01 }}
      className="relative bg-white dark:bg-gray-800 rounded-lg p-4 md:p-5 border border-gray-200 dark:border-gray-700 flex flex-col md:flex-row md:items-center md:justify-between gap-4 overflow-hidden"
    >
      {/* Active indicator pulse */}
      {delegation.active && (
        <motion.div
          className="absolute left-0 top-0 bottom-0 w-1 bg-green-500"
          animate={{ 
            opacity: [0.5, 1, 0.5]
          }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}
      
      <div className="flex-1 min-w-0 pl-2">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1 flex items-center gap-1">
              <Send size={10} /> From
            </p>
            <p className="font-mono text-sm font-medium text-gray-900 dark:text-white truncate">
              {delegation.delegator}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1 flex items-center gap-1">
              <Users size={10} /> To
            </p>
            <p className="font-mono text-sm font-medium text-gray-900 dark:text-white truncate">
              {delegation.delegatee}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1 flex items-center gap-1">
              <VoteIcon size={10} /> Votes
            </p>
            <p className="font-bold text-sm text-gray-900 dark:text-white">
              {(delegation.votes / 1000000).toFixed(2)}M
            </p>
          </div>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 flex items-center gap-1">
          {delegation.active ? (
            <motion.span 
              className="inline-flex items-center gap-1 text-green-600"
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <CheckCircle size={12} /> Active
            </motion.span>
          ) : (
            <span className="inline-flex items-center gap-1 text-red-500">
              <XCircle size={12} /> Revoked
            </span>
          )}
          <span className="mx-1">•</span>
          {new Date(delegation.timestamp).toLocaleDateString()}
        </p>
      </div>
      
      <AnimatePresence>
        {delegation.active && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <MobileButton
              onClick={handleRevoke}
              className="bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded-lg text-sm transition-colors w-full md:w-auto flex items-center gap-1"
            >
              <XCircle size={14} />
              Revoke
            </MobileButton>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Shimmer on hover */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"
            initial={{ x: '-100%' }}
            animate={{ x: '100%' }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: 'linear' }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

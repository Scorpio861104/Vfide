'use client';

// Extracted from page.tsx — verify imports
import { GlassCard } from '@/components/ui/GlassCard';
import { motion } from 'framer-motion';

export function ProposalCard({ proposal, onVote, index = 0, showConfetti = false }: ProposalCardProps) {
  const totalVotes = proposal.forVotes + proposal.againstVotes + proposal.abstainVotes;
  const forPercent = getVotePercentage(proposal.forVotes, totalVotes);
  const againstPercent = getVotePercentage(proposal.againstVotes, totalVotes);
  const abstainPercent = getVotePercentage(proposal.abstainVotes, totalVotes);
  const timeRemaining = getTimeRemaining(proposal.endDate);
  const isActive = proposal.status === 'active';
  const [votingDirection, setVotingDirection] = useState<string | null>(null);
  const { playSuccess } = useTransactionSounds();

  const handleVote = (direction: 'for' | 'against' | 'abstain') => {
    setVotingDirection(direction);
    playSuccess();
    onVote(proposal.id, direction);
    setTimeout(() => setVotingDirection(null), 1000);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 30, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ 
        duration: 0.5, 
        delay: index * 0.1,
        ease: [0.22, 1, 0.36, 1]
      }}
      whileHover={{ 
        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)',
        transition: { duration: 0.2 }
      }}
      className="relative bg-white dark:bg-gray-800 rounded-lg p-4 md:p-6 shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden"
    >
      {/* Confetti on vote */}
      <AnimatePresence>
        {showConfetti && <VoteConfetti onComplete={() => {}} />}
      </AnimatePresence>
      
      {/* Status glow for active proposals */}
      {isActive && (
        <motion.div
          className="absolute top-0 right-0 w-20 h-20 opacity-20 blur-2xl bg-green-500"
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.1, 0.2, 0.1]
          }}
          transition={{ duration: 3, repeat: Infinity }}
        />
      )}
      
      <div className="relative flex flex-col md:flex-row md:items-start md:justify-between gap-3 mb-4">
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <h3 className="text-base md:text-lg font-bold text-gray-900 dark:text-white flex-1">
              {proposal.title}
            </h3>
            <motion.span 
              className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusBadgeColor(proposal.status)}`}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 20, delay: index * 0.1 + 0.2 }}
            >
              {proposal.status.charAt(0).toUpperCase() + proposal.status.slice(1)}
            </motion.span>
            <motion.span 
              className={`text-xs px-2 py-1 rounded-full font-medium ${getCategoryColor(proposal.category)}`}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 20, delay: index * 0.1 + 0.3 }}
            >
              {proposal.category}
            </motion.span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
            {proposal.description}
          </p>
        </div>
      </div>

      {/* Voting Progress Bars - Animated */}
      {isActive && (
        <div className="mb-4 space-y-2">
          {/* For Votes */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm font-medium text-green-700 dark:text-green-400 flex items-center gap-1">
                <ThumbsUp size={14} />
                For ({(proposal.forVotes / 1000000).toFixed(1)}M)
              </span>
              <span className="text-xs text-gray-600 dark:text-gray-400">
                {forPercent.toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
              <motion.div
                className="bg-green-500 h-2 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(forPercent, 100)}%` }}
                transition={{ duration: 1, delay: index * 0.1 + 0.4, ease: 'easeOut' }}
              />
            </div>
          </div>

          {/* Against Votes */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm font-medium text-red-700 dark:text-red-400 flex items-center gap-1">
                <ThumbsDown size={14} />
                Against ({(proposal.againstVotes / 1000000).toFixed(1)}M)
              </span>
              <span className="text-xs text-gray-600 dark:text-gray-400">
                {againstPercent.toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
              <motion.div
                className="bg-red-500 h-2 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(againstPercent, 100)}%` }}
                transition={{ duration: 1, delay: index * 0.1 + 0.5, ease: 'easeOut' }}
              />
            </div>
          </div>

          {/* Abstain Votes */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-400 flex items-center gap-1">
                <Minus size={14} />
                Abstain ({(proposal.abstainVotes / 1000000).toFixed(1)}M)
              </span>
              <span className="text-xs text-gray-600 dark:text-gray-400">
                {abstainPercent.toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
              <motion.div
                className="bg-gray-500 h-2 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(abstainPercent, 100)}%` }}
                transition={{ duration: 1, delay: index * 0.1 + 0.6, ease: 'easeOut' }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Metadata */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 text-xs">
        <div>
          <p className="text-gray-600 dark:text-gray-400">Total Votes</p>
          <p className="font-bold text-gray-900 dark:text-white">
            {(totalVotes / 1000000).toFixed(1)}M
          </p>
        </div>
        <div>
          <p className="text-gray-600 dark:text-gray-400">Required</p>
          <p className="font-bold text-gray-900 dark:text-white">
            {(proposal.votesRequired / 1000000).toFixed(1)}M
          </p>
        </div>
        <div>
          <p className="text-gray-600 dark:text-gray-400">Proposer</p>
          <p className="font-mono text-gray-900 dark:text-white truncate">
            {proposal.proposer}
          </p>
        </div>
        <div>
          <p className="text-gray-600 dark:text-gray-400 flex items-center gap-1">
            <Clock size={12} /> Time Left
          </p>
          <motion.p 
            className="font-bold text-gray-900 dark:text-white"
            animate={timeRemaining !== 'Ended' && parseInt(timeRemaining) < 2 ? {
              color: ['#f59e0b', '#ef4444', '#f59e0b']
            } : {}}
            transition={{ duration: 1, repeat: Infinity }}
          >
            {timeRemaining}
          </motion.p>
        </div>
      </div>

      {/* Action Buttons - Animated */}
      {isActive && (
        <div className="flex gap-2">
          <motion.div className="flex-1" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <MobileButton
              onClick={() => handleVote('for')}
              className={`w-full bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-3 rounded-lg text-sm transition-colors flex items-center justify-center gap-1 ${
                votingDirection === 'for' ? 'ring-2 ring-green-300 ring-offset-2' : ''
              }`}
            >
              <ThumbsUp size={14} />
              Vote For
            </MobileButton>
          </motion.div>
          <motion.div className="flex-1" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <MobileButton
              onClick={() => handleVote('against')}
              className={`w-full bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-3 rounded-lg text-sm transition-colors flex items-center justify-center gap-1 ${
                votingDirection === 'against' ? 'ring-2 ring-red-300 ring-offset-2' : ''
              }`}
            >
              <ThumbsDown size={14} />
              Against
            </MobileButton>
          </motion.div>
          <motion.div className="flex-1" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <MobileButton
              onClick={() => handleVote('abstain')}
              className={`w-full bg-gray-500 hover:bg-gray-600 text-white font-medium py-2 px-3 rounded-lg text-sm transition-colors flex items-center justify-center gap-1 ${
                votingDirection === 'abstain' ? 'ring-2 ring-gray-300 ring-offset-2' : ''
              }`}
            >
              <Minus size={14} />
              Abstain
            </MobileButton>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}

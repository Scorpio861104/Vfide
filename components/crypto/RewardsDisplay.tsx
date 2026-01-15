/**
 * Token Rewards Display Component
 * 
 * Show and claim VFIDE token rewards for engagement.
 */

'use client';

import { useAnnounce } from '@/lib/accessibility';
import { TokenReward, useRewards } from '@/lib/crypto';
import { AnimatePresence, motion } from 'framer-motion';
import {
    Award,
    Calendar,
    Heart,
    MessageSquare,
    Share2,
    Sparkles,
    TrendingUp,
    Users,
} from 'lucide-react';
import React from 'react';
import { safeParseFloat } from '@/lib/validation';

interface RewardsDisplayProps {
  userId: string;
}

export function RewardsDisplay({ userId }: RewardsDisplayProps) {
  const { rewards, totalUnclaimed, loading, claim } = useRewards(userId);
  const { announce } = useAnnounce();
  const [claiming, setClaiming] = React.useState(false);

  const handleClaim = async () => {
    setClaiming(true);
    try {
      await claim();
      announce(`Claimed ${totalUnclaimed} VFIDE tokens`, 'polite');
    } catch {
      announce('Failed to claim rewards', 'assertive');
    } finally {
      setClaiming(false);
    }
  };

  const unclaimedRewards = rewards.filter((r) => !r.claimed);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-6 h-6 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Total */}
      <div className="bg-linear-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-gray-400 text-sm mb-1">Total Unclaimed Rewards</div>
            <div className="text-white text-4xl font-bold flex items-center gap-2">
              {totalUnclaimed}
              <span className="text-2xl text-purple-400">VFIDE</span>
            </div>
          </div>
          <div className="w-16 h-16 bg-linear-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
            <Award className="w-8 h-8 text-white" />
          </div>
        </div>

        {safeParseFloat(totalUnclaimed, 0) > 0 && (
          <button
            onClick={handleClaim}
            disabled={claiming}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-linear-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {claiming ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Claiming...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                <span>Claim All Rewards</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Rewards List */}
      {unclaimedRewards.length > 0 && (
        <div>
          <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-purple-400" />
            <span>Recent Rewards</span>
          </h3>
          <div className="space-y-2">
            <AnimatePresence>
              {unclaimedRewards.slice(0, 10).map((reward) => (
                <RewardCard key={reward.id} reward={reward} />
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Empty State */}
      {rewards.length === 0 && (
        <div className="bg-[#1A1A1F] border border-[#2A2A2F] rounded-lg p-8 text-center">
          <Award className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 mb-2">No rewards yet</p>
          <p className="text-gray-500 text-sm">
            Engage with the community to earn VFIDE tokens!
          </p>
        </div>
      )}

      {/* Rewards Info */}
      <div className="bg-[#1A1A1F] border border-[#2A2A2F] rounded-lg p-4">
        <h4 className="text-white font-medium mb-3">Earn VFIDE Tokens</h4>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-gray-400">
            <MessageSquare className="w-4 h-4 text-blue-400" />
            <span>Send messages: 10 VFIDE</span>
          </div>
          <div className="flex items-center gap-2 text-gray-400">
            <Heart className="w-4 h-4 text-pink-400" />
            <span>React to content: 5 VFIDE</span>
          </div>
          <div className="flex items-center gap-2 text-gray-400">
            <Users className="w-4 h-4 text-purple-400" />
            <span>Create groups: 50 VFIDE</span>
          </div>
          <div className="flex items-center gap-2 text-gray-400">
            <Share2 className="w-4 h-4 text-green-400" />
            <span>Share content: 20 VFIDE</span>
          </div>
          <div className="flex items-center gap-2 text-gray-400">
            <Calendar className="w-4 h-4 text-orange-400" />
            <span>Daily login: 15 VFIDE</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Reward Card - Memoized for list performance
// ============================================================================

const RewardCard = React.memo(function RewardCard({ reward }: { reward: TokenReward }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="bg-[#1A1A1F] border border-purple-500/20 rounded-lg p-3 flex items-center gap-3 hover:border-purple-500/40 transition-colors"
    >
      <div className="w-10 h-10 bg-linear-to-br from-purple-500/20 to-pink-500/20 rounded-lg flex items-center justify-center shrink-0">
        {renderIconForAction(reward.action, "w-5 h-5 text-purple-400")}
      </div>

      <div className="flex-1 min-w-0">
        <div className="text-white font-medium">{getActionLabel(reward.action)}</div>
        <div className="text-xs text-gray-400">
          {new Date(reward.timestamp).toLocaleString()}
        </div>
      </div>

      <div className="text-right">
        <div className="text-purple-400 font-bold">+{reward.amount}</div>
        <div className="text-xs text-gray-500">VFIDE</div>
      </div>
    </motion.div>
  );
});

// ============================================================================
// Helpers
// ============================================================================

function renderIconForAction(action: TokenReward['action'], className: string) {
  switch (action) {
    case 'message_sent':
      return <MessageSquare className={className} />;
    case 'reaction_given':
      return <Heart className={className} />;
    case 'group_created':
      return <Users className={className} />;
    case 'member_invited':
      return <Users className={className} />;
    case 'content_shared':
      return <Share2 className={className} />;
    case 'daily_login':
      return <Calendar className={className} />;
    default:
      return <Award className={className} />;
  }
}

function getActionLabel(action: TokenReward['action']): string {
  switch (action) {
    case 'message_sent':
      return 'Message Sent';
    case 'reaction_given':
      return 'Reaction Given';
    case 'group_created':
      return 'Group Created';
    case 'member_invited':
      return 'Member Invited';
    case 'content_shared':
      return 'Content Shared';
    case 'daily_login':
      return 'Daily Login';
    default:
      return 'Reward Earned';
  }
}

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Trophy, TrendingUp, Award, Crown, Zap, Users } from 'lucide-react';
import { useAccount } from 'wagmi';
import { getProgress as _getProgress, getAllUserProgress } from '@/lib/gamification';
import { Skeleton } from '@/components/ui/Skeleton';

interface LeaderboardEntry {
  address: string;
  alias?: string;
  level: number;
  totalXP: number;
  achievementCount: number;
  rank: number;
}

type LeaderboardCategory = 'xp' | 'level' | 'achievements' | 'friends';

export function Leaderboard() {
  const { address } = useAccount();
  const [isLoading, setIsLoading] = useState(true);
  const [rawProgress, setRawProgress] = useState<ReturnType<typeof getAllUserProgress>>([]);
  const [category, setCategory] = useState<LeaderboardCategory>('xp');
  const [timeRange, _setTimeRange] = useState<'all' | 'week' | 'month'>('all');

  // Load leaderboard data once
  useEffect(() => {
    if (typeof window === 'undefined') return;

    setIsLoading(true);
    
    try {
      // Get all user progress from gamification system
      const allProgress = getAllUserProgress();
      setRawProgress(allProgress);
    } catch (e) {
      console.error('Failed to load leaderboard:', e);
      setRawProgress([]);
    } finally {
      setIsLoading(false);
    }
  }, [timeRange]);

  // Memoize sorting and ranking computation
  const leaderboard = useMemo(() => {
    // Sort based on category
    const sorted = [...rawProgress].sort((a, b) => {
      switch (category) {
        case 'xp':
          return b.totalXP - a.totalXP;
        case 'level':
          return b.level - a.level || b.totalXP - a.totalXP;
        case 'achievements':
          return b.unlockedAchievements.length - a.unlockedAchievements.length;
        case 'friends':
          return (b.stats.friendsAdded || 0) - (a.stats.friendsAdded || 0);
        default:
          return 0;
      }
    });

    // Add ranks
    return sorted.map((entry, index) => ({
      address: entry.address,
      alias: entry.alias,
      level: entry.level,
      totalXP: entry.totalXP,
      achievementCount: entry.unlockedAchievements.length,
      rank: index + 1,
    }));
  }, [rawProgress, category]);

  const currentUserRank = useMemo(() => {
    if (!address) return null;
    return leaderboard.find(entry => entry.address.toLowerCase() === address.toLowerCase());
  }, [leaderboard, address]);

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="w-5 h-5 text-yellow-400" />;
    if (rank === 2) return <Trophy className="w-5 h-5 text-gray-400" />;
    if (rank === 3) return <Trophy className="w-5 h-5 text-amber-600" />;
    return <span className="text-sm text-zinc-500 font-mono">#{rank}</span>;
  };

  const getCategoryValue = (entry: LeaderboardEntry) => {
    switch (category) {
      case 'xp':
        return `${entry.totalXP.toLocaleString()} XP`;
      case 'level':
        return `Level ${entry.level}`;
      case 'achievements':
        return `${entry.achievementCount} Achievements`;
      case 'friends':
        return `${entry.achievementCount} Friends`; // Would need to track this separately
      default:
        return '';
    }
  };

  return (
    <div className="bg-zinc-950 rounded-2xl border border-zinc-800 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-zinc-800">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-linear-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
            <Trophy className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-zinc-100">Leaderboard</h2>
            <p className="text-sm text-zinc-500">Top performers in the Vfide community</p>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setCategory('xp')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              category === 'xp'
                ? 'bg-cyan-400 text-zinc-950'
                : 'bg-zinc-900 text-zinc-500 hover:bg-zinc-800'
            }`}
          >
            <Zap className="w-4 h-4" />
            XP
          </button>
          <button
            onClick={() => setCategory('level')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              category === 'level'
                ? 'bg-cyan-400 text-zinc-950'
                : 'bg-zinc-900 text-zinc-500 hover:bg-zinc-800'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            Level
          </button>
          <button
            onClick={() => setCategory('achievements')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              category === 'achievements'
                ? 'bg-cyan-400 text-zinc-950'
                : 'bg-zinc-900 text-zinc-500 hover:bg-zinc-800'
            }`}
          >
            <Award className="w-4 h-4" />
            Achievements
          </button>
          <button
            onClick={() => setCategory('friends')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              category === 'friends'
                ? 'bg-cyan-400 text-zinc-950'
                : 'bg-zinc-900 text-zinc-500 hover:bg-zinc-800'
            }`}
          >
            <Users className="w-4 h-4" />
            Friends
          </button>
        </div>
      </div>

      {/* Your Rank (if logged in) */}
      {currentUserRank && (
        <div className="p-4 bg-cyan-400/10 border-b border-cyan-400/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getRankIcon(currentUserRank.rank)}
              <div>
                <p className="text-sm font-semibold text-zinc-100">Your Rank</p>
                <p className="text-xs text-zinc-500">{currentUserRank.alias || `${currentUserRank.address.slice(0, 6)}...`}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-cyan-400">{getCategoryValue(currentUserRank)}</p>
              <p className="text-xs text-zinc-500">Level {currentUserRank.level}</p>
            </div>
          </div>
        </div>
      )}

      {/* Leaderboard List */}
      <div className="max-h-[600px] overflow-y-auto">
        {isLoading ? (
          <div className="p-4 space-y-2">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex items-center gap-3 p-3 bg-zinc-900 rounded-lg">
                <Skeleton width={40} height={40} rounded="full" />
                <div className="flex-1 space-y-2">
                  <Skeleton height={16} className="w-3/5" />
                  <Skeleton height={12} className="w-2/5" />
                </div>
              </div>
            ))}
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="p-12 text-center">
            <Trophy className="w-16 h-16 text-zinc-500 mx-auto mb-4" />
            <p className="text-sm text-zinc-500">No leaderboard data yet</p>
            <p className="text-xs text-zinc-500 mt-2">Be the first to earn XP and climb the ranks!</p>
          </div>
        ) : (
          <div className="divide-y divide-[#2A2A2F]">
            {leaderboard.slice(0, 50).map((entry, index) => {
              const isCurrentUser = address && entry.address.toLowerCase() === address.toLowerCase();
              
              return (
                <motion.div
                  key={entry.address}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`flex items-center gap-4 p-4 hover:bg-zinc-900 transition-colors ${
                    isCurrentUser ? 'bg-cyan-400/5' : ''
                  }`}
                >
                  {/* Rank */}
                  <div className="w-12 flex items-center justify-center">
                    {getRankIcon(entry.rank)}
                  </div>

                  {/* Avatar */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${
                    entry.rank <= 3
                      ? 'bg-linear-to-br from-yellow-400 to-orange-500'
                      : 'bg-linear-to-br from-cyan-400 to-violet-400'
                  }`}>
                    {(entry.alias || entry.address).charAt(0).toUpperCase()}
                  </div>

                  {/* User Info */}
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-zinc-100">
                      {entry.alias || `${entry.address.slice(0, 6)}...${entry.address.slice(-4)}`}
                      {isCurrentUser && (
                        <span className="ml-2 text-xs text-cyan-400">(You)</span>
                      )}
                    </p>
                    <p className="text-xs text-zinc-500">Level {entry.level}</p>
                  </div>

                  {/* Stats */}
                  <div className="text-right">
                    <p className="text-sm font-bold text-zinc-100">{getCategoryValue(entry)}</p>
                    <p className="text-xs text-zinc-500">{entry.achievementCount} achievements</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      {leaderboard.length > 0 && (
        <div className="p-4 bg-zinc-900 border-t border-zinc-800 text-center">
          <p className="text-xs text-zinc-500">
            Showing top {Math.min(50, leaderboard.length)} of {leaderboard.length} users
          </p>
        </div>
      )}
    </div>
  );
}

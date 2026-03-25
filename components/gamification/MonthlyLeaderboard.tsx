'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { motion } from 'framer-motion';
import { Trophy, TrendingUp } from 'lucide-react';

interface LeaderboardEntry {
  rank: number;
  username: string;
  walletAddress: string;
  stats: {
    totalXp: number;
    questsCompleted: number;
    challengesCompleted: number;
    currentStreak: number;
    transactionsCount: number;
    socialInteractions: number;
    governanceVotes: number;
  };
  activityScore: number;
  tier: string;
}

interface UserPosition {
  rank: number;
  finalRank: number | null;
  activityScore: number;
  tier: string;
  stats: Record<string, number | string>;
}

export default function MonthlyLeaderboard() {
  const { address } = useAccount();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [userPosition, setUserPosition] = useState<UserPosition | null>(null);
  const [monthYear] = useState(new Date().toISOString().slice(0, 7));
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchLeaderboard = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const params = new URLSearchParams({
        month: monthYear,
        limit: '200',
      });
      if (address) {
        params.append('userAddress', address);
      }

      const response = await fetch(`/api/leaderboard/monthly?${params}`);
      const data = await response.json();

      setLeaderboard(data.leaderboard || []);
      setUserPosition(data.userPosition);
    } catch {
      setFetchError('Failed to load leaderboard. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [address, monthYear]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case 'Elite': return '👑';
      case 'Champion': return '🥇';
      case 'Challenger': return '🥈';
      case 'Contender': return '🥉';
      case 'Competitor': return '🏅';
      default: return '⭐';
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'Elite': return 'from-yellow-400 to-orange-500';
      case 'Champion': return 'from-blue-400 to-purple-500';
      case 'Challenger': return 'from-green-400 to-teal-500';
      case 'Contender': return 'from-gray-400 to-gray-600';
      case 'Competitor': return 'from-gray-300 to-gray-500';
      default: return 'from-gray-200 to-gray-400';
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-4 space-y-6">
      {/* Header */}
      <motion.div 
        className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-xl p-6 border border-purple-500/30"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center gap-3">
          <Trophy className="w-8 h-8 text-purple-400" />
          <div>
            <h1 className="text-3xl font-bold">Monthly Governance Rankings</h1>
            <p className="text-gray-400 mt-1">ProofScore leaderboard — governance participation only</p>
          </div>
        </div>
      </motion.div>

      {/* User's Position Card */}
      {userPosition && (
        <motion.div 
          className={`bg-gradient-to-r ${getTierColor(userPosition.tier)} rounded-xl p-6 border-2 border-white/20 relative overflow-hidden`}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 200 }}
        >
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
            initial={{ x: '-100%' }}
            animate={{ x: '200%' }}
            transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
          />
          <div className="flex items-center justify-between flex-wrap gap-4 relative z-10">
            <div>
              <div className="text-sm opacity-80">Your Position</div>
              <motion.div 
                className="text-4xl font-bold flex items-center gap-2"
                initial={{ x: -20 }}
                animate={{ x: 0 }}
              >
                <motion.span
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 1, repeat: Infinity, repeatDelay: 2 }}
                >
                  {getTierIcon(userPosition.tier)}
                </motion.span>
                #{userPosition.rank}
              </motion.div>
              <div className="text-sm mt-1">
                {userPosition.tier} Tier • {userPosition.activityScore.toLocaleString()} pts
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Leaderboard Table */}
      <motion.div 
        className="bg-white/5 rounded-xl border border-white/10 overflow-hidden"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <div
          className="table-responsive"
          role="region"
          aria-label="Monthly leaderboard results"
          tabIndex={0}
        >
          <table className="w-full">
            <thead className="bg-white/5">
              <tr>
                <th className="px-4 py-3 text-left">Rank</th>
                <th className="px-4 py-3 text-left">User</th>
                <th className="px-4 py-3 text-right">Activity Score</th>
                <th className="px-4 py-3 text-right">XP</th>
                <th className="px-4 py-3 text-right">Quests</th>
                <th className="px-4 py-3 text-right">Streak</th>
                <th className="px-4 py-3 text-right">Tier</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                    Loading leaderboard...
                  </td>
                </tr>
              ) : fetchError ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-red-400">
                    {fetchError}
                  </td>
                </tr>
              ) : leaderboard.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                    No data available for this month
                  </td>
                </tr>
              ) : (
                leaderboard.map((entry, index) => (
                  <motion.tr
                    key={entry.rank}
                    className={`border-t border-white/5 hover:bg-white/5 transition ${
                      entry.walletAddress?.toLowerCase() === address?.toLowerCase()
                        ? 'bg-yellow-500/10'
                        : ''
                    }`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.02 }}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 font-bold">
                        {entry.rank <= 3 && (
                          <motion.span 
                            className="text-xl"
                            animate={entry.rank === 1 ? { rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] } : {}}
                            transition={{ duration: 1, repeat: Infinity, repeatDelay: 2 }}
                          >
                            {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : '🥉'}
                          </motion.span>
                        )}
                        #{entry.rank}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{entry.username}</div>
                      <div className="text-xs text-gray-400">
                        {entry.walletAddress.slice(0, 6)}...{entry.walletAddress.slice(-4)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-blue-400">
                      {entry.activityScore.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right">{entry.stats.totalXp.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right">{entry.stats.questsCompleted}</td>
                    <td className="px-4 py-3 text-right">
                      {entry.stats.currentStreak > 0 && (
                        <span className="text-orange-500">🔥 {entry.stats.currentStreak}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm">
                        {getTierIcon(entry.tier)} {entry.tier}
                      </span>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 bg-white/5 border-t border-white/10 text-center text-sm text-gray-400">
          Showing top 200 players by governance participation score
        </div>
      </motion.div>

      {/* Scoring Info */}
      <div className="bg-white/5 rounded-xl p-6 border border-white/10">
        <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          How Activity Score is Calculated
        </h3>
        <div className="text-sm text-yellow-500/80 mb-4 font-semibold">
          ⚠️ IMPORTANT: Only VFIDE transactions count toward ProofScore, XP, badges, and leaderboard ranking.
          Other tokens work normally but provide no gamification benefits.
        </div>
        
        {/* Eligibility Requirements */}
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-4">
          <div className="font-semibold text-red-400 mb-2">🚨 Eligibility Requirements</div>
          <div className="text-sm text-gray-300 space-y-1">
            <div>• Minimum ProofScore: 500 (50%)</div>
            <div>• Minimum account age: 7 days</div>
            <div>• At least 1 VFIDE transaction this month</div>
            <div>• Transactions must be ≥0.1 VFIDE (anti-spam)</div>
            <div>• Max 100 transactions/day (anti-bot)</div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <div className="font-semibold text-blue-400">Base Points</div>
            <div className="text-gray-400 mt-1">• 1 pt per XP earned</div>
            <div className="text-gray-400">• 50 pts per quest completed</div>
            <div className="text-gray-400">• 500 pts per weekly challenge</div>
            <div className="text-gray-400">• 25 pts per VFIDE transaction</div>
            <div className="text-gray-400">• 10 pts per social interaction</div>
          </div>
          <div>
            <div className="font-semibold text-green-400">Streak Bonus (Exponential)</div>
            <div className="text-gray-400 mt-1">• Days 1-6: 100 pts/day</div>
            <div className="text-gray-400">• Days 7-13: 150 pts/day</div>
            <div className="text-gray-400">• Days 14-29: 200 pts/day</div>
            <div className="text-gray-400">• Day 30+: 300 pts/day</div>
            <div className="text-xs text-green-500 mt-1">Example: 30 days = 6,350 bonus pts!</div>
          </div>
          <div>
            <div className="font-semibold text-purple-400">Quality Multiplier (ProofScore)</div>
            <div className="text-gray-400 mt-1">• 95%+: 1.50x multiplier 👑</div>
            <div className="text-gray-400">• 90-94%: 1.30x multiplier</div>
            <div className="text-gray-400">• 85-89%: 1.15x multiplier</div>
            <div className="text-gray-400">• 80-84%: 1.05x multiplier</div>
            <div className="text-gray-400">• 50-79%: 1.00x (baseline)</div>
          </div>
        </div>
        
        <div className="mt-4 pt-4 border-t border-white/10">
          <div className="font-semibold text-orange-400 mb-2">🛡️ Anti-Gaming Protection</div>
          <div className="text-xs text-gray-400">
            Self-transactions (wash trading) are automatically detected and excluded • 
            Micro-spam transactions blocked • Rate limits prevent bot manipulation
          </div>
        </div>
      </div>
    </div>
  );
}

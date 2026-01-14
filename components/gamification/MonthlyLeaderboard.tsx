'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { Trophy, TrendingUp, DollarSign } from 'lucide-react';

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
  prizeAmount: string;
  prizeClaimed: boolean;
}

interface UserPosition {
  rank: number;
  finalRank: number | null;
  activityScore: number;
  tier: string;
  prizeAmount: string;
  prizeClaimed: boolean;
  stats: any;
}

export default function MonthlyLeaderboard() {
  const { address } = useAccount();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [userPosition, setUserPosition] = useState<UserPosition | null>(null);
  const [prizePool, setPrizePool] = useState({ total: '0', distributed: '0', distributionComplete: false });
  const [monthYear] = useState(new Date().toISOString().slice(0, 7));
  const [loading, setLoading] = useState(true);

  const fetchLeaderboard = useCallback(async () => {
    setLoading(true);
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
      setPrizePool(data.prizePool);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoading(false);
    }
  }, [address, monthYear]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  const claimPrize = async () => {
    if (!address) return;

    try {
      const response = await fetch('/api/leaderboard/claim-prize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userAddress: address, monthYear }),
      });

      if (response.ok) {
        alert('Prize claimed successfully!');
        fetchLeaderboard();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to claim prize');
      }
    } catch (error) {
      console.error('Error claiming prize:', error);
      alert('Failed to claim prize');
    }
  };

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
      {/* Header with Prize Pool */}
      <div className="bg-linear-to-r from-yellow-500/20 to-orange-500/20 rounded-xl p-6 border border-yellow-500/30">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Trophy className="w-8 h-8 text-yellow-500" />
              Monthly Competition
            </h1>
            <p className="text-gray-400 mt-2">Top 1,000 players win VFIDE tokens from burn fees!</p>
            <p className="text-yellow-500/80 text-sm mt-1">⚠️ Only VFIDE transactions count toward your score</p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-400">Prize Pool</div>
            <div className="text-3xl font-bold text-yellow-500 flex items-center gap-2">
              <DollarSign className="w-6 h-6" />
              {prizePool.total} VFIDE
            </div>
            {prizePool.distributionComplete && (
              <div className="text-xs text-green-400 mt-1">✅ Distribution Complete</div>
            )}
          </div>
        </div>
      </div>

      {/* Prize Tier Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {[
          { name: 'Elite', range: '1-100', percentage: '40%', icon: '👑' },
          { name: 'Champion', range: '101-300', percentage: '30%', icon: '🥇' },
          { name: 'Challenger', range: '301-600', percentage: '20%', icon: '🥈' },
          { name: 'Contender', range: '601-850', percentage: '7%', icon: '🥉' },
          { name: 'Competitor', range: '851-1000', percentage: '3%', icon: '🏅' },
        ].map((tier) => (
          <div key={tier.name} className="bg-white/5 rounded-lg p-4 border border-white/10 text-center">
            <div className="text-2xl mb-1">{tier.icon}</div>
            <div className="font-bold">{tier.name}</div>
            <div className="text-xs text-gray-400">Rank {tier.range}</div>
            <div className="text-sm text-yellow-500 font-semibold mt-1">{tier.percentage}</div>
          </div>
        ))}
      </div>

      {/* User's Position Card */}
      {userPosition && (
        <div className={`bg-linear-to-r ${getTierColor(userPosition.tier)} rounded-xl p-6 border-2 border-white/20`}>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="text-sm opacity-80">Your Position</div>
              <div className="text-4xl font-bold flex items-center gap-2">
                {getTierIcon(userPosition.tier)} #{userPosition.rank}
              </div>
              <div className="text-sm mt-1">
                {userPosition.tier} Tier • {userPosition.activityScore.toLocaleString()} pts
              </div>
            </div>
            {userPosition.finalRank && userPosition.finalRank <= 1000 && (
              <div className="text-right">
                <div className="text-sm opacity-80">Your Prize</div>
                <div className="text-2xl font-bold">{userPosition.prizeAmount} VFIDE</div>
                {!userPosition.prizeClaimed && prizePool.distributionComplete && (
                  <button
                    onClick={claimPrize}
                    className="mt-2 px-4 py-2 bg-white text-black rounded-lg font-semibold hover:bg-gray-200 transition"
                  >
                    Claim Prize 🎁
                  </button>
                )}
                {userPosition.prizeClaimed && (
                  <div className="text-xs text-green-300 mt-2">✅ Claimed</div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Leaderboard Table */}
      <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
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
                <th className="px-4 py-3 text-right">Prize</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                    Loading leaderboard...
                  </td>
                </tr>
              ) : leaderboard.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                    No data available for this month
                  </td>
                </tr>
              ) : (
                leaderboard.map((entry) => (
                  <tr
                    key={entry.rank}
                    className={`border-t border-white/5 hover:bg-white/5 transition ${
                      entry.walletAddress?.toLowerCase() === address?.toLowerCase()
                        ? 'bg-yellow-500/10'
                        : ''
                    }`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 font-bold">
                        {entry.rank <= 3 && (
                          <span className="text-xl">
                            {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : '🥉'}
                          </span>
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
                    <td className="px-4 py-3 text-right font-semibold text-yellow-500">
                      {parseFloat(entry.prizeAmount) > 0 ? `${entry.prizeAmount} VFIDE` : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 bg-white/5 border-t border-white/10 text-center text-sm text-gray-400">
          Showing top 200 players • <span className="text-yellow-500 font-semibold">Top 1,000</span> earn rewards monthly
        </div>
      </div>

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

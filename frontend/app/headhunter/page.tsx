'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { 
  Trophy, Users, TrendingUp, Gift, Copy, Check, 
  Award, Target, Crown,
  Share2, MessageCircle, Mail, Twitter
} from 'lucide-react';
import { 
  useHeadhunterStats, 
  useHeadhunterReward, 
  useClaimHeadhunterReward,
  useReferralLink,
  useQuarterlyPoolEstimate,
  useLeaderboard,
  useReferralActivity
} from '@/hooks/useHeadhunterHooks';
import { formatEther } from 'viem';

/**
 * HEADHUNTER COMPETITION PAGE
 * 
 * Features:
 * - Referral dashboard (points, rank, earnings)
 * - Top 20 leaderboard
 * - Referral link generator
 * - Quarterly claim interface
 * - Progress tracking
 */

export default function HeadhunterPage() {
  const { address, isConnected } = useAccount();
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'leaderboard' | 'activity'>('dashboard');

  // Real contract hooks
  const stats = useHeadhunterStats();
  const { poolEstimate, formattedPool } = useQuarterlyPoolEstimate();
  const { referralLink, qrCodeUrl } = useReferralLink();
  const reward = useHeadhunterReward(stats.currentYearNumber, stats.currentQuarterNumber);
  const { claimReward, isPending: isClaimPending, isSuccess: isClaimSuccess } = useClaimHeadhunterReward();
  const { leaderboard, isLoading: leaderboardLoading } = useLeaderboard(stats.currentYearNumber, stats.currentQuarterNumber);
  const { activity: recentActivity, isLoading: activityLoading } = useReferralActivity();

  // Calculate days until quarter end
  const quarterEndsAtMs = Number(stats.quarterEndsAt) * 1000;
  const daysUntilQuarterEnd = Math.max(0, Math.ceil((quarterEndsAtMs - Date.now()) / (1000 * 60 * 60 * 24)));

  const copyReferralLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareOptions = [
    { name: 'Twitter', icon: Twitter, color: 'bg-[#1DA1F2]', link: `https://twitter.com/intent/tweet?text=Join VFIDE with my referral link!&url=${encodeURIComponent(referralLink)}` },
    { name: 'Telegram', icon: MessageCircle, color: 'bg-[#0088cc]', link: `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=Join VFIDE!` },
    { name: 'Email', icon: Mail, color: 'bg-[#EA4335]', link: `mailto:?subject=Join VFIDE&body=Sign up with my link: ${encodeURIComponent(referralLink)}` },
  ];

  const handleClaimReward = async () => {
    if (!reward.quarterEnded || reward.claimed) return;
    
    try {
      await claimReward(stats.currentYearNumber, stats.currentQuarterNumber);
    } catch (error) {
      console.error('Failed to claim reward:', error);
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center">
        <div className="text-center">
          <Trophy className="w-24 h-24 text-[#FFD700] mx-auto mb-6" />
          <h1 className="text-3xl font-bold text-white mb-4">Headhunter Competition</h1>
          <p className="text-[#A0A0A5] mb-6">Connect your wallet to participate</p>
          <button className="px-8 py-3 bg-gradient-to-r from-[#FFD700] to-[#FFA500] text-[#0A0A0B] rounded-lg font-semibold hover:opacity-90 transition-opacity">
            Connect Wallet
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#FFD700]/10 to-[#FFA500]/10 border-b border-[#FFD700]/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Trophy className="w-10 h-10 text-[#FFD700]" />
                <h1 className="text-4xl font-bold bg-gradient-to-r from-[#FFD700] to-[#FFA500] bg-clip-text text-transparent">
                  Headhunter Competition
                </h1>
              </div>
              <p className="text-[#A0A0A5] text-lg">
                Recruit users and merchants to earn quarterly rewards
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-[#A0A0A5] mb-1">Current Quarter</div>
              <div className="text-3xl font-bold text-[#FFD700]">Q{stats.currentQuarterNumber}</div>
              <div className="text-sm text-[#50C878]">{daysUntilQuarterEnd} days left</div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-[#1A1A1F] border border-[#2A2A2F] rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <Target className="w-5 h-5 text-[#FFD700]" />
                <span className="text-xs text-[#A0A0A5]">Total Points</span>
              </div>
              <div className="text-2xl font-bold text-white">{stats.currentYearPoints}</div>
              <div className="text-xs text-[#A0A0A5] mt-1">
                Accumulated this year
              </div>
            </div>

            <div className="bg-[#1A1A1F] border border-[#2A2A2F] rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <Award className="w-5 h-5 text-[#50C878]" />
                <span className="text-xs text-[#A0A0A5]">Rank</span>
              </div>
              <div className="text-2xl font-bold text-[#50C878]">#{stats.estimatedRank || '?'}</div>
              <div className="text-xs text-[#FFD700] mt-1">
                {stats.estimatedRank > 0 && stats.estimatedRank <= 20 ? 'Top 20 🔥' : 'Keep recruiting!'}
              </div>
            </div>

            <div className="bg-[#1A1A1F] border border-[#2A2A2F] rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <Gift className="w-5 h-5 text-[#9333EA]" />
                <span className="text-xs text-[#A0A0A5]">Claimable</span>
              </div>
              <div className="text-2xl font-bold text-white">
                ${reward.estimatedReward ? parseFloat(formatEther(reward.estimatedReward)).toFixed(2) : '0.00'}
              </div>
              <div className="text-xs text-[#50C878] mt-1">
                {reward.rewardShare} share
              </div>
            </div>

            <div className="bg-[#1A1A1F] border border-[#2A2A2F] rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="w-5 h-5 text-[#3B82F6]" />
                <span className="text-xs text-[#A0A0A5]">Activity</span>
              </div>
              <div className="text-2xl font-bold text-white">{recentActivity.length}</div>
              <div className="text-xs text-[#A0A0A5] mt-1">Recent referrals</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-[#2A2A2F]">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-6 py-3 font-semibold transition-all ${
              activeTab === 'dashboard'
                ? 'text-[#FFD700] border-b-2 border-[#FFD700]'
                : 'text-[#A0A0A5] hover:text-white'
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`px-6 py-3 font-semibold transition-all ${
              activeTab === 'leaderboard'
                ? 'text-[#FFD700] border-b-2 border-[#FFD700]'
                : 'text-[#A0A0A5] hover:text-white'
            }`}
          >
            Leaderboard
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            className={`px-6 py-3 font-semibold transition-all ${
              activeTab === 'activity'
                ? 'text-[#FFD700] border-b-2 border-[#FFD700]'
                : 'text-[#A0A0A5] hover:text-white'
            }`}
          >
            Activity
          </button>
        </div>

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Referral Link */}
            <div className="bg-[#1A1A1F] border border-[#2A2A2F] rounded-xl p-6">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Share2 className="w-5 h-5 text-[#FFD700]" />
                Your Referral Link
              </h2>
              <div className="flex gap-3 mb-4">
                <input
                  type="text"
                  value={referralLink}
                  readOnly
                  className="flex-1 bg-[#2A2A2F] border border-[#3A3A3F] rounded-lg px-4 py-3 text-white font-mono text-sm"
                />
                <button
                  onClick={copyReferralLink}
                  className="px-6 py-3 bg-[#FFD700] text-[#0A0A0B] rounded-lg font-semibold hover:bg-[#FFA500] transition-colors flex items-center gap-2"
                >
                  {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>

              {/* Share Buttons */}
              <div className="flex gap-3">
                {shareOptions.map((option) => (
                  <a
                    key={option.name}
                    href={option.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex-1 ${option.color} hover:opacity-90 transition-opacity rounded-lg px-4 py-3 text-white font-semibold flex items-center justify-center gap-2`}
                  >
                    <option.icon className="w-5 h-5" />
                    {option.name}
                  </a>
                ))}
              </div>
            </div>

            {/* Reward Calculator */}
            <div className="bg-[#1A1A1F] border border-[#2A2A2F] rounded-xl p-6">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Gift className="w-5 h-5 text-[#9333EA]" />
                Estimated Q{stats.currentQuarterNumber} Reward
              </h2>
              
              <div className="bg-[#2A2A2F] rounded-xl p-6 mb-4">
                <div className="text-center mb-4">
                  <div className="text-sm text-[#A0A0A5] mb-2">Your Current Rank</div>
                  <div className="text-5xl font-bold text-[#50C878] mb-2">#{stats.estimatedRank || '?'}</div>
                  <div className="text-sm text-[#FFD700]">
                    {stats.estimatedRank > 0 && stats.estimatedRank <= 20 ? 'Top 20 Qualified ✨' : 'Keep recruiting to qualify!'}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-[#1A1A1F] rounded-lg p-4 text-center">
                    <div className="text-sm text-[#A0A0A5] mb-1">Reward Share</div>
                    <div className="text-2xl font-bold text-[#FFD700]">{reward.rewardShare}</div>
                  </div>
                  <div className="bg-[#1A1A1F] rounded-lg p-4 text-center">
                    <div className="text-sm text-[#A0A0A5] mb-1">Estimated Amount</div>
                    <div className="text-2xl font-bold text-[#50C878]">
                      ${reward.estimatedReward ? parseFloat(formatEther(reward.estimatedReward)).toFixed(2) : '0.00'}
                    </div>
                  </div>
                </div>

                <div className="text-xs text-[#A0A0A5] text-center">
                  * Final amount depends on quarterly pool size ({formattedPool})
                </div>
              </div>

              {/* Claim Button */}
              {reward.quarterEnded && !reward.claimed && reward.estimatedReward > 0n && (
                <button 
                  onClick={handleClaimReward}
                  disabled={isClaimPending}
                  className="w-full px-6 py-4 bg-gradient-to-r from-[#FFD700] to-[#FFA500] text-[#0A0A0B] rounded-lg font-bold text-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Gift className="w-6 h-6" />
                  {isClaimPending ? 'Claiming...' : `Claim ${formatEther(reward.estimatedReward)} VFIDE`}
                </button>
              )}
              
              {isClaimSuccess && (
                <div className="mt-4 p-4 bg-[#50C878]/10 border border-[#50C878] rounded-lg text-center text-[#50C878]">
                  ✓ Reward claimed successfully!
                </div>
              )}
            </div>

            {/* How It Works */}
            <div className="bg-[#1A1A1F] border border-[#2A2A2F] rounded-xl p-6">
              <h2 className="text-xl font-bold text-white mb-4">How It Works</h2>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-[#FFD700] rounded-full flex items-center justify-center text-[#0A0A0B] font-bold">1</div>
                  <div>
                    <div className="font-semibold text-white mb-1">Share Your Link</div>
                    <div className="text-sm text-[#A0A0A5]">Invite users and merchants using your unique referral link</div>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-[#50C878] rounded-full flex items-center justify-center text-[#0A0A0B] font-bold">2</div>
                  <div>
                    <div className="font-semibold text-white mb-1">Earn Points</div>
                    <div className="text-sm text-[#A0A0A5]">1 point per user (after $25 in vault) + 3 points per merchant (after 3 transactions)</div>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-[#9333EA] rounded-full flex items-center justify-center text-white font-bold">3</div>
                  <div>
                    <div className="font-semibold text-white mb-1">Compete for Top 20</div>
                    <div className="text-sm text-[#A0A0A5]">Points accumulate all year, rankings evaluated quarterly</div>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-[#3B82F6] rounded-full flex items-center justify-center text-white font-bold">4</div>
                  <div>
                    <div className="font-semibold text-white mb-1">Claim Rewards</div>
                    <div className="text-sm text-[#A0A0A5]">Top 20 share quarterly pool (15% for #1, 5% for #7, etc.)</div>
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-[#FFD700]/10 border border-[#FFD700]/20 rounded-lg">
                <div className="flex items-start gap-3">
                  <Crown className="w-5 h-5 text-[#FFD700] flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-[#A0A0A5]">
                    <span className="text-[#FFD700] font-semibold">Pro Tip:</span> Maintain 60%+ ProofScore to participate. Score below 60% at claim time = forfeited rewards!
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Leaderboard Tab */}
        {activeTab === 'leaderboard' && (
          <div className="space-y-6">
            <div className="bg-[#1A1A1F] border border-[#2A2A2F] rounded-xl p-6">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-[#FFD700]" />
                Q{stats.currentQuarterNumber} Leaderboard
              </h2>

              <div className="space-y-3">
                {leaderboard.map((entry) => (
                  <div
                    key={entry.rank}
                    className={`p-4 rounded-xl border transition-all ${
                      entry.isCurrentUser
                        ? 'bg-[#FFD700]/10 border-[#FFD700]'
                        : 'bg-[#2A2A2F] border-[#3A3A3F] hover:border-[#4A4A4F]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        {/* Rank Badge */}
                        <div
                          className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold ${
                            entry.rank === 1 ? 'bg-[#FFD700] text-[#0A0A0B]' :
                            entry.rank === 2 ? 'bg-[#C0C0C0] text-[#0A0A0B]' :
                            entry.rank === 3 ? 'bg-[#CD7F32] text-white' :
                            'bg-[#3A3A3F] text-[#A0A0A5]'
                          }`}
                        >
                          {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : `#${entry.rank}`}
                        </div>

                        {/* Address & Stats */}
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono text-white font-semibold">
                              {entry.isCurrentUser ? 'You' : entry.address}
                            </span>
                            {entry.isCurrentUser && (
                              <span className="px-2 py-0.5 bg-[#FFD700] text-[#0A0A0B] text-xs font-bold rounded">YOU</span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-[#A0A0A5]">
                            <span>{entry.points} points</span>
                            <span>•</span>
                            <span>{entry.userReferrals} users</span>
                            <span>•</span>
                            <span>{entry.merchantReferrals} merchants</span>
                          </div>
                        </div>
                      </div>

                      {/* Reward */}
                      <div className="text-right">
                        <div className="text-2xl font-bold text-[#50C878]">
                          ${typeof entry.estimatedReward === 'number' ? entry.estimatedReward.toFixed(0) : entry.estimatedReward}
                        </div>
                        <div className="text-xs text-[#A0A0A5]">Est. reward</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 text-center text-sm text-[#A0A0A5]">
                Showing top 20 headhunters • Updated every hour
              </div>
            </div>
          </div>
        )}

        {/* Activity Tab */}
        {activeTab === 'activity' && (
          <div className="space-y-6">
            <div className="bg-[#1A1A1F] border border-[#2A2A2F] rounded-xl p-6">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-[#3B82F6]" />
                Referral Activity
              </h2>

              <div className="space-y-3">
                {recentActivity.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="w-16 h-16 text-[#3A3A3F] mx-auto mb-4" />
                    <div className="text-lg font-semibold text-[#A0A0A5] mb-2">No referrals yet</div>
                    <div className="text-sm text-[#6A6A6F]">Share your link to start earning points!</div>
                  </div>
                ) : (
                  recentActivity.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-center justify-between p-4 bg-[#2A2A2F] border border-[#3A3A3F] rounded-xl hover:border-[#4A4A4F] transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        {/* Type Badge */}
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          activity.type === 'merchant' ? 'bg-[#9333EA]/20' : 'bg-[#3B82F6]/20'
                        }`}>
                          {activity.type === 'merchant' ? '🏪' : '👤'}
                        </div>

                        {/* Info */}
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono text-white text-sm">{activity.address}</span>
                            <span className={`px-2 py-0.5 text-xs font-semibold rounded ${
                              activity.status === 'credited'
                                ? 'bg-[#50C878]/20 text-[#50C878]'
                                : 'bg-[#FFA500]/20 text-[#FFA500]'
                            }`}>
                              {activity.status === 'credited' ? '✓ Credited' : '⏳ Pending'}
                            </span>
                          </div>
                          <div className="text-xs text-[#A0A0A5]">
                            {new Date(activity.timestamp).toLocaleDateString()} • {activity.type === 'merchant' ? 'Merchant' : 'User'} referral
                          </div>
                        </div>
                      </div>

                      {/* Points */}
                      <div className="text-right">
                        <div className="text-lg font-bold text-[#FFD700]">+{activity.points}</div>
                        <div className="text-xs text-[#A0A0A5]">points</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

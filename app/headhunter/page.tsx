'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { 
  Trophy, Users, TrendingUp, Copy, Check, 
  Award, Target, Crown,
  Share2, MessageCircle, Mail, X
} from 'lucide-react';
import { 
  useHeadhunterStats, 
  useReferralLink,
  useLeaderboard,
  useReferralActivity
} from '@/hooks/useHeadhunterHooks';

/**
 * HEADHUNTER COMPETITION PAGE
 * 
 * Features:
 * - Referral dashboard (points, rank, community recognition)
 * - Top 20 leaderboard
 * - Referral link generator
 * - Progress tracking
 * 
 * Note: Headhunter competition awards community recognition and governance
 * badges — not VFIDE tokens. This keeps the program Howey Test compliant.
 */

export default function HeadhunterPage() {
  const { address: _address, isConnected } = useAccount();
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'leaderboard' | 'activity'>('dashboard');

  // Real contract hooks
  const stats = useHeadhunterStats();
  const { referralLink, qrCodeUrl: _qrCodeUrl } = useReferralLink();
  const { leaderboard, isLoading: _leaderboardLoading } = useLeaderboard(stats.currentYearNumber, stats.currentQuarterNumber);
  const { activity: recentActivity, isLoading: _activityLoading } = useReferralActivity();

  // Calculate days until quarter end
  const quarterEndsAtMs = Number(stats.quarterEndsAt) * 1000;
  const daysUntilQuarterEnd = Math.max(0, Math.ceil((quarterEndsAtMs - Date.now()) / (1000 * 60 * 60 * 24)));

  const copyReferralLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareOptions = [
    { name: 'Twitter', icon: X, color: 'bg-sky-500', link: `https://twitter.com/intent/tweet?text=Join VFIDE with my referral link!&url=${encodeURIComponent(referralLink)}` },
    { name: 'Telegram', icon: MessageCircle, color: 'bg-sky-600', link: `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=Join VFIDE!` },
    { name: 'Email', icon: Mail, color: 'bg-red-500', link: `mailto:?subject=Join VFIDE&body=Sign up with my link: ${encodeURIComponent(referralLink)}` },
  ];

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <Trophy className="w-24 h-24 text-amber-400 mx-auto mb-6" />
          <h1 className="text-3xl font-bold text-white mb-4">Headhunter Competition</h1>
          <p className="text-zinc-400 mb-6">Connect your wallet to participate</p>
          <button className="px-8 py-3 bg-gradient-to-r from-amber-400 to-orange-500 text-zinc-950 rounded-lg font-semibold hover:opacity-90 transition-opacity">
            Connect Wallet
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-400/10 to-orange-500/10 border-b border-amber-400/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Trophy className="w-10 h-10 text-amber-400" />
                <h1 className="text-4xl font-bold bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
                  Headhunter Competition
                </h1>
              </div>
              <p className="text-zinc-400 text-lg">
                Recruit users and merchants to earn community recognition and governance badges
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-zinc-400 mb-1">Current Quarter</div>
              <div className="text-3xl font-bold text-amber-400">Q{stats.currentQuarterNumber}</div>
              <div className="text-sm text-emerald-500">{daysUntilQuarterEnd} days left</div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <Target className="w-5 h-5 text-amber-400" />
                <span className="text-xs text-zinc-400">Total Points</span>
              </div>
              <div className="text-2xl font-bold text-white">{stats.currentYearPoints}</div>
              <div className="text-xs text-zinc-400 mt-1">
                Accumulated this year
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <Award className="w-5 h-5 text-emerald-500" />
                <span className="text-xs text-zinc-400">Rank</span>
              </div>
              <div className="text-2xl font-bold text-emerald-500">#{stats.estimatedRank || '?'}</div>
              <div className="text-xs text-amber-400 mt-1">
                {stats.estimatedRank > 0 && stats.estimatedRank <= 20 ? 'Top 20 🔥' : 'Keep recruiting!'}
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <Award className="w-5 h-5 text-purple-600" />
                <span className="text-xs text-zinc-400">Recognition</span>
              </div>
              <div className="text-2xl font-bold text-white">
                {stats.estimatedRank > 0 && stats.estimatedRank <= 20 ? '🏆 Top 20' : '—'}
              </div>
              <div className="text-xs text-emerald-500 mt-1">
                Community badge at quarter end
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="w-5 h-5 text-blue-500" />
                <span className="text-xs text-zinc-400">Activity</span>
              </div>
              <div className="text-2xl font-bold text-white">{recentActivity.length}</div>
              <div className="text-xs text-zinc-400 mt-1">Recent referrals</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-zinc-800">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-6 py-3 font-semibold transition-all ${
              activeTab === 'dashboard'
                ? 'text-amber-400 border-b-2 border-amber-400'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`px-6 py-3 font-semibold transition-all ${
              activeTab === 'leaderboard'
                ? 'text-amber-400 border-b-2 border-amber-400'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Leaderboard
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            className={`px-6 py-3 font-semibold transition-all ${
              activeTab === 'activity'
                ? 'text-amber-400 border-b-2 border-amber-400'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Activity
          </button>
        </div>

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Referral Link */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Share2 className="w-5 h-5 text-amber-400" />
                Your Referral Link
              </h2>
              <div className="flex gap-3 mb-4">
                <input
                  type="text"
                  value={referralLink}
                  readOnly
                  className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white font-mono text-sm"
                />
                <button
                  onClick={copyReferralLink}
                  className="px-6 py-3 bg-amber-400 text-zinc-950 rounded-lg font-semibold hover:bg-orange-500 transition-colors flex items-center gap-2"
                >
                  {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>

              {/* Share Buttons */}
              <div className="flex flex-wrap gap-2 sm:gap-3">
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

            {/* Community Recognition */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Award className="w-5 h-5 text-purple-600" />
                Q{stats.currentQuarterNumber} Community Recognition
              </h2>
              
              <div className="bg-zinc-800 rounded-xl p-6 mb-4">
                <div className="text-center mb-4">
                  <div className="text-sm text-zinc-400 mb-2">Your Current Rank</div>
                  <div className="text-3xl sm:text-4xl md:text-5xl font-bold text-emerald-500 mb-2">#{stats.estimatedRank || '?'}</div>
                  <div className="text-sm text-amber-400">
                    {stats.estimatedRank > 0 && stats.estimatedRank <= 20 ? 'Top 20 Qualified ✨' : 'Keep recruiting to qualify!'}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-zinc-900 rounded-lg p-4 text-center">
                    <div className="text-sm text-zinc-400 mb-1">Points This Year</div>
                    <div className="text-2xl font-bold text-amber-400">{stats.currentYearPoints}</div>
                  </div>
                  <div className="bg-zinc-900 rounded-lg p-4 text-center">
                    <div className="text-sm text-zinc-400 mb-1">Quarterly Badge</div>
                    <div className="text-2xl font-bold text-emerald-500">
                      {stats.estimatedRank > 0 && stats.estimatedRank <= 20 ? '🏆 Earned' : '—'}
                    </div>
                  </div>
                </div>

                <div className="text-xs text-zinc-400 text-center mb-3">
                  Top 20 recruiters each quarter earn the exclusive Headhunter governance badge
                </div>

                {/* What the badge does */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-zinc-900 border border-violet-500/30 rounded-lg p-3 text-center">
                    <div className="text-xl mb-1">🗳️</div>
                    <div className="text-xs font-bold text-violet-400">+25% Voting Weight</div>
                    <div className="text-xs text-zinc-500 mt-0.5">Governance votes count more</div>
                  </div>
                  <div className="bg-zinc-900 border border-cyan-500/30 rounded-lg p-3 text-center">
                    <div className="text-xl mb-1">📋</div>
                    <div className="text-xs font-bold text-cyan-400">Proposal Rights</div>
                    <div className="text-xs text-zinc-500 mt-0.5">Submit DAO proposals directly</div>
                  </div>
                  <div className="bg-zinc-900 border border-amber-400/30 rounded-lg p-3 text-center">
                    <div className="text-xl mb-1">👑</div>
                    <div className="text-xs font-bold text-amber-400">Council Eligibility</div>
                    <div className="text-xs text-zinc-500 mt-0.5">Can be elected to Community Council</div>
                  </div>
                </div>
              </div>
            </div>

            {/* How It Works */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
              <h2 className="text-xl font-bold text-white mb-4">How It Works</h2>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="shrink-0 w-8 h-8 bg-amber-400 rounded-full flex items-center justify-center text-zinc-950 font-bold">1</div>
                  <div>
                    <div className="font-semibold text-white mb-1">Share Your Link</div>
                    <div className="text-sm text-zinc-400">Invite users and merchants using your unique referral link</div>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="shrink-0 w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center text-zinc-950 font-bold">2</div>
                  <div>
                    <div className="font-semibold text-white mb-1">Earn Points</div>
                    <div className="text-sm text-zinc-400">1 point per user (after $25 in vault) + 3 points per merchant (after 3 transactions)</div>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="shrink-0 w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold">3</div>
                  <div>
                    <div className="font-semibold text-white mb-1">Compete for Top 20</div>
                    <div className="text-sm text-zinc-400">Points accumulate all year, rankings evaluated quarterly</div>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="shrink-0 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">4</div>
                  <div>
                    <div className="font-semibold text-white mb-1">Earn Recognition</div>
                    <div className="text-sm text-zinc-400">Top 20 earn the exclusive Headhunter governance badge and community recognition</div>
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-amber-400/10 border border-amber-400/20 rounded-lg">
                <div className="flex items-start gap-3">
                  <Crown className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div className="text-sm text-zinc-400">
                    <span className="text-amber-400 font-semibold">Pro Tip:</span> Maintain 60%+ ProofScore to participate. Dropping below 60% disqualifies you from the quarterly recognition!
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Leaderboard Tab */}
        {activeTab === 'leaderboard' && (
          <div className="space-y-6">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-400" />
                Q{stats.currentQuarterNumber} Leaderboard
              </h2>

              <div className="space-y-3">
                {leaderboard.map((entry) => (
                  <div
                    key={entry.rank}
                    className={`p-3 sm:p-4 rounded-xl border transition-all ${
                      entry.isCurrentUser
                        ? 'bg-amber-400/10 border-amber-400'
                        : 'bg-zinc-800 border-zinc-700 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 sm:gap-4 flex-1 min-w-0">
                        {/* Rank Badge */}
                        <div
                          className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-lg sm:text-xl font-bold shrink-0 ${
                            entry.rank === 1 ? 'bg-amber-400 text-zinc-950' :
                            entry.rank === 2 ? 'bg-zinc-400 text-zinc-950' :
                            entry.rank === 3 ? 'bg-amber-600 text-white' :
                            'bg-zinc-700 text-zinc-400'
                          }`}
                        >
                          {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : `#${entry.rank}`}
                        </div>

                        {/* Address & Stats */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="font-mono text-white font-semibold text-sm sm:text-base truncate">
                              {entry.isCurrentUser ? 'You' : entry.address}
                            </span>
                            {entry.isCurrentUser && (
                              <span className="px-2 py-0.5 bg-amber-400 text-zinc-950 text-xs font-bold rounded shrink-0">YOU</span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-zinc-400">
                            <span className="whitespace-nowrap">{entry.points} pts</span>
                            <span className="hidden sm:inline">•</span>
                            <span className="whitespace-nowrap">{entry.userReferrals} users</span>
                            <span className="hidden sm:inline">•</span>
                            <span className="whitespace-nowrap">{entry.merchantReferrals} merchants</span>
                          </div>
                        </div>
                      </div>

                      {/* Recognition */}
                      <div className="text-right shrink-0">
                        <div className="text-lg sm:text-2xl font-bold text-emerald-500">
                          {entry.rank <= 20 ? '🏆' : '—'}
                        </div>
                        <div className="text-xs text-zinc-400 whitespace-nowrap">Badge eligible</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 text-center text-sm text-zinc-400">
                Showing top 20 headhunters • Updated every hour
              </div>
            </div>
          </div>
        )}

        {/* Activity Tab */}
        {activeTab === 'activity' && (
          <div className="space-y-6">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-500" />
                Referral Activity
              </h2>

              <div className="space-y-3">
                {recentActivity.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
                    <div className="text-lg font-semibold text-zinc-400 mb-2">No referrals yet</div>
                    <div className="text-sm text-zinc-500">Share your link to start earning points!</div>
                  </div>
                ) : (
                  recentActivity.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-center justify-between p-4 bg-zinc-800 border border-zinc-700 rounded-xl hover:border-zinc-700 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        {/* Type Badge */}
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          activity.type === 'merchant' ? 'bg-purple-600/20' : 'bg-blue-500/20'
                        }`}>
                          {activity.type === 'merchant' ? '🏪' : '👤'}
                        </div>

                        {/* Info */}
                        <div>
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className="font-mono text-white text-xs sm:text-sm truncate max-w-25 sm:max-w-45">{activity.address}</span>
                            <span className={`px-2 py-0.5 text-xs font-semibold rounded ${
                              activity.status === 'credited'
                                ? 'bg-emerald-500/20 text-emerald-500'
                                : 'bg-orange-500/20 text-orange-500'
                            }`}>
                              {activity.status === 'credited' ? '✓ Credited' : '⏳ Pending'}
                            </span>
                          </div>
                          <div className="text-xs text-zinc-400">
                            {new Date(activity.timestamp).toLocaleDateString()} • {activity.type === 'merchant' ? 'Merchant' : 'User'} referral
                          </div>
                        </div>
                      </div>

                      {/* Points */}
                      <div className="text-right">
                        <div className="text-lg font-bold text-amber-400">+{activity.points}</div>
                        <div className="text-xs text-zinc-400">points</div>
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

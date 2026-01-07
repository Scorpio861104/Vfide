/**
 * ProofScore Dashboard Component
 * Score timeline visualization, tier conditions, gamification badges, and achievements
 * 
 * Features:
 * - Real-time ProofScore tracking and visualization
 * - Score history timeline with trend analysis
 * - Tier unlock conditions and progress
 * - Gamification badges and achievements
 * - Score breakdown by category
 * - Achievement celebrations
 * - Mobile-responsive design
 * - Dark mode support
 */

'use client';

import React, { useState } from 'react';
import { MobileButton } from '@/components/mobile/MobileForm';
import { responsiveGrids, ResponsiveContainer } from '@/lib/mobile';

// ==================== TYPES ====================

interface ScoreTier {
  name: string;
  minScore: number;
  maxScore: number;
  description: string;
  benefits: string[];
  badge: string;
  color: string;
  nextTierProgress: number;
}

interface ScoreRecord {
  date: string;
  score: number;
  change: number;
  activities: string[];
}

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  earnedAt: number;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  requirements: string;
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  progress: number;
  target: number;
  reward: string;
  icon: string;
  completed: boolean;
}

interface ScoreBreakdown {
  category: string;
  score: number;
  percentage: number;
  activities: number;
  trend: 'up' | 'down' | 'stable';
}

// ==================== MOCK DATA ====================

function getCurrentScore(): number {
  return 7850;
}

function getCurrentTier(): ScoreTier {
  const score = getCurrentScore();
  const tiers: ScoreTier[] = [
    {
      name: 'Newcomer',
      minScore: 0,
      maxScore: 999,
      description: 'Just starting your ProofScore journey',
      benefits: ['Basic account features', 'Transaction history'],
      badge: '🌱',
      color: 'from-gray-400 to-gray-600',
      nextTierProgress: 0,
    },
    {
      name: 'Trusted Member',
      minScore: 1000,
      maxScore: 2999,
      description: 'Building a solid reputation',
      benefits: ['Enhanced features', 'Higher transaction limits', 'Community access'],
      badge: '⭐',
      color: 'from-blue-400 to-blue-600',
      nextTierProgress: 50,
    },
    {
      name: 'Verified User',
      minScore: 3000,
      maxScore: 4999,
      description: 'Verified and trusted member',
      benefits: ['Priority support', 'Advanced analytics', 'API access'],
      badge: '✅',
      color: 'from-green-400 to-green-600',
      nextTierProgress: 75,
    },
    {
      name: 'Elite Member',
      minScore: 5000,
      maxScore: 7499,
      description: 'Top-tier community member',
      benefits: ['Exclusive features', 'Governance voting', 'Custom integrations'],
      badge: '👑',
      color: 'from-purple-400 to-purple-600',
      nextTierProgress: 90,
    },
    {
      name: 'Legend',
      minScore: 7500,
      maxScore: 10000,
      description: 'The most trusted and active member',
      benefits: [
        'All features unlocked',
        'Custom support',
        'Revenue sharing',
        'Leadership position',
      ],
      badge: '🏆',
      color: 'from-yellow-400 to-orange-600',
      nextTierProgress: 78,
    },
  ];

  return tiers.find((t) => score >= t.minScore && score <= t.maxScore) || tiers[0];
}

function generateScoreHistory(): ScoreRecord[] {
  const now = Date.now();
  const records: ScoreRecord[] = [];
  let currentScore = 7850;

  for (let i = 29; i >= 0; i--) {
    const date = new Date(now - i * 24 * 60 * 60 * 1000);
    const change = Math.floor(Math.random() * 100) - 30;
    currentScore = Math.max(0, currentScore + change);

    records.push({
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      score: currentScore,
      change,
      activities: [
        'Verified transaction',
        'Dispute resolution',
        'Community participation',
      ].filter(() => Math.random() > 0.5),
    });
  }

  return records;
}

function generateBadges(): Badge[] {
  return [
    {
      id: 'first-transaction',
      name: 'First Step',
      description: 'Completed your first transaction',
      icon: '🚀',
      earnedAt: Date.now() - 60 * 24 * 60 * 60 * 1000,
      rarity: 'common',
      requirements: 'Complete 1 transaction',
    },
    {
      id: 'verified-account',
      name: 'Verified Badge',
      description: 'Account fully verified',
      icon: '✅',
      earnedAt: Date.now() - 45 * 24 * 60 * 60 * 1000,
      rarity: 'common',
      requirements: 'Verify account',
    },
    {
      id: 'trader',
      name: 'Active Trader',
      description: 'Completed 10 transactions',
      icon: '📈',
      earnedAt: Date.now() - 30 * 24 * 60 * 60 * 1000,
      rarity: 'uncommon',
      requirements: 'Complete 10 transactions',
    },
    {
      id: 'power-user',
      name: 'Power User',
      description: 'Score over 5000',
      icon: '⚡',
      earnedAt: Date.now() - 14 * 24 * 60 * 60 * 1000,
      rarity: 'rare',
      requirements: 'Achieve 5000+ score',
    },
    {
      id: 'community-helper',
      name: 'Community Helper',
      description: 'Helped 5 community members',
      icon: '🤝',
      earnedAt: Date.now() - 7 * 24 * 60 * 60 * 1000,
      rarity: 'rare',
      requirements: 'Help 5 members',
    },
    {
      id: 'legend',
      name: 'Legend Status',
      description: 'Reached highest tier',
      icon: '🏆',
      earnedAt: Date.now() - 2 * 24 * 60 * 60 * 1000,
      rarity: 'legendary',
      requirements: 'Reach Legend tier',
    },
  ];
}

function generateAchievements(): Achievement[] {
  return [
    {
      id: 'achieve-1',
      title: 'Transaction Master',
      description: 'Complete 50 transactions',
      progress: 38,
      target: 50,
      reward: '+500 ProofScore',
      icon: '💰',
      completed: false,
    },
    {
      id: 'achieve-2',
      title: 'Social Butterfly',
      description: 'Add 10 trusted contacts',
      progress: 7,
      target: 10,
      reward: '+300 ProofScore',
      icon: '🦋',
      completed: false,
    },
    {
      id: 'achieve-3',
      title: 'Dispute Resolver',
      description: 'Resolve disputes successfully',
      progress: 5,
      target: 5,
      reward: '+1000 ProofScore',
      icon: '⚖️',
      completed: true,
    },
    {
      id: 'achieve-4',
      title: 'Consistency Champion',
      description: 'Active for 30 consecutive days',
      progress: 28,
      target: 30,
      reward: '+750 ProofScore',
      icon: '🔥',
      completed: false,
    },
    {
      id: 'achieve-5',
      title: 'Governance Guardian',
      description: 'Participate in 5 governance votes',
      progress: 3,
      target: 5,
      reward: '+400 ProofScore',
      icon: '🗳️',
      completed: false,
    },
  ];
}

function generateScoreBreakdown(): ScoreBreakdown[] {
  return [
    {
      category: 'Transaction History',
      score: 2500,
      percentage: 32,
      activities: 45,
      trend: 'up',
    },
    {
      category: 'Account Verification',
      score: 1800,
      percentage: 23,
      activities: 8,
      trend: 'stable',
    },
    {
      category: 'Community Engagement',
      score: 1600,
      percentage: 20,
      activities: 12,
      trend: 'up',
    },
    {
      category: 'Security & Safety',
      score: 1200,
      percentage: 15,
      activities: 15,
      trend: 'stable',
    },
    {
      category: 'Governance Participation',
      score: 750,
      percentage: 10,
      activities: 5,
      trend: 'down',
    },
  ];
}

// ==================== COMPONENTS ====================

interface StatBoxProps {
  label: string;
  value: string | number;
  icon: string;
  color: string;
}

function StatBox({ label, value, icon, color }: StatBoxProps) {
  return (
    <div
      className={`rounded-lg p-4 md:p-6 bg-gradient-to-br ${color} text-white shadow-lg`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs md:text-sm font-medium opacity-90 mb-1 md:mb-2">
            {label}
          </p>
          <p className="text-2xl md:text-3xl font-bold">{value}</p>
        </div>
        <span className="text-3xl md:text-4xl opacity-80">{icon}</span>
      </div>
    </div>
  );
}

interface TierProgressProps {
  tier: ScoreTier;
  currentScore: number;
}

function TierProgress({ tier, currentScore }: TierProgressProps) {
  const tierRange = tier.maxScore - tier.minScore;
  const scoreInTier = currentScore - tier.minScore;
  const progress = Math.min((scoreInTier / tierRange) * 100, 100);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 md:p-6 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-4xl md:text-5xl">{tier.badge}</span>
          <div>
            <h3 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white">
              {tier.name}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">{tier.description}</p>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Score Progress
          </span>
          <span className="text-sm font-bold text-gray-900 dark:text-white">
            {currentScore} / {tier.maxScore}
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
          <div
            className={`bg-gradient-to-r ${tier.color} h-3 rounded-full transition-all`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Benefits */}
      <div>
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
          Tier Benefits:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {tier.benefits.map((benefit, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              <span className="text-sm text-gray-600 dark:text-gray-400">{benefit}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

interface BadgeCardProps {
  badge: Badge;
}

function BadgeCard({ badge }: BadgeCardProps) {
  const rarityColors = {
    common: 'border-gray-400 bg-gray-50 dark:bg-gray-700',
    uncommon: 'border-green-400 bg-green-50 dark:bg-green-900',
    rare: 'border-blue-400 bg-blue-50 dark:bg-blue-900',
    epic: 'border-purple-400 bg-purple-50 dark:bg-purple-900',
    legendary: 'border-yellow-400 bg-yellow-50 dark:bg-yellow-900',
  };

  return (
    <div className={`rounded-lg p-4 border-2 ${rarityColors[badge.rarity]} text-center`}>
      <div className="text-4xl mb-2">{badge.icon}</div>
      <h4 className="font-bold text-gray-900 dark:text-white text-sm md:text-base mb-1">
        {badge.name}
      </h4>
      <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">{badge.description}</p>
      <p className="text-xs font-medium text-gray-700 dark:text-gray-300 capitalize">
        {badge.rarity}
      </p>
    </div>
  );
}

interface AchievementItemProps {
  achievement: Achievement;
}

function AchievementItem({ achievement }: AchievementItemProps) {
  const progress = (achievement.progress / achievement.target) * 100;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 md:p-5 border border-gray-200 dark:border-gray-700">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <span className="text-3xl md:text-4xl flex-shrink-0">{achievement.icon}</span>
          <div className="min-w-0 flex-1">
            <h4 className="text-base md:text-lg font-bold text-gray-900 dark:text-white">
              {achievement.title}
            </h4>
            <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 line-clamp-1">
              {achievement.description}
            </p>
          </div>
        </div>
        {achievement.completed && (
          <span className="text-2xl ml-2 flex-shrink-0">✅</span>
        )}
      </div>

      {!achievement.completed && (
        <div className="mb-3">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-gray-600 dark:text-gray-400">
              {achievement.progress} / {achievement.target}
            </span>
            <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
              {Math.round(progress)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      <p className="text-xs md:text-sm font-medium text-green-600 dark:text-green-400">
        Reward: {achievement.reward}
      </p>
    </div>
  );
}

// ==================== MAIN COMPONENT ====================

export default function ProofScoreDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'timeline' | 'badges' | 'achievements'>(
    'overview'
  );
  const [showCelebration, setShowCelebration] = useState(false);
  
  const currentScore = getCurrentScore();
  const currentTier = getCurrentTier();
  const scoreHistory = generateScoreHistory();
  const badges = generateBadges();
  const achievements = generateAchievements();
  const breakdown = generateScoreBreakdown();

  // ==================== TAB CONTENT ====================

  const renderOverviewTab = () => (
    <div className="space-y-8">
      {/* Current Status */}
      <div>
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-6">
          Your ProofScore Status
        </h2>
        <TierProgress tier={currentTier} currentScore={currentScore} />
      </div>

      {/* Quick Stats */}
      <div>
        <h2 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white mb-4">
          Quick Stats
        </h2>
        <div className={`grid ${responsiveGrids.auto} gap-4`}>
          <StatBox
            label="Current Score"
            value={currentScore}
            icon="📊"
            color="from-blue-500 to-blue-700"
          />
          <StatBox
            label="This Month"
            value="+185"
            icon="📈"
            color="from-green-500 to-green-700"
          />
          <StatBox
            label="Rank"
            value="#2,847"
            icon="🏅"
            color="from-purple-500 to-purple-700"
          />
          <StatBox
            label="Streak"
            value="28 days"
            icon="🔥"
            color="from-orange-500 to-orange-700"
          />
        </div>
      </div>

      {/* Score Breakdown */}
      <div>
        <h2 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white mb-4">
          Score Breakdown
        </h2>
        <div className="space-y-3">
          {breakdown.map((item, idx) => (
            <div key={idx} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white text-sm md:text-base">
                    {item.category}
                  </h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {item.activities} activities
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900 dark:text-white text-sm md:text-base">
                    {item.score.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">{item.percentage}%</p>
                </div>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    item.trend === 'up'
                      ? 'bg-green-500'
                      : item.trend === 'down'
                        ? 'bg-red-500'
                        : 'bg-gray-500'
                  }`}
                  style={{ width: `${item.percentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderTimelineTab = () => (
    <div className="space-y-6">
      <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
        30-Day Score History
      </h2>

      <div className="space-y-4">
        {scoreHistory.map((record, idx) => (
          <div
            key={idx}
            className="bg-white dark:bg-gray-800 rounded-lg p-4 md:p-5 border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="font-semibold text-gray-900 dark:text-white text-sm md:text-base">
                  {record.date}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {record.activities.join(' • ')}
                </p>
              </div>
              <div className="text-right">
                <p className="font-bold text-gray-900 dark:text-white text-base md:text-lg">
                  {record.score}
                </p>
                <p
                  className={`text-xs font-semibold ${
                    record.change > 0
                      ? 'text-green-600 dark:text-green-400'
                      : record.change < 0
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-gray-600 dark:text-gray-400'
                  }`}
                >
                  {record.change > 0 ? '+' : ''}{record.change}
                </p>
              </div>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
              <div
                className={`h-1.5 rounded-full transition-all ${
                  record.change > 0
                    ? 'bg-green-500'
                    : record.change < 0
                      ? 'bg-red-500'
                      : 'bg-gray-500'
                }`}
                style={{ width: `${Math.min((record.score / 10000) * 100, 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderBadgesTab = () => (
    <div className="space-y-6">
      <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
        Your Badges ({badges.length})
      </h2>

      <div className={`grid ${responsiveGrids.balanced} gap-4`}>
        {badges.map((badge) => (
          <BadgeCard key={badge.id} badge={badge} />
        ))}
      </div>
    </div>
  );

  const renderAchievementsTab = () => (
    <div className="space-y-6">
      <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
        Achievements ({achievements.filter((a) => a.completed).length} / {achievements.length})
      </h2>

      <div className="space-y-4">
        {achievements.map((achievement) => (
          <AchievementItem key={achievement.id} achievement={achievement} />
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-6 md:py-8">
      <ResponsiveContainer>
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-2">
            <span className="text-5xl md:text-6xl">{currentTier.badge}</span>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
                ProofScore Dashboard
              </h1>
              <p className="text-base md:text-lg text-gray-600 dark:text-gray-400">
                Track your reputation and unlock benefits
              </p>
            </div>
          </div>
        </div>

        {/* Main Score Display */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg p-6 md:p-8 text-white shadow-lg mb-8">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm md:text-base font-semibold opacity-90 mb-2">
                Your Current ProofScore
              </p>
              <p className="text-5xl md:text-6xl font-bold mb-2">{currentScore}</p>
              <div className="flex flex-wrap gap-3">
                <div>
                  <p className="text-xs opacity-75">Tier</p>
                  <p className="font-bold">{currentTier.name}</p>
                </div>
                <div>
                  <p className="text-xs opacity-75">This Month</p>
                  <p className="font-bold">+185</p>
                </div>
                <div>
                  <p className="text-xs opacity-75">Percentile</p>
                  <p className="font-bold">Top 0.3%</p>
                </div>
              </div>
            </div>
            <div className="text-6xl md:text-7xl opacity-20">⭐</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="grid grid-cols-2 md:grid-cols-4 border-b border-gray-200 dark:border-gray-700">
            {(['overview', 'timeline', 'badges', 'achievements'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 md:px-6 py-3 md:py-4 font-medium text-center transition-colors text-sm md:text-base ${
                  activeTab === tab
                    ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
                }`}
              >
                {tab === 'overview' && 'Overview'}
                {tab === 'timeline' && 'Timeline'}
                {tab === 'badges' && 'Badges'}
                {tab === 'achievements' && 'Achievements'}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="p-4 md:p-8">
            {activeTab === 'overview' && renderOverviewTab()}
            {activeTab === 'timeline' && renderTimelineTab()}
            {activeTab === 'badges' && renderBadgesTab()}
            {activeTab === 'achievements' && renderAchievementsTab()}
          </div>
        </div>

        {/* Celebration Modal */}
        {showCelebration && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 md:p-8 text-center max-w-md">
              <div className="text-6xl md:text-7xl mb-4">🎉</div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Achievement Unlocked!
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                You&apos;ve reached a new tier and unlocked amazing benefits!
              </p>
              <MobileButton
                onClick={() => setShowCelebration(false)}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-4 rounded-lg transition-colors"
              >
                Awesome! 🚀
              </MobileButton>
            </div>
          </div>
        )}
      </ResponsiveContainer>
    </div>
  );
}

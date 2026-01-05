'use client';

import { GlobalNav } from '@/components/layout/GlobalNav';
import { Footer } from '@/components/layout/Footer';
import { PageWrapper } from '@/components/ui/PageLayout';
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  Users,
  Heart,
  MessageCircle,
  Share2,
  Activity,
  Target,
  Zap,
  Calendar,
  LineChart,
  PieChart,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';

// ==================== TYPES ====================

interface SocialMetric {
  label: string;
  value: number;
  change: number;
  changePercent: number;
  icon: React.ReactNode;
  color: string;
}

interface EngagementData {
  date: string;
  likes: number;
  comments: number;
  shares: number;
  followers: number;
}

interface InfluenceScore {
  score: number;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
  ranking: number;
  totalUsers: number;
  breakdown: {
    engagement: number;
    reach: number;
    authority: number;
    growth: number;
  };
}

interface CommunityStats {
  totalMembers: number;
  activeMembers: number;
  newMembersThisWeek: number;
  averageEngagementRate: number;
  topContributors: number;
  communityHealth: 'excellent' | 'good' | 'average' | 'needs_improvement';
}

// ==================== MOCK DATA ====================

const mockSocialMetrics: SocialMetric[] = [
  {
    label: 'Total Followers',
    value: 2847,
    change: 312,
    changePercent: 12.3,
    icon: <Users className="w-6 h-6" />,
    color: 'from-[#00F0FF] to-[#A78BFA]',
  },
  {
    label: 'Total Likes',
    value: 12450,
    change: 2134,
    changePercent: 20.6,
    icon: <Heart className="w-6 h-6" />,
    color: 'from-[#FF6B9D] to-[#FF006E]',
  },
  {
    label: 'Comments & Replies',
    value: 3421,
    change: 456,
    changePercent: 15.4,
    icon: <MessageCircle className="w-6 h-6" />,
    color: 'from-[#A78BFA] to-[#7C3AED]',
  },
  {
    label: 'Total Shares',
    value: 876,
    change: 123,
    changePercent: 16.3,
    icon: <Share2 className="w-6 h-6" />,
    color: 'from-[#50C878] to-[#00D084]',
  },
];

const mockEngagementData: EngagementData[] = [
  { date: 'Mon', likes: 245, comments: 42, shares: 15, followers: 2400 },
  { date: 'Tue', likes: 312, comments: 58, shares: 22, followers: 2520 },
  { date: 'Wed', likes: 289, comments: 51, shares: 19, followers: 2654 },
  { date: 'Thu', likes: 456, comments: 78, shares: 34, followers: 2789 },
  { date: 'Fri', likes: 523, comments: 92, shares: 41, followers: 2847 },
  { date: 'Sat', likes: 418, comments: 71, shares: 28, followers: 2912 },
  { date: 'Sun', likes: 387, comments: 65, shares: 25, followers: 2961 },
];

const mockInfluenceScore: InfluenceScore = {
  score: 8420,
  tier: 'gold',
  ranking: 342,
  totalUsers: 145000,
  breakdown: {
    engagement: 92,
    reach: 87,
    authority: 85,
    growth: 78,
  },
};

const mockCommunityStats: CommunityStats = {
  totalMembers: 145000,
  activeMembers: 89234,
  newMembersThisWeek: 3421,
  averageEngagementRate: 34.7,
  topContributors: 245,
  communityHealth: 'excellent',
};

// ==================== COMPONENTS ====================

export default function SocialAnalyticsPage() {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('7d');
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'bronze':
        return 'from-amber-700 to-amber-900';
      case 'silver':
        return 'from-slate-400 to-slate-600';
      case 'gold':
        return 'from-yellow-400 to-yellow-600';
      case 'platinum':
        return 'from-blue-300 to-blue-500';
      case 'diamond':
        return 'from-cyan-300 to-cyan-500';
      default:
        return 'from-gray-400 to-gray-600';
    }
  };

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'excellent':
        return 'bg-[#50C878]/20 text-[#50C878] border-[#50C878]/50';
      case 'good':
        return 'bg-[#00F0FF]/20 text-[#00F0FF] border-[#00F0FF]/50';
      case 'average':
        return 'bg-[#FFD700]/20 text-[#FFD700] border-[#FFD700]/50';
      default:
        return 'bg-[#FF6B9D]/20 text-[#FF6B9D] border-[#FF6B9D]/50';
    }
  };

  return (
    <>
      <GlobalNav />

      <PageWrapper variant="cosmic" showOrbs showGrid>
        <main className="pt-20 pb-20">
          {/* Header */}
          <motion.section
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12"
          >
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-8">
              <div>
                <h1 className="text-4xl md:text-5xl font-bold text-[#F5F3E8] mb-3">Social Analytics</h1>
                <p className="text-[#A0A0A5] text-lg">
                  Analyze your influence, engagement, and community growth in real-time
                </p>
              </div>

              {/* Time Range Selector */}
              <div className="flex gap-2 bg-[#1A1A2E] border border-[#3A3A4F] rounded-lg p-2">
                {['7d', '30d', '90d', '1y'].map((range) => (
                  <button
                    key={range}
                    onClick={() => setTimeRange(range as any)}
                    className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                      timeRange === range
                        ? 'bg-[#00F0FF] text-[#0A0A0F]'
                        : 'text-[#A0A0A5] hover:text-[#F5F3E8]'
                    }`}
                  >
                    {range === '7d' ? 'Week' : range === '30d' ? 'Month' : range === '90d' ? '3 Months' : 'Year'}
                  </button>
                ))}
              </div>
            </div>
          </motion.section>

          {/* Key Metrics Grid */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-12"
          >
            <h2 className="text-2xl font-bold text-[#F5F3E8] mb-6">Key Metrics</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {mockSocialMetrics.map((metric, idx) => (
                <motion.div
                  key={metric.label}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1 }}
                  onClick={() => setSelectedMetric(metric.label)}
                  className={`bg-gradient-to-br ${metric.color} border border-[#3A3A4F] rounded-lg p-6 cursor-pointer transition-all hover:border-[#00F0FF]/50 group ${
                    selectedMetric === metric.label ? 'ring-2 ring-[#00F0FF]' : ''
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="text-[#F5F3E8] opacity-80 group-hover:opacity-100 transition-opacity">
                      {metric.icon}
                    </div>
                    <div
                      className={`text-sm font-bold px-3 py-1 rounded-full ${
                        metric.changePercent > 0
                          ? 'bg-[#50C878]/20 text-[#50C878] flex items-center gap-1'
                          : 'bg-[#FF6B9D]/20 text-[#FF6B9D] flex items-center gap-1'
                      }`}
                    >
                      {metric.changePercent > 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                      {Math.abs(metric.changePercent)}%
                    </div>
                  </div>

                  <h3 className="text-[#A0A0A5] text-sm font-semibold mb-2">{metric.label}</h3>

                  <div className="flex items-baseline gap-2">
                    <div className="text-3xl md:text-4xl font-bold text-[#F5F3E8]">{metric.value.toLocaleString()}</div>
                  </div>

                  <p className="text-xs text-[#6B6B78] mt-3">
                    {metric.change > 0 ? '+' : ''}{metric.change} this {timeRange === '7d' ? 'week' : 'period'}
                  </p>
                </motion.div>
              ))}
            </div>
          </motion.section>

          {/* Influence Score Card */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-12"
          >
            <h2 className="text-2xl font-bold text-[#F5F3E8] mb-6">Influence Score</h2>

            <div className={`bg-gradient-to-br ${getTierColor(mockInfluenceScore.tier)} border-2 rounded-lg p-8`}>
              <div className="grid md:grid-cols-2 gap-8">
                {/* Score Display */}
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  whileInView={{ scale: 1, opacity: 1 }}
                  viewport={{ once: true }}
                  className="flex flex-col items-center justify-center"
                >
                  <div className="relative w-40 h-40 mb-6">
                    <motion.svg
                      viewBox="0 0 100 100"
                      className="w-full h-full"
                      initial={{ rotate: -90 }}
                      animate={{ rotate: -90 }}
                    >
                      <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
                      <motion.circle
                        cx="50"
                        cy="50"
                        r="45"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="8"
                        strokeDasharray={`${(mockInfluenceScore.score / 10000) * 282.7} 282.7`}
                        strokeLinecap="round"
                        initial={{ strokeDasharray: '0 282.7' }}
                        animate={{ strokeDasharray: `${(mockInfluenceScore.score / 10000) * 282.7} 282.7` }}
                        transition={{ duration: 2, delay: 0.2 }}
                      />
                    </motion.svg>

                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-4xl font-bold">{mockInfluenceScore.score}</div>
                        <div className="text-xs opacity-75">SCORE</div>
                      </div>
                    </div>
                  </div>

                  <div className="text-center">
                    <div className="text-2xl font-bold mb-1 capitalize">{mockInfluenceScore.tier}</div>
                    <div className="text-sm opacity-75">
                      Rank #{mockInfluenceScore.ranking} of {mockInfluenceScore.totalUsers.toLocaleString()}
                    </div>
                  </div>
                </motion.div>

                {/* Score Breakdown */}
                <div className="space-y-4">
                  <h3 className="text-lg font-bold mb-4">Score Breakdown</h3>

                  {Object.entries(mockInfluenceScore.breakdown).map(([key, value], idx) => (
                    <motion.div
                      key={key}
                      initial={{ opacity: 0, x: 20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: idx * 0.1 }}
                    >
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-semibold capitalize">{key}</span>
                        <span className="text-2xl font-bold">{value}</span>
                      </div>
                      <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          whileInView={{ width: `${value}%` }}
                          viewport={{ once: true }}
                          transition={{ duration: 1, delay: idx * 0.1 + 0.3 }}
                          className="bg-white/50 h-full rounded-full"
                        />
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </motion.section>

          {/* Engagement Trend */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-12"
          >
            <h2 className="text-2xl font-bold text-[#F5F3E8] mb-6">Engagement Trends</h2>

            <div className="bg-[#1A1A2E] border border-[#3A3A4F] rounded-lg p-8">
              {/* Chart Placeholder */}
              <div className="h-64 flex items-end justify-around gap-2 mb-6">
                {mockEngagementData.map((data, idx) => (
                  <motion.div
                    key={data.date}
                    initial={{ height: 0 }}
                    whileInView={{ height: `${(data.likes / 600) * 100}%` }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.05, duration: 0.8 }}
                    className="flex-1 bg-gradient-to-t from-[#00F0FF] to-[#A78BFA] rounded-t-lg opacity-80 hover:opacity-100 transition-opacity group cursor-pointer"
                  >
                    <div className="h-full flex items-start justify-center pt-2">
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-white font-bold">
                        {data.likes}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Legend */}
              <div className="flex justify-center gap-6 text-sm">
                {mockEngagementData.map((data) => (
                  <div key={data.date} className="text-center">
                    <div className="text-[#F5F3E8] font-semibold">{data.date}</div>
                  </div>
                ))}
              </div>
            </div>
          </motion.section>

          {/* Community Stats */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-12"
          >
            <h2 className="text-2xl font-bold text-[#F5F3E8] mb-6">Community Health</h2>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Health Status */}
              <div className={`border-2 rounded-lg p-6 ${getHealthColor(mockCommunityStats.communityHealth)}`}>
                <div className="text-center">
                  <div className="text-3xl font-bold mb-2">EXCELLENT</div>
                  <div className="text-sm opacity-75">Community health status</div>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Total Members', value: mockCommunityStats.totalMembers },
                  { label: 'Active Members', value: mockCommunityStats.activeMembers },
                  { label: 'New This Week', value: mockCommunityStats.newMembersThisWeek },
                  { label: 'Engagement Rate', value: `${mockCommunityStats.averageEngagementRate}%` },
                ].map((stat, idx) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.05 }}
                    className="bg-[#1A1A2E] border border-[#3A3A4F] rounded-lg p-4"
                  >
                    <div className="text-2xl font-bold text-[#00F0FF] mb-1">
                      {typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
                    </div>
                    <div className="text-xs text-[#A0A0A5]">{stat.label}</div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.section>

          {/* Top Contributors */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-12"
          >
            <h2 className="text-2xl font-bold text-[#F5F3E8] mb-6">Insights & Recommendations</h2>

            <div className="space-y-4">
              {[
                {
                  icon: '📈',
                  title: 'Engagement Spike',
                  description: 'Your engagement rate increased 23% this week. Keep up the content momentum!',
                  actionable: true,
                },
                {
                  icon: '🎯',
                  title: 'Growth Opportunity',
                  description: 'Your audience is most active on Thursdays and Fridays. Schedule posts accordingly.',
                  actionable: true,
                },
                {
                  icon: '👥',
                  title: 'Community Insight',
                  description: 'Followers who engage with governance content are 3x more likely to refer friends.',
                  actionable: true,
                },
              ].map((insight, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1 }}
                  className="bg-[#1A1A2E] border border-[#3A3A4F] rounded-lg p-6 hover:border-[#A78BFA] transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <div className="text-3xl flex-shrink-0">{insight.icon}</div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-[#F5F3E8] mb-2">{insight.title}</h3>
                      <p className="text-[#A0A0A5]">{insight.description}</p>
                    </div>
                    {insight.actionable && (
                      <button className="px-4 py-2 bg-[#00F0FF] text-[#0A0A0F] rounded-lg hover:bg-[#00D9E8] transition-colors font-semibold text-sm flex-shrink-0">
                        Learn More
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.section>
        </main>

        <Footer />
      </PageWrapper>
    </>
  );
}

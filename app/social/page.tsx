'use client';

/**
 * Social Analytics Page
 * 
 * Analytics dashboard for social engagement metrics.
 * The main social experience is in /social-hub.
 */

import { Footer } from '@/components/layout/Footer';
import { PageWrapper } from '@/components/ui/PageLayout';
import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  Users,
  Heart,
  MessageCircle,
  Share2,
  ArrowUp,
  ArrowDown,
  ArrowRight,
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

const EMPTY_INFLUENCE_SCORE: InfluenceScore = {
  score: 0,
  tier: 'bronze',
  ranking: 0,
  totalUsers: 0,
  breakdown: {
    engagement: 0,
    reach: 0,
    authority: 0,
    growth: 0,
  },
};

const EMPTY_COMMUNITY_STATS: CommunityStats = {
  totalMembers: 0,
  activeMembers: 0,
  newMembersThisWeek: 0,
  averageEngagementRate: 0,
  topContributors: 0,
  communityHealth: 'average',
};

// ==================== COMPONENTS ====================

export default function SocialAnalyticsPage() {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('7d');
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);
  const [events, setEvents] = useState<unknown[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        return 'bg-emerald-500/20 text-emerald-500 border-emerald-500/50';
      case 'good':
        return 'bg-cyan-400/20 text-cyan-400 border-cyan-400/50';
      case 'average':
        return 'bg-amber-400/20 text-amber-400 border-amber-400/50';
      default:
        return 'bg-pink-400/20 text-pink-400 border-pink-400/50';
    }
  };

  useEffect(() => {
    let isMounted = true;

    const loadAnalytics = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/analytics?eventType=social_interaction&limit=1000');
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error || 'Failed to load social analytics');
        }

        const data = await response.json();
        if (isMounted) {
          setEvents(Array.isArray(data.events) ? data.events : []);
        }
      } catch (err) {
        if (isMounted) {
          setEvents([]);
          setError(err instanceof Error ? err.message : 'Failed to load social analytics');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadAnalytics();

    return () => {
      isMounted = false;
    };
  }, []);

  const { socialMetrics, engagementData, influenceScore, communityStats } = useMemo(() => {
    const totals = {
      followers: 0,
      likes: 0,
      comments: 0,
      shares: 0,
    };

    const normalizedEvents = events.map((event) => {
      const data = event?.event_data ?? event?.eventData ?? {};
      const parsed = typeof data === 'string' ? (() => {
        try {
          return JSON.parse(data);
        } catch {
          return {};
        }
      })() : data;

      const actionRaw = parsed?.action ?? parsed?.type ?? parsed?.event ?? '';
      const action = typeof actionRaw === 'string' ? actionRaw.toLowerCase() : '';
      const timestamp = event?.timestamp ? new Date(event.timestamp) : new Date();

      return { action, timestamp };
    });

    normalizedEvents.forEach(({ action }) => {
      if (action.includes('follow')) totals.followers += 1;
      if (action.includes('like')) totals.likes += 1;
      if (action.includes('comment')) totals.comments += 1;
      if (action.includes('share')) totals.shares += 1;
    });

    const metrics: SocialMetric[] = [
      {
        label: 'Total Followers',
        value: totals.followers,
        change: 0,
        changePercent: 0,
        icon: <Users className="w-6 h-6" />,
        color: 'from-cyan-400 to-violet-400',
      },
      {
        label: 'Total Likes',
        value: totals.likes,
        change: 0,
        changePercent: 0,
        icon: <Heart className="w-6 h-6" />,
        color: 'from-pink-400 to-rose-500',
      },
      {
        label: 'Comments & Replies',
        value: totals.comments,
        change: 0,
        changePercent: 0,
        icon: <MessageCircle className="w-6 h-6" />,
        color: 'from-violet-400 to-violet-600',
      },
      {
        label: 'Total Shares',
        value: totals.shares,
        change: 0,
        changePercent: 0,
        icon: <Share2 className="w-6 h-6" />,
        color: 'from-emerald-500 to-[#00D084]',
      },
    ];

    const rangeDays = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : 365;
    const today = new Date();
    const rangeMap = new Map<string, EngagementData>();
    for (let i = rangeDays - 1; i >= 0; i -= 1) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      rangeMap.set(label, { date: label, likes: 0, comments: 0, shares: 0, followers: 0 });
    }

    normalizedEvents.forEach(({ action, timestamp }) => {
      const label = timestamp.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const entry = rangeMap.get(label);
      if (!entry) return;
      if (action.includes('follow')) entry.followers += 1;
      if (action.includes('like')) entry.likes += 1;
      if (action.includes('comment')) entry.comments += 1;
      if (action.includes('share')) entry.shares += 1;
    });

    return {
      socialMetrics: metrics,
      engagementData: Array.from(rangeMap.values()),
      influenceScore: EMPTY_INFLUENCE_SCORE,
      communityStats: EMPTY_COMMUNITY_STATS,
    };
  }, [events, timeRange]);

  return (
    <>

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
                <h1 className="text-4xl md:text-5xl font-bold text-zinc-100 mb-3">Social Analytics</h1>
                <p className="text-zinc-400 text-lg mb-2">
                  Analyze your influence, engagement, and community growth in real-time
                </p>
                <Link 
                  href="/social-hub" 
                  className="inline-flex items-center gap-2 text-cyan-400 hover:underline text-sm"
                >
                  Go to Social Hub <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              {/* Time Range Selector */}
              <div className="flex gap-2 bg-zinc-900 border border-zinc-700 rounded-lg p-2">
                {(['7d', '30d', '90d', '1y'] as const).map((range) => (
                  <button
                    key={range}
                    onClick={() => setTimeRange(range)}
                    className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                      timeRange === range
                        ? 'bg-cyan-400 text-zinc-950'
                        : 'text-zinc-400 hover:text-zinc-100'
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
            <h2 className="text-2xl font-bold text-zinc-100 mb-6">Key Metrics</h2>

            {isLoading && (
              <div className="mb-6 text-sm text-zinc-400">Loading analytics…</div>
            )}

            {error && (
              <div className="mb-6 text-sm text-pink-400">{error}</div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {socialMetrics.map((metric, idx) => (
                <motion.div
                  key={metric.label}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1 }}
                  onClick={() => setSelectedMetric(metric.label)}
                  className={`bg-linear-to-br ${metric.color} border border-zinc-700 rounded-lg p-6 cursor-pointer transition-all hover:border-cyan-400/50 group ${
                    selectedMetric === metric.label ? 'ring-2 ring-cyan-400' : ''
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="text-zinc-100 opacity-80 group-hover:opacity-100 transition-opacity">
                      {metric.icon}
                    </div>
                    <div
                      className={`text-sm font-bold px-3 py-1 rounded-full ${
                        metric.changePercent > 0
                          ? 'bg-emerald-500/20 text-emerald-500 flex items-center gap-1'
                          : 'bg-pink-400/20 text-pink-400 flex items-center gap-1'
                      }`}
                    >
                      {metric.changePercent > 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                      {Math.abs(metric.changePercent)}%
                    </div>
                  </div>

                  <h3 className="text-zinc-400 text-sm font-semibold mb-2">{metric.label}</h3>

                  <div className="flex items-baseline gap-2">
                    <div className="text-3xl md:text-4xl font-bold text-zinc-100">{metric.value.toLocaleString()}</div>
                  </div>

                  <p className="text-xs text-zinc-500 mt-3">
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
            <h2 className="text-2xl font-bold text-zinc-100 mb-6">Influence Score</h2>

            <div className={`bg-linear-to-br ${getTierColor(influenceScore.tier)} border-2 rounded-lg p-8`}>
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
                        strokeDasharray={`${(influenceScore.score / 10000) * 282.7} 282.7`}
                        strokeLinecap="round"
                        initial={{ strokeDasharray: '0 282.7' }}
                        animate={{ strokeDasharray: `${(influenceScore.score / 10000) * 282.7} 282.7` }}
                        transition={{ duration: 2, delay: 0.2 }}
                      />
                    </motion.svg>

                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-4xl font-bold">{influenceScore.score}</div>
                        <div className="text-xs opacity-75">SCORE</div>
                      </div>
                    </div>
                  </div>

                  <div className="text-center">
                    <div className="text-2xl font-bold mb-1 capitalize">{influenceScore.tier}</div>
                    <div className="text-sm opacity-75">
                      Rank #{influenceScore.ranking} of {influenceScore.totalUsers.toLocaleString()}
                    </div>
                  </div>
                </motion.div>

                {/* Score Breakdown */}
                <div className="space-y-4">
                  <h3 className="text-lg font-bold mb-4">Score Breakdown</h3>

                  {Object.entries(influenceScore.breakdown).map(([key, value], idx) => (
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
            <h2 className="text-2xl font-bold text-zinc-100 mb-6">Engagement Trends</h2>

            <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-8">
              {/* Chart Placeholder */}
              {engagementData.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-zinc-500">
                  No engagement data yet.
                </div>
              ) : (
                <div className="h-64 flex items-end justify-around gap-2 mb-6">
                  {engagementData.map((data, idx) => (
                    <motion.div
                      key={data.date}
                      initial={{ height: 0 }}
                      whileInView={{ height: `${(data.likes / 600) * 100}%` }}
                      viewport={{ once: true }}
                      transition={{ delay: idx * 0.05, duration: 0.8 }}
                      className="flex-1 bg-linear-to-t from-cyan-400 to-violet-400 rounded-t-lg opacity-80 hover:opacity-100 transition-opacity group cursor-pointer"
                    >
                      <div className="h-full flex items-start justify-center pt-2">
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-white font-bold">
                          {data.likes}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Legend */}
              {engagementData.length > 0 && (
                <div className="flex justify-center gap-3 sm:gap-6 text-sm flex-wrap">
                  {engagementData.map((data) => (
                    <div key={data.date} className="text-center">
                      <div className="text-zinc-100 font-semibold">{data.date}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.section>

          {/* Community Stats */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-12"
          >
            <h2 className="text-2xl font-bold text-zinc-100 mb-6">Community Health</h2>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Health Status */}
              <div className={`border-2 rounded-lg p-6 ${getHealthColor(communityStats.communityHealth)}`}>
                <div className="text-center">
                  <div className="text-3xl font-bold mb-2">{communityStats.communityHealth.replace('_', ' ').toUpperCase()}</div>
                  <div className="text-sm opacity-75">Community health status</div>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Total Members', value: communityStats.totalMembers },
                  { label: 'Active Members', value: communityStats.activeMembers },
                  { label: 'New This Week', value: communityStats.newMembersThisWeek },
                  { label: 'Engagement Rate', value: `${communityStats.averageEngagementRate}%` },
                ].map((stat, idx) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.05 }}
                    className="bg-zinc-900 border border-zinc-700 rounded-lg p-4"
                  >
                    <div className="text-2xl font-bold text-cyan-400 mb-1">
                      {typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
                    </div>
                    <div className="text-xs text-zinc-400">{stat.label}</div>
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
            <h2 className="text-2xl font-bold text-zinc-100 mb-6">Insights & Recommendations</h2>

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
                  className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 hover:border-violet-400 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <div className="text-3xl shrink-0">{insight.icon}</div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-zinc-100 mb-2">{insight.title}</h3>
                      <p className="text-zinc-400">{insight.description}</p>
                    </div>
                    {insight.actionable && (
                      <button className="px-4 py-2 bg-cyan-400 text-zinc-950 rounded-lg hover:bg-cyan-400 transition-colors font-semibold text-sm shrink-0">
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

/**
 * Analytics Dashboard Component
 * 
 * Comprehensive analytics dashboard with metrics, charts, and insights.
 */

'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Minus,
  Users,
  MessageSquare,
  Award,
  Activity,
  Loader2,
} from 'lucide-react';
import {
  MetricType,
  TimeRange,
  useMetricSummary,
  useTimeSeriesData,
  usePlatformAnalytics,
  formatDuration,
  formatNumber,
} from '@/lib/analytics';

interface AnalyticsDashboardProps {
  userId?: string;
}

export function AnalyticsDashboard({ userId: _userId }: AnalyticsDashboardProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>(TimeRange.DAY);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-7 h-7" />
            Analytics Dashboard
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Track platform activity and engagement metrics
          </p>
        </div>

        {/* Time Range Selector */}
        <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
      </div>

      {/* Platform Overview */}
      <PlatformOverview timeRange={timeRange} />

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Messages Sent"
          type={MetricType.MESSAGE_SENT}
          range={timeRange}
          icon={MessageSquare}
          color="blue"
        />
        <MetricCard
          title="Active Users"
          type={MetricType.USER_LOGIN}
          range={timeRange}
          icon={Users}
          color="green"
        />
        <MetricCard
          title="Badges Earned"
          type={MetricType.BADGE_EARNED}
          range={timeRange}
          icon={Award}
          color="purple"
        />
        <MetricCard
          title="Groups Created"
          type={MetricType.GROUP_CREATED}
          range={timeRange}
          icon={Activity}
          color="orange"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TimeSeriesChart
          title="Messages Over Time"
          type={MetricType.MESSAGE_SENT}
          range={timeRange}
        />
        <TimeSeriesChart
          title="User Activity"
          type={MetricType.SESSION_START}
          range={timeRange}
        />
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TimeSeriesChart
          title="Group Activity"
          type={MetricType.GROUP_JOINED}
          range={timeRange}
        />
        <TimeSeriesChart
          title="Badge Achievements"
          type={MetricType.BADGE_EARNED}
          range={timeRange}
        />
      </div>
    </div>
  );
}

// ============================================================================
// Time Range Selector
// ============================================================================

interface TimeRangeSelectorProps {
  value: TimeRange;
  onChange: (range: TimeRange) => void;
}

function TimeRangeSelector({ value, onChange }: TimeRangeSelectorProps) {
  const ranges = [
    { value: TimeRange.HOUR, label: '1H' },
    { value: TimeRange.DAY, label: '24H' },
    { value: TimeRange.WEEK, label: '7D' },
    { value: TimeRange.MONTH, label: '30D' },
    { value: TimeRange.YEAR, label: '1Y' },
  ];

  return (
    <div className="flex items-center gap-2 bg-[#1A1A1F] border border-[#2A2A2F] rounded-lg p-1">
      {ranges.map((range) => (
        <button
          key={range.value}
          onClick={() => onChange(range.value)}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
            value === range.value
              ? 'bg-blue-600 text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          {range.label}
        </button>
      ))}
    </div>
  );
}

// ============================================================================
// Platform Overview
// ============================================================================

interface PlatformOverviewProps {
  timeRange: TimeRange;
}

function PlatformOverview({ timeRange }: PlatformOverviewProps) {
  const { analytics, loading } = usePlatformAnalytics(timeRange);

  if (loading) {
    return (
      <div className="bg-[#1A1A1F] border border-[#2A2A2F] rounded-xl p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      </div>
    );
  }

  if (!analytics) return null;

  return (
    <div className="bg-[#1A1A1F] border border-[#2A2A2F] rounded-xl p-6">
      <h2 className="text-lg font-bold text-white mb-4">Platform Overview</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <div className="text-sm text-gray-400 mb-1">Total Users</div>
          <div className="text-2xl font-bold text-white">
            {formatNumber(analytics.totalUsers)}
          </div>
        </div>
        <div>
          <div className="text-sm text-gray-400 mb-1">Active Users</div>
          <div className="text-2xl font-bold text-green-400">
            {formatNumber(analytics.activeUsers)}
          </div>
        </div>
        <div>
          <div className="text-sm text-gray-400 mb-1">Total Messages</div>
          <div className="text-2xl font-bold text-blue-400">
            {formatNumber(analytics.totalMessages)}
          </div>
        </div>
        <div>
          <div className="text-sm text-gray-400 mb-1">Avg Session</div>
          <div className="text-2xl font-bold text-purple-400">
            {formatDuration(analytics.averageSessionDuration)}
          </div>
        </div>
      </div>
      {analytics.peakHours.length > 0 && (
        <div className="mt-4 pt-4 border-t border-[#2A2A2F]">
          <div className="text-sm text-gray-400">
            Peak Activity:{' '}
            <span className="text-white font-medium">
              {analytics.peakHours.map(h => `${h}:00`).join(', ')}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Metric Card
// ============================================================================

interface MetricCardProps {
  title: string;
  type: MetricType;
  range: TimeRange;
  icon: React.ElementType;
  color: 'blue' | 'green' | 'purple' | 'orange';
}

function MetricCard({ title, type, range, icon: Icon, color }: MetricCardProps) {
  const { summary, loading } = useMetricSummary(type, range);

  const colorClasses = {
    blue: 'from-blue-500/20 to-blue-600/20 text-blue-400',
    green: 'from-green-500/20 to-green-600/20 text-green-400',
    purple: 'from-purple-500/20 to-purple-600/20 text-purple-400',
    orange: 'from-orange-500/20 to-orange-600/20 text-orange-400',
  };

  if (loading) {
    return (
      <div className="bg-[#1A1A1F] border border-[#2A2A2F] rounded-xl p-6">
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
        </div>
      </div>
    );
  }

  if (!summary) return null;

  const TrendIcon =
    summary.trend === 'up'
      ? TrendingUp
      : summary.trend === 'down'
      ? TrendingDown
      : Minus;

  const trendColor =
    summary.trend === 'up'
      ? 'text-green-400'
      : summary.trend === 'down'
      ? 'text-red-400'
      : 'text-gray-400';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#1A1A1F] border border-[#2A2A2F] rounded-xl p-6 hover:border-[#3A3A3F] transition-colors"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="text-sm text-gray-400">{title}</div>
        <div
          className={`w-10 h-10 rounded-lg bg-linear-to-br ${colorClasses[color]} flex items-center justify-center`}
        >
          <Icon className="w-5 h-5" />
        </div>
      </div>

      <div className="text-3xl font-bold text-white mb-2">
        {formatNumber(summary.count)}
      </div>

      {summary.uniqueUsers !== undefined && (
        <div className="text-sm text-gray-400 mb-2">
          {formatNumber(summary.uniqueUsers)} unique users
        </div>
      )}

      {summary.percentChange !== undefined && (
        <div className={`flex items-center gap-1 text-sm ${trendColor}`}>
          <TrendIcon className="w-4 h-4" />
          <span>{Math.abs(summary.percentChange).toFixed(1)}%</span>
        </div>
      )}
    </motion.div>
  );
}

// ============================================================================
// Time Series Chart
// ============================================================================

interface TimeSeriesChartProps {
  title: string;
  type: MetricType;
  range: TimeRange;
}

function TimeSeriesChart({ title, type, range }: TimeSeriesChartProps) {
  const { data, loading } = useTimeSeriesData(type, range);

  if (loading) {
    return (
      <div className="bg-[#1A1A1F] border border-[#2A2A2F] rounded-xl p-6">
        <h3 className="text-lg font-bold text-white mb-4">{title}</h3>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-[#1A1A1F] border border-[#2A2A2F] rounded-xl p-6">
        <h3 className="text-lg font-bold text-white mb-4">{title}</h3>
        <div className="text-center py-12 text-gray-400">No data available</div>
      </div>
    );
  }

  // Simple bar chart visualization
  const maxValue = Math.max(...data.map(d => d.value));
  const chartHeight = 200;

  return (
    <div className="bg-[#1A1A1F] border border-[#2A2A2F] rounded-xl p-6">
      <h3 className="text-lg font-bold text-white mb-4">{title}</h3>
      
      <div className="relative" style={{ height: chartHeight }}>
        <div className="absolute inset-0 flex items-end justify-between gap-1">
          {data.map((point, index) => {
            const height = maxValue > 0 ? (point.value / maxValue) * chartHeight : 0;
            
            return (
              <motion.div
                key={point.timestamp}
                initial={{ height: 0 }}
                animate={{ height }}
                transition={{ delay: index * 0.02 }}
                className="flex-1 bg-gradient-to-t from-blue-600 to-blue-400 rounded-t-sm relative group cursor-pointer"
                style={{ minWidth: '2px' }}
              >
                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black/90 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                  {point.value} events
                  <div className="text-gray-400">
                    {new Date(point.timestamp).toLocaleString()}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* X-axis labels */}
      <div className="flex items-center justify-between mt-4 text-xs text-gray-400">
        <div>{new Date(data[0]?.timestamp ?? 0).toLocaleDateString()}</div>
        <div>{new Date(data[data.length - 1]?.timestamp ?? 0).toLocaleDateString()}</div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-[#2A2A2F]">
        <div>
          <div className="text-xs text-gray-400 mb-1">Total</div>
          <div className="text-lg font-bold text-white">
            {formatNumber(data.reduce((sum, d) => sum + d.value, 0))}
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-400 mb-1">Average</div>
          <div className="text-lg font-bold text-white">
            {formatNumber(Math.round(data.reduce((sum, d) => sum + d.value, 0) / data.length))}
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-400 mb-1">Peak</div>
          <div className="text-lg font-bold text-white">
            {formatNumber(maxValue)}
          </div>
        </div>
      </div>
    </div>
  );
}

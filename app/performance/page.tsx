'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { usePerformanceMetrics } from '@/hooks/usePerformanceMetrics';
import { useErrorTracking } from '@/hooks/useErrorTracking';
import { useUserAnalytics } from '@/hooks/useUserAnalytics';
import { usePagePerformance } from '@/hooks/usePagePerformance';
import { PerformanceMetricsGrid } from '@/components/performance/PerformanceMetricsGrid';
import { ErrorTracker } from '@/components/performance/ErrorTracker';
import { UserAnalyticsDashboard } from '@/components/performance/UserAnalyticsDashboard';
import { PageMetricsDisplay } from '@/components/performance/PageMetricsDisplay';
import {
  calculateHealthScore,
  TimeRange,
} from '@/config/performance-dashboard';
import { RefreshCw, BarChart3, AlertCircle, Users, Zap } from 'lucide-react';
import { PageWrapper, PageHeader } from '@/components/ui/PageLayout';

export default function PerformanceDashboardPage() {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'metrics' | 'errors' | 'analytics' | 'pages'
  >('overview');
  const [timeRange, setTimeRange] = useState<TimeRange>(TimeRange.LAST_24_HOURS);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const { metrics, systemMetrics: _systemMetrics, isLoading, refreshMetrics } =
    usePerformanceMetrics();
  const { errors, errorStats, addError: _addError, resolveError, clearErrors, exportErrors } =
    useErrorTracking();
  const { analytics, trackEvent } = useUserAnalytics();
  const { pageMetrics, apiMetrics, refreshMetrics: refreshPageMetrics } =
    usePagePerformance();

  const healthScore = calculateHealthScore(metrics);

  // Auto-refresh metrics
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      refreshMetrics();
      refreshPageMetrics();
    }, 30000);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshMetrics, refreshPageMetrics]);

  const handleExportErrors = (format: 'json' | 'csv') => {
    const data = exportErrors(format);
    const filename =
      format === 'json'
        ? `errors-${Date.now()}.json`
        : `errors-${Date.now()}.csv`;

    const blob = new Blob([data], {
      type: format === 'json' ? 'application/json' : 'text/csv',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const tabs = [
    {
      id: 'overview' as const,
      label: 'Overview',
      icon: BarChart3,
    },
    {
      id: 'metrics' as const,
      label: 'Metrics',
      icon: Zap,
    },
    {
      id: 'errors' as const,
      label: 'Errors',
      icon: AlertCircle,
    },
    {
      id: 'analytics' as const,
      label: 'Analytics',
      icon: Users,
    },
    {
      id: 'pages' as const,
      label: 'Pages',
      icon: BarChart3,
    },
  ];

  return (
    <PageWrapper variant="aurora">
      <PageHeader
        icon={<Zap className="w-10 h-10 text-white" />}
        title="Performance Command"
        subtitle="Real-time metrics, error insights, and live user intelligence."
        badge="System Health"
        badgeColor="bg-emerald-400/20 text-emerald-200"
      >
        <div className="flex flex-col lg:flex-row items-center justify-center gap-4 lg:gap-6 text-sm text-zinc-400">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/5 px-4 py-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            Live telemetry enabled
          </span>
          <span className="inline-flex items-center gap-2 rounded-full bg-white/5 px-4 py-2">
            <BarChart3 className="h-4 w-4 text-cyan-300" />
            Multi-surface performance tracking
          </span>
        </div>
      </PageHeader>
      <h1 className="sr-only">Performance Command</h1>
      <div className="container mx-auto px-4 pb-24 md:pb-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8"
        >
          <div className="text-zinc-400">
            <p className="text-sm uppercase tracking-[0.3em] text-cyan-300/80 mb-2">
              Ops overview
            </p>
            <p className="text-lg text-white font-semibold">
              Performance Dashboard
            </p>
          </div>

            <div className="flex items-center gap-4">
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value as TimeRange)}
                className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
              >
                <option value="last_hour">Last Hour</option>
                <option value="last_24_hours">Last 24 Hours</option>
                <option value="last_7_days">Last 7 Days</option>
                <option value="last_30_days">Last 30 Days</option>
                <option value="last_90_days">Last 90 Days</option>
              </select>

              <button
                onClick={() => {
                  refreshMetrics();
                  refreshPageMetrics();
                  trackEvent({
                    eventName: 'metrics_refresh',
                    category: 'performance',
                    userId: 'system',
                    sessionId: 'system',
                    page: '/performance',
                    metadata: { timeRange },
                  });
                }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>

              <label className="flex items-center gap-2 px-4 py-2 bg-slate-800 rounded-lg text-white cursor-pointer hover:bg-slate-700 transition-colors">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="w-4 h-4"
                />
                Auto Refresh
              </label>
          </div>
        </motion.div>

          {/* Health Score */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-8"
          >
            <div>
              <p className="text-sm text-slate-400 mb-2">System Health Score</p>
              <div className="flex items-baseline gap-3">
                <span className="text-3xl sm:text-4xl md:text-5xl font-bold text-white">{healthScore}</span>
                <span className="text-sm text-slate-400">/100</span>
              </div>
            </div>

            <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
              <motion.div
                className={`h-full ${
                  healthScore >= 80
                    ? 'bg-green-500'
                    : healthScore >= 50
                      ? 'bg-yellow-500'
                      : 'bg-red-500'
                }`}
                initial={{ width: 0 }}
                animate={{ width: `${healthScore}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>

            <p
              className={`text-sm font-medium ${
                healthScore >= 80
                  ? 'text-green-400'
                  : healthScore >= 50
                    ? 'text-yellow-400'
                    : 'text-red-400'
              }`}
            >
              {healthScore >= 80
                ? 'Excellent'
                : healthScore >= 50
                  ? 'Fair'
                  : 'Critical'}
            </p>
          </motion.div>
      </div>

      {/* Tab Navigation */}
      <div className="sticky top-20 z-40 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800">
        <div className="container mx-auto px-3 sm:px-4">
          <div className="flex gap-1 overflow-x-auto py-3 scrollbar-hide">
            {tabs.map(({ id, label, icon: Icon }) => (
              <motion.button
                key={id}
                onClick={() => {
                  setActiveTab(id);
                  trackEvent({
                    eventName: `tab_${id}`,
                    category: 'navigation',
                    userId: 'system',
                    sessionId: 'system',
                    page: '/performance',
                    metadata: { tab: id },
                  });
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all ${
                  activeTab === id
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Icon className="w-4 h-4" />
                {label}
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        {activeTab === 'overview' && (
          <motion.div
            key="overview"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-8"
          >
            <PerformanceMetricsGrid metrics={metrics} isLoading={isLoading} />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-500/10 border border-red-500/20 rounded-lg p-6"
              >
                <p className="text-sm text-red-400 mb-2">Active Errors</p>
                <p className="text-3xl font-bold text-white">
                  {errorStats.unresolvedCount}
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-cyan-500/10 border border-cyan-500/20 rounded-lg p-6"
              >
                <p className="text-sm text-cyan-400 mb-2">Active Users</p>
                <p className="text-3xl font-bold text-white">
                  {analytics.activeUsers}
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-green-500/10 border border-green-500/20 rounded-lg p-6"
              >
                <p className="text-sm text-green-400 mb-2">Avg Response Time</p>
                <p className="text-3xl font-bold text-white">
                  {apiMetrics.length > 0
                    ? (
                        apiMetrics.reduce((sum, api) => sum + api.avgResponseTime, 0) /
                        apiMetrics.length
                      ).toFixed(0)
                    : '0'}
                  ms
                </p>
              </motion.div>
            </div>
          </motion.div>
        )}

        {activeTab === 'metrics' && (
          <motion.div
            key="metrics"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <PerformanceMetricsGrid metrics={metrics} isLoading={isLoading} />
          </motion.div>
        )}

        {activeTab === 'errors' && (
          <motion.div
            key="errors"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <ErrorTracker
              errors={errors}
              onResolveError={resolveError}
              onClearAll={clearErrors}
              onExport={handleExportErrors}
            />
          </motion.div>
        )}

        {activeTab === 'analytics' && (
          <motion.div
            key="analytics"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <UserAnalyticsDashboard analytics={analytics} />
          </motion.div>
        )}

        {activeTab === 'pages' && (
          <motion.div
            key="pages"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <PageMetricsDisplay
              pageMetrics={pageMetrics}
              apiMetrics={apiMetrics}
              isLoading={isLoading}
            />
          </motion.div>
        )}
      </div>
    </PageWrapper>
  );
}

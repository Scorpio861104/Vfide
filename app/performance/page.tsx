'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, AlertTriangle, BarChart3, FileText, RefreshCcw, Users } from 'lucide-react';
import { Footer } from '@/components/layout/Footer';
import { calculateHealthScore } from '@/config/performance-dashboard';
import { useErrorTracking } from '@/hooks/useErrorTracking';
import { usePagePerformance } from '@/hooks/usePagePerformance';
import { usePerformanceMetrics } from '@/hooks/usePerformanceMetrics';
import { useUserAnalytics } from '@/hooks/useUserAnalytics';
import { AnalyticsTab } from './components/AnalyticsTab';
import { ErrorsTab } from './components/ErrorsTab';
import { MetricsTab } from './components/MetricsTab';
import { OverviewTab } from './components/OverviewTab';
import { PagesTab } from './components/PagesTab';

type TabId = 'overview' | 'metrics' | 'errors' | 'analytics' | 'pages';

const TAB_LABELS: Record<TabId, string> = {
  overview: 'Overview',
  metrics: 'Metrics',
  errors: 'Errors',
  analytics: 'Analytics',
  pages: 'Pages',
};

const TAB_IDS: TabId[] = ['overview', 'metrics', 'errors', 'analytics', 'pages'];

const DEFAULT_ANALYTICS = {
  totalUsers: 0,
  activeUsers: 0,
  sessionsToday: 0,
  averageSessionDuration: 0,
  bounceRate: 0,
  conversionRate: 0,
  topPages: [],
  topEvents: [],
};

export default function PerformancePage() {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const { metrics, isLoading, refreshMetrics } = usePerformanceMetrics();
  const { errors = [], errorStats = { unresolvedCount: 0 }, resolveError, clearErrors, exportErrors } = useErrorTracking();
  const { analytics, trackEvent } = useUserAnalytics();
  const {
    pageMetrics,
    apiMetrics = [],
    isLoading: pageMetricsLoading,
    refreshMetrics: refreshPageMetrics,
  } = usePagePerformance();

  const metricsList = Array.isArray(metrics) ? metrics : [];
  const analyticsData = useMemo(
    () => ({ ...DEFAULT_ANALYTICS, ...(analytics ?? {}) }),
    [analytics],
  );
  const avgResponseTime = apiMetrics.length
    ? apiMetrics.reduce((sum, api) => sum + api.avgResponseTime, 0) / apiMetrics.length
    : 0;
  const healthScore = calculateHealthScore(metricsList);

  const handleRefresh = () => {
    void refreshMetrics();
    refreshPageMetrics();
    trackEvent?.({
      eventName: 'performance_refresh',
      category: 'performance',
      userId: 'local-user',
      sessionId: 'local-session',
      metadata: { activeTab },
      page: '/performance',
    });
  };

  return (
    <>
      <div className="min-h-screen bg-zinc-950 pt-20">
        <div className="container mx-auto max-w-6xl px-4 py-8">
          <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-2 text-4xl font-bold text-white"
              >
                Performance Command
              </motion.h1>
              <p className="text-white/60">Monitor system health, page load quality, and live user activity.</p>
            </div>

            <button
              onClick={handleRefresh}
              className="inline-flex items-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-500/15 px-4 py-2 text-sm font-bold text-cyan-300"
            >
              <RefreshCcw size={16} />
              Refresh
            </button>
          </div>

          <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 p-5">
              <div className="mb-2 flex items-center gap-2 text-cyan-300">
                <Activity size={16} />
                <span className="text-sm font-semibold">System Health Score</span>
              </div>
              <div className="text-3xl font-bold text-white">{healthScore}</div>
            </div>
            <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-5">
              <div className="mb-2 flex items-center gap-2 text-red-300">
                <AlertTriangle size={16} />
                <span className="text-sm font-semibold">Active Errors</span>
              </div>
              <div className="text-3xl font-bold text-white">{errorStats.unresolvedCount ?? 0}</div>
            </div>
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-5">
              <div className="mb-2 flex items-center gap-2 text-emerald-300">
                <Users size={16} />
                <span className="text-sm font-semibold">Active Users</span>
              </div>
              <div className="text-3xl font-bold text-white">{analyticsData.activeUsers ?? 0}</div>
            </div>
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-5">
              <div className="mb-2 flex items-center gap-2 text-amber-300">
                <BarChart3 size={16} />
                <span className="text-sm font-semibold">Avg Response</span>
              </div>
              <div className="text-3xl font-bold text-white">{avgResponseTime.toFixed(0)}ms</div>
            </div>
          </div>

          <div className="mb-8 flex gap-2 overflow-x-auto pb-2">
            {TAB_IDS.map((id) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-bold whitespace-nowrap transition-all ${
                  activeTab === id
                    ? 'border-cyan-500/30 bg-cyan-500/20 text-cyan-400'
                    : 'border-white/10 bg-white/5 text-gray-400 hover:text-white'
                }`}
              >
                {id === 'overview' && <Activity size={14} />}
                {id === 'metrics' && <BarChart3 size={14} />}
                {id === 'errors' && <AlertTriangle size={14} />}
                {id === 'analytics' && <Users size={14} />}
                {id === 'pages' && <FileText size={14} />}
                {TAB_LABELS[id]}
              </button>
            ))}
          </div>

          {activeTab === 'overview' && (
            <OverviewTab
              metrics={metricsList}
              isLoading={isLoading}
              errorCount={errorStats.unresolvedCount ?? 0}
              activeUsers={analyticsData.activeUsers ?? 0}
              apiMetrics={apiMetrics}
            />
          )}
          {activeTab === 'metrics' && <MetricsTab metrics={metricsList} isLoading={isLoading} />}
          {activeTab === 'errors' && (
            <ErrorsTab
              errors={errors}
              onResolveError={resolveError}
              onClearAll={clearErrors}
              onExport={(format) => exportErrors(format)}
            />
          )}
          {activeTab === 'analytics' && <AnalyticsTab analytics={analyticsData} />}
          {activeTab === 'pages' && (
            <PagesTab pageMetrics={pageMetrics} apiMetrics={apiMetrics} isLoading={pageMetricsLoading} />
          )}
        </div>
      </div>
      <Footer />
    </>
  );
}

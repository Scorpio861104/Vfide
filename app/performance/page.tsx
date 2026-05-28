'use client';

export const dynamic = 'force-dynamic';

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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

const TABS = [
  { id: 'overview' as const, label: 'Overview', icon: <Activity size={14} /> },
  { id: 'metrics' as const, label: 'Metrics', icon: <BarChart3 size={14} /> },
  { id: 'errors' as const, label: 'Errors', icon: <AlertTriangle size={14} /> },
  { id: 'analytics' as const, label: 'Analytics', icon: <Users size={14} /> },
  { id: 'pages' as const, label: 'Pages', icon: <FileText size={14} /> },
];

const DEFAULT_ANALYTICS = {
  totalUsers: 0, activeUsers: 0, sessionsToday: 0, averageSessionDuration: 0,
  bounceRate: 0, conversionRate: 0, topPages: [], topEvents: [],
};

export default function PerformancePage() {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const { metrics, isLoading, refreshMetrics } = usePerformanceMetrics();
  const { errors = [], errorStats = { unresolvedCount: 0 }, resolveError, clearErrors, exportErrors } = useErrorTracking();
  const { analytics, trackEvent } = useUserAnalytics();
  const { pageMetrics, apiMetrics = [], isLoading: pageMetricsLoading, refreshMetrics: refreshPageMetrics } = usePagePerformance();

  const metricsList = Array.isArray(metrics) ? metrics : [];
  const analyticsData = useMemo(() => ({ ...DEFAULT_ANALYTICS, ...(analytics ?? {}) }), [analytics]);
  const avgResponseTime = apiMetrics.length
    ? apiMetrics.reduce((sum, api) => sum + api.avgResponseTime, 0) / apiMetrics.length : 0;
  const healthScore = calculateHealthScore(metricsList);

  const handleRefresh = () => {
    void refreshMetrics();
    refreshPageMetrics();
    trackEvent?.({
      eventName: 'performance_refresh', category: 'performance',
      userId: 'local-user', sessionId: 'local-session',
      metadata: { activeTab }, page: '/performance',
    });
  };

  return (
    <div className="min-h-screen bg-zinc-950 md:pt-[3.5rem] pb-8 relative">
      {/* Ambient orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-20 w-[600px] h-[600px] rounded-full opacity-[0.07]"
          style={{ background: 'radial-gradient(circle, #06b6d4 0%, transparent 70%)' }} />
        <div className="absolute top-1/3 -right-40 w-[500px] h-[500px] rounded-full opacity-[0.05]"
          style={{ background: 'radial-gradient(circle, #10b981 0%, transparent 70%)' }} />
        <div className="grid-pattern absolute inset-0 opacity-[0.03]" />
      </div>

      <div className="relative container mx-auto max-w-6xl px-4">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <span className="badge-live"><span className="badge-live-dot" />System Monitor</span>
            </div>
            <h1 className="text-4xl font-bold mb-2">
              <span className="bg-gradient-to-r from-accent via-emerald-400 to-blue-400 bg-clip-text text-transparent flex items-center gap-3">
                <Activity size={32} className="text-accent" />Performance Command
              </span>
            </h1>
            <p className="text-white/50">Monitor system health, page load quality, and live user activity.</p>
          </div>
          <button onClick={handleRefresh}
            className="btn-premium-ghost flex items-center gap-2 self-start">
            <RefreshCcw size={16} />Refresh
          </button>
        </motion.div>

        {/* Stats */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="analytics-card p-5">
            <div className="mb-2 flex items-center gap-2 text-accent"><Activity size={16} /><span className="text-sm font-semibold">Health Score</span></div>
            <div className="text-3xl font-bold text-white">{healthScore}</div>
          </div>
          <div className="analytics-card p-5">
            <div className="mb-2 flex items-center gap-2 text-red-300"><AlertTriangle size={16} /><span className="text-sm font-semibold">Active Errors</span></div>
            <div className="text-3xl font-bold text-white">{errorStats.unresolvedCount ?? 0}</div>
          </div>
          <div className="analytics-card p-5">
            <div className="mb-2 flex items-center gap-2 text-emerald-300"><Users size={16} /><span className="text-sm font-semibold">Active Users</span></div>
            <div className="text-3xl font-bold text-white">{analyticsData.activeUsers ?? 0}</div>
          </div>
          <div className="analytics-card p-5">
            <div className="mb-2 flex items-center gap-2 text-amber-300"><BarChart3 size={16} /><span className="text-sm font-semibold">Avg Response</span></div>
            <div className="text-3xl font-bold text-white">{avgResponseTime.toFixed(0)}ms</div>
          </div>
        </motion.div>

        {/* Sticky tab bar */}
        <div className="sticky top-7 md:top-[5.25rem] z-30 backdrop-blur-xl bg-zinc-950/80 border-b border-white/5 -mx-4 px-4 mb-8 py-3">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {TABS.map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                className={activeTab === t.id ? 'tab-pill-active' : 'tab-pill-inactive'}>
                {t.icon}{t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <AnimatePresence mode="wait">
          <motion.div key={activeTab}
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}>
            {activeTab === 'overview' && (
              <OverviewTab metrics={metricsList} isLoading={isLoading}
                errorCount={errorStats.unresolvedCount ?? 0} activeUsers={analyticsData.activeUsers ?? 0} apiMetrics={apiMetrics} />
            )}
            {activeTab === 'metrics' && <MetricsTab metrics={metricsList} isLoading={isLoading} />}
            {activeTab === 'errors' && (
              <ErrorsTab errors={errors} onResolveError={resolveError} onClearAll={clearErrors}
                onExport={format => exportErrors(format)} />
            )}
            {activeTab === 'analytics' && <AnalyticsTab analytics={analyticsData} />}
            {activeTab === 'pages' && (
              <PagesTab pageMetrics={pageMetrics} apiMetrics={apiMetrics} isLoading={pageMetricsLoading} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <Footer />
    </div>
  );
}

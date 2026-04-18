'use client';

export const dynamic = 'force-dynamic';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, LayoutDashboard, RefreshCcw, Search } from 'lucide-react';
import { Footer } from '@/components/layout/Footer';
import { formatDateRange, ReportType, TimeRange } from '@/config/reporting-analytics';
import { useReportingAnalytics } from '@/hooks/useReportingAnalytics';
import { DashboardsTab } from './components/DashboardsTab';
import { OverviewTab } from './components/OverviewTab';
import { QueriesTab } from './components/QueriesTab';
import { ReportsTab } from './components/ReportsTab';

type TabId = 'overview' | 'reports' | 'dashboards' | 'queries';

const TAB_LABELS: Record<TabId, string> = {
  overview: 'Overview',
  reports: 'Reports',
  dashboards: 'Dashboards',
  queries: 'Queries',
};

const TAB_IDS: TabId[] = ['overview', 'reports', 'dashboards', 'queries'];

export default function ReportingPage() {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [selectedReportType, setSelectedReportType] = useState<string | null>(null);
  const {
    reports = [],
    dashboards = [],
    selectedTimeRange,
    autoRefresh,
    getSummaryStats,
    setTimeRange,
    toggleAutoRefresh,
    refreshReports,
  } = useReportingAnalytics();

  const summaryStats = getSummaryStats ?? {
    totalReports: reports.length,
    totalDashboards: dashboards.length,
    reportsUpdatedToday: 0,
    totalMetrics: 0,
    totalCharts: 0,
  };

  const timeRangeOptions = useMemo(
    () => Array.from(new Set([selectedTimeRange, ...Object.values(TimeRange)])).filter(Boolean),
    [selectedTimeRange],
  );

  const filteredReports = selectedReportType
    ? reports.filter((report) => report.type === selectedReportType)
    : reports;

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
                Reporting Command
              </motion.h1>
              <p className="text-white/60">Cross-dashboard visibility for every reporting, analytics, and ops surface.</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedTimeRange}
                onChange={(event) =>  setTimeRange(event.target.value as TimeRange)}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
              >
                {timeRangeOptions.map((range) => (
                  <option key={range} value={range}>
                    {range}
                  </option>
                ))}
              </select>
              <button
                onClick={() => toggleAutoRefresh()}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-gray-200"
              >
                Auto: {autoRefresh ? 'On' : 'Off'}
              </button>
              <button
                onClick={() => refreshReports()}
                className="inline-flex items-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-500/15 px-4 py-2 text-sm font-bold text-cyan-300"
              >
                <RefreshCcw size={16} />
                Refresh
              </button>
            </div>
          </div>

          <div className="mb-6 rounded-2xl border border-white/10 bg-white/3 p-4 text-sm text-gray-300">
            Window: <span className="font-semibold text-white">{formatDateRange(selectedTimeRange as TimeRange)}</span>
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
                {id === 'overview' && <BarChart3 size={14} />}
                {id === 'reports' && <BarChart3 size={14} />}
                {id === 'dashboards' && <LayoutDashboard size={14} />}
                {id === 'queries' && <Search size={14} />}
                {TAB_LABELS[id]}
              </button>
            ))}
          </div>

          {activeTab === 'overview' && <OverviewTab summaryStats={summaryStats} />}
          {activeTab === 'reports' && (
            <ReportsTab
              reports={filteredReports}
              selectedReportType={selectedReportType}
              onSelectReportType={setSelectedReportType}
              reportTypes={Object.values(ReportType)}
            />
          )}
          {activeTab === 'dashboards' && <DashboardsTab dashboards={dashboards} />}
          {activeTab === 'queries' && <QueriesTab />}
        </div>
      </div>
      <Footer />
    </>
  );
}

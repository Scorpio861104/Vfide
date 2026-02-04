'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useReportingAnalytics } from '@/hooks/useReportingAnalytics';
import {
  TimeRange,
  ReportType,
  formatDateRange,
} from '@/config/reporting-analytics';
import {
  BarChart3,
  TrendingUp,
  Settings,
  RefreshCw,
  Calendar,
} from 'lucide-react';
import { PageWrapper, PageHeader } from '@/components/ui/PageLayout';

export default function ReportingAnalyticsPage() {
  const {
    reports,
    dashboards,
    selectedTimeRange,
    isLoading,
    autoRefresh,
    getSummaryStats,
    setTimeRange,
    toggleAutoRefresh,
    refreshReports,
    getFilteredReportsByDateRange: _getFilteredReportsByDateRange,
    getReportsByType,
  } = useReportingAnalytics();

  const [activeTab, setActiveTab] = useState<'overview' | 'reports' | 'dashboards' | 'queries'>(
    'overview'
  );
  const [selectedReportType, setSelectedReportType] = useState<ReportType | null>(null);

  const stats = getSummaryStats;
  const filteredReports = useMemo(
    () => (selectedReportType ? getReportsByType(selectedReportType) : reports),
    [reports, selectedReportType, getReportsByType]
  );

  const tabs = [
    { id: 'overview' as const, label: 'Overview', icon: BarChart3 },
    { id: 'reports' as const, label: 'Reports', icon: TrendingUp },
    { id: 'dashboards' as const, label: 'Dashboards', icon: BarChart3 },
    { id: 'queries' as const, label: 'Query Builder', icon: Settings },
  ];

  return (
    <PageWrapper variant="gradient">
      <PageHeader
        icon={<BarChart3 className="w-10 h-10 text-white" />}
        title="Reporting Command"
        subtitle="Real-time insights, detailed reports, and intelligent analytics."
        badge="Data Intelligence"
        badgeColor="bg-indigo-400/20 text-indigo-200"
      >
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={refreshReports}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 rounded-lg text-white transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          <div className="flex items-center gap-2 px-4 py-2 bg-slate-800/80 border border-slate-700 rounded-lg">
            <Calendar className="w-4 h-4 text-slate-400" />
            <select
              value={selectedTimeRange}
              onChange={(e) => setTimeRange(e.target.value as TimeRange)}
              className="bg-transparent text-white text-sm focus:outline-none"
            >
              {Object.values(TimeRange).map((range) => (
                <option key={range} value={range}>
                  {formatDateRange(range)}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={toggleAutoRefresh}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              autoRefresh
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-400'
            }`}
          >
            <RefreshCw className="w-4 h-4" />
            Auto
          </button>
        </div>
      </PageHeader>
      <div className="container mx-auto px-4 pb-24 md:pb-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-6"
        >
          <div className="text-zinc-400">
            <p className="text-sm uppercase tracking-[0.3em] text-indigo-300/80 mb-2">
              Executive view
            </p>
            <p className="text-lg text-white font-semibold">
              Reporting & Analytics
            </p>
          </div>
        </motion.div>

          {/* Summary Stats */}
          {activeTab === 'overview' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4"
            >
              {[
                { label: 'Total Reports', value: stats.totalReports, color: 'blue' },
                { label: 'Total Dashboards', value: stats.totalDashboards, color: 'purple' },
                { label: 'Updated Today', value: stats.reportsUpdatedToday, color: 'green' },
                { label: 'Total Metrics', value: stats.totalMetrics, color: 'amber' },
                { label: 'Total Charts', value: stats.totalCharts, color: 'pink' },
              ].map(({ label, value, color }, idx) => {
                const colorMap = {
                  blue: 'from-blue-500/20 to-blue-500/5 text-blue-400',
                  purple: 'from-purple-500/20 to-purple-500/5 text-purple-400',
                  green: 'from-green-500/20 to-green-500/5 text-green-400',
                  amber: 'from-amber-500/20 to-amber-500/5 text-amber-400',
                  pink: 'from-pink-500/20 to-pink-500/5 text-pink-400',
                };

                return (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.1 }}
                    className={`bg-gradient-to-br ${colorMap[color as keyof typeof colorMap]} border border-slate-800 rounded-lg p-4`}
                  >
                    <p className="text-sm text-slate-400 mb-1">{label}</p>
                    <p className="text-2xl font-bold">{value}</p>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
      </div>

      {/* Tab Navigation */}
      <div className="sticky top-20 z-40 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800">
        <div className="container mx-auto px-3 sm:px-4">
          <div className="flex gap-1 overflow-x-auto py-3 scrollbar-hide">
            {tabs.map(({ id, label, icon: Icon }) => (
              <motion.button
                key={id}
                onClick={() => setActiveTab(id)}
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
        <motion.div
          key={activeTab}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-6"
        >
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Analytics Summary Placeholder */}
              <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
                <h3 className="text-white font-semibold mb-4">Overview Dashboard</h3>
                <p className="text-slate-400 text-sm">
                  Real-time analytics and metrics are displayed here
                </p>
              </div>
            </div>
          )}

          {activeTab === 'reports' && (
            <div className="space-y-6">
              {/* Report Type Filter */}
              <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4">
                <h3 className="text-white font-semibold mb-3">Filter by Type</h3>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedReportType(null)}
                    className={`px-4 py-2 rounded-lg transition-all ${
                      selectedReportType === null
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    All Reports
                  </button>
                  {Object.values(ReportType).map((type) => (
                    <button
                      key={type}
                      onClick={() => setSelectedReportType(type)}
                      className={`px-4 py-2 rounded-lg transition-all capitalize ${
                        selectedReportType === type
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reports List */}
              <div className="grid grid-cols-1 gap-6">
                {filteredReports.length > 0 ? (
                  filteredReports.map((report, idx) => (
                    <motion.div
                      key={report.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="bg-slate-900/50 border border-slate-800 rounded-lg p-6"
                    >
                      <h3 className="text-white text-lg font-semibold mb-2">{report.title}</h3>
                      <p className="text-slate-400 text-sm mb-4">{report.description || 'Report'}</p>
                      <div className="grid grid-cols-3 gap-4">
                        {report.metrics.slice(0, 3).map((metric) => (
                          <div key={metric.id} className="bg-slate-800/50 rounded p-3">
                            <p className="text-slate-400 text-xs mb-1">{metric.label}</p>
                            <p className="text-white font-semibold">{metric.value}</p>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="text-center py-8 text-slate-400">
                    <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No reports found for this filter</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'dashboards' && (
            <div className="space-y-6">
              {dashboards.length > 0 ? (
                dashboards.map((dashboard, idx) => (
                  <motion.div
                    key={dashboard.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="bg-slate-900/50 border border-slate-800 rounded-lg p-6"
                  >
                    <h3 className="text-white text-xl font-semibold mb-2">{dashboard.name}</h3>
                    <p className="text-slate-400 text-sm mb-4">{dashboard.description}</p>
                    <p className="text-slate-500 text-xs">
                      {dashboard.reports.length} report(s)
                    </p>
                  </motion.div>
                ))
              ) : (
                <div className="text-center py-8 text-slate-400">
                  <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No dashboards created yet</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'queries' && (
            <div className="space-y-6">
              {/* Query Builder placeholder */}
              <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6 text-center py-12">
                <Settings className="w-12 h-12 mx-auto mb-3 text-slate-400" />
                <h3 className="text-white font-semibold mb-2">Query Builder</h3>
                <p className="text-slate-400 text-sm">
                  Visual query interface for advanced data analysis
                </p>
                <button className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white text-sm">
                  Create Custom Query
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </PageWrapper>
  );
}

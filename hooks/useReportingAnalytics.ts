/**
 * useReportingAnalytics Hook
 * Comprehensive analytics and reporting state management
 */

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import type {
  Report,
  Query,
  ExportConfig,
  DashboardConfig,
} from '@/config/reporting-analytics';
import {
  ReportType,
  TimeRange,
  ExportFormat,
  defaultReports,
  getDateRangeTimestamps,
} from '@/config/reporting-analytics';

interface ReportingAnalyticsState {
  reports: Report[];
  dashboards: DashboardConfig[];
  queries: Query[];
  selectedTimeRange: TimeRange;
  isLoading: boolean;
  error: string | null;
  autoRefresh: boolean;
  refreshInterval: number;
}

const STORAGE_KEY = 'vfide_reporting_analytics';
const DEFAULT_REFRESH_INTERVAL = 30000; // 30 seconds

export function useReportingAnalytics() {
  const [state, setState] = useState<ReportingAnalyticsState>({
    reports: defaultReports,
    dashboards: [],
    queries: [],
    selectedTimeRange: TimeRange.LAST_30D,
    isLoading: false,
    error: null,
    autoRefresh: true,
    refreshInterval: DEFAULT_REFRESH_INTERVAL,
  });

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setState((prev) => ({
          ...prev,
          ...parsed,
        }));
      }
    } catch (e) {
      console.error('Failed to load analytics state:', e);
    }
  }, []);

  // Persist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error('Failed to persist analytics state:', e);
    }
  }, [state]);

  // Auto-refresh reports
  useEffect(() => {
    if (!state.autoRefresh) return;

    const timer = setInterval(() => {
      setState((prev) => ({
        ...prev,
        reports: prev.reports.map((report) => ({
          ...report,
          lastUpdated: Date.now(),
          // In real app, fetch fresh data here
        })),
      }));
    }, state.refreshInterval);

    return () => clearInterval(timer);
  }, [state.autoRefresh, state.refreshInterval]);

  /**
   * Add or update a report
   */
  const addOrUpdateReport = useCallback((report: Report) => {
    setState((prev) => {
      const existing = prev.reports.findIndex((r) => r.id === report.id);
      if (existing >= 0) {
        const updated = [...prev.reports];
        updated[existing] = report;
        return { ...prev, reports: updated };
      }
      return { ...prev, reports: [...prev.reports, report] };
    });
  }, []);

  /**
   * Remove a report
   */
  const removeReport = useCallback((reportId: string) => {
    setState((prev) => ({
      ...prev,
      reports: prev.reports.filter((r) => r.id !== reportId),
    }));
  }, []);

  /**
   * Get reports by type
   */
  const getReportsByType = useCallback(
    (type: ReportType): Report[] => {
      return state.reports.filter((r) => r.type === type);
    },
    [state.reports]
  );

  /**
   * Get single report by ID
   */
  const getReport = useCallback(
    (reportId: string): Report | undefined => {
      return state.reports.find((r) => r.id === reportId);
    },
    [state.reports]
  );

  /**
   * Update metric in a report
   */
  const updateMetric = useCallback((reportId: string, metricId: string, value: number) => {
    setState((prev) => ({
      ...prev,
      reports: prev.reports.map((report) => {
        if (report.id !== reportId) return report;

        return {
          ...report,
          metrics: report.metrics.map((metric) => {
            if (metric.id !== metricId) return metric;

            const oldValue = metric.value;
            const newValue = value;
            const change = ((newValue - oldValue) / oldValue) * 100;

            return {
              ...metric,
              value: newValue,
              change,
              trend: change > 0 ? 'up' : change < 0 ? 'down' : 'neutral',
              lastUpdated: Date.now(),
            };
          }),
          lastUpdated: Date.now(),
        };
      }),
    }));
  }, []);

  /**
   * Create dashboard
   */
  const createDashboard = useCallback((dashboard: DashboardConfig) => {
    setState((prev) => ({
      ...prev,
      dashboards: [...prev.dashboards, dashboard],
    }));
  }, []);

  /**
   * Update dashboard
   */
  const updateDashboard = useCallback((dashboardId: string, updates: Partial<DashboardConfig>) => {
    setState((prev) => ({
      ...prev,
      dashboards: prev.dashboards.map((d) =>
        d.id === dashboardId ? { ...d, ...updates } : d
      ),
    }));
  }, []);

  /**
   * Remove dashboard
   */
  const removeDashboard = useCallback((dashboardId: string) => {
    setState((prev) => ({
      ...prev,
      dashboards: prev.dashboards.filter((d) => d.id !== dashboardId),
    }));
  }, []);

  /**
   * Get dashboard with reports
   */
  const getDashboardWithReports = useCallback(
    (dashboardId: string) => {
      const dashboard = state.dashboards.find((d) => d.id === dashboardId);
      if (!dashboard) return null;

      const reports = dashboard.reports
        .map((reportId) => state.reports.find((r) => r.id === reportId))
        .filter(Boolean) as Report[];

      return { dashboard, reports };
    },
    [state.dashboards, state.reports]
  );

  /**
   * Save query
   */
  const saveQuery = useCallback((query: Query) => {
    setState((prev) => {
      const existing = prev.queries.findIndex((q) => q.id === query.id);
      if (existing >= 0) {
        const updated = [...prev.queries];
        updated[existing] = query;
        return { ...prev, queries: updated };
      }
      return { ...prev, queries: [...prev.queries, query] };
    });
  }, []);

  /**
   * Remove query
   */
  const removeQuery = useCallback((queryId: string) => {
    setState((prev) => ({
      ...prev,
      queries: prev.queries.filter((q) => q.id !== queryId),
    }));
  }, []);

  /**
   * Execute query
   */
  const executeQuery = useCallback(async (query: Query) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      // In a real app, this would call an API
      console.log('Executing query:', query);

      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 500));

      setState((prev) => ({ ...prev, isLoading: false }));
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Query execution failed';
      setState((prev) => ({ ...prev, isLoading: false, error }));
    }
  }, []);

  /**
   * Set time range
   */
  const setTimeRange = useCallback((range: TimeRange) => {
    setState((prev) => ({
      ...prev,
      selectedTimeRange: range,
    }));
  }, []);

  /**
   * Toggle auto-refresh
   */
  const toggleAutoRefresh = useCallback(() => {
    setState((prev) => ({
      ...prev,
      autoRefresh: !prev.autoRefresh,
    }));
  }, []);

  /**
   * Set refresh interval
   */
  const setRefreshInterval = useCallback((interval: number) => {
    setState((prev) => ({
      ...prev,
      refreshInterval: interval,
    }));
  }, []);

  /**
   * Refresh all reports
   */
  const refreshReports = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      // In a real app, this would fetch fresh data
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setState((prev) => ({
        ...prev,
        isLoading: false,
        reports: prev.reports.map((report) => ({
          ...report,
          lastUpdated: Date.now(),
        })),
      }));
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Refresh failed';
      setState((prev) => ({ ...prev, isLoading: false, error }));
    }
  }, []);

  /**
   * Export report data
   */
  const exportReport = useCallback((reportId: string, config: ExportConfig) => {
    const report = state.reports.find((r) => r.id === reportId);
    if (!report) return;

    try {
      let data = '';

      if (config.format === ExportFormat.JSON) {
        data = JSON.stringify(
          {
            report: {
              id: report.id,
              title: report.title,
              metrics: report.metrics,
              charts: report.charts,
            },
            exportedAt: new Date().toISOString(),
          },
          null,
          2
        );
      } else if (config.format === ExportFormat.CSV) {
        // CSV format
        const headers = ['Metric', 'Value', 'Change', 'Status'];
        const rows = report.metrics.map((m) => [m.label, m.value, m.change, m.status]);
        data =
          headers.join(',') +
          '\n' +
          rows.map((r) => r.map((v) => (typeof v === 'string' ? `"${v}"` : v)).join(',')).join('\n');
      }

      // Download file
      const blob = new Blob([data], {
        type:
          config.format === ExportFormat.JSON
            ? 'application/json'
            : config.format === ExportFormat.CSV
              ? 'text/csv'
              : 'text/plain',
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = config.filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Export failed';
      setState((prev) => ({ ...prev, error }));
    }
  }, [state.reports]);

  /**
   * Get filtered reports by date range
   */
  const getFilteredReportsByDateRange = useCallback(() => {
    const { start, end } = getDateRangeTimestamps(state.selectedTimeRange);
    return state.reports.filter((r) => r.lastUpdated >= start && r.lastUpdated <= end);
  }, [state.reports, state.selectedTimeRange]);

  /**
   * Get comparison data between two time ranges
   */
  const getComparisonData = useCallback(
    (reportId: string, range1: TimeRange, range2: TimeRange) => {
      const report = state.reports.find((r) => r.id === reportId);
      if (!report) return null;

      return {
        report,
        range1,
        range2,
        timestamp1: getDateRangeTimestamps(range1),
        timestamp2: getDateRangeTimestamps(range2),
      };
    },
    [state.reports]
  );

  /**
   * Get summary statistics
   */
  const getSummaryStats = useMemo(() => {
    return {
      totalReports: state.reports.length,
      totalDashboards: state.dashboards.length,
      reportsUpdatedToday: (() => {
        const now = Date.now();
        return state.reports.filter((r) => now - r.lastUpdated < 24 * 60 * 60 * 1000).length;
      })(),
      totalMetrics: state.reports.reduce((sum, r) => sum + r.metrics.length, 0),
      totalCharts: state.reports.reduce((sum, r) => sum + r.charts.length, 0),
    };
  }, [state.reports, state.dashboards]);

  return {
    // State
    reports: state.reports,
    dashboards: state.dashboards,
    queries: state.queries,
    selectedTimeRange: state.selectedTimeRange,
    isLoading: state.isLoading,
    error: state.error,
    autoRefresh: state.autoRefresh,
    refreshInterval: state.refreshInterval,

    // Report operations
    addOrUpdateReport,
    removeReport,
    getReportsByType,
    getReport,
    updateMetric,
    refreshReports,
    exportReport,
    getFilteredReportsByDateRange,
    getComparisonData,

    // Dashboard operations
    createDashboard,
    updateDashboard,
    removeDashboard,
    getDashboardWithReports,

    // Query operations
    saveQuery,
    removeQuery,
    executeQuery,

    // Settings
    setTimeRange,
    toggleAutoRefresh,
    setRefreshInterval,

    // Analytics
    getSummaryStats,
  };
}

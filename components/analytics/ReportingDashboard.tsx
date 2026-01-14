import React, { useState, useMemo } from 'react';

// Types
interface Metric {
  id: string;
  label: string;
  value: number | string;
  change?: number; // Percentage change
  trend?: 'up' | 'down' | 'neutral';
  icon?: React.ReactNode;
  format?: 'number' | 'currency' | 'percentage' | 'duration';
}

interface ChartData {
  id: string;
  label: string;
  data: Array<{ x: string | number; y: number }>;
  color?: string;
}

interface Report {
  id: string;
  title: string;
  description: string;
  metrics: Metric[];
  charts: ChartData[];
  lastUpdated: Date;
  updateInterval?: number; // milliseconds
}

interface DateRange {
  start: Date;
  end: Date;
  label: string;
}

interface ReportingDashboardProps {
  reports: Report[];
  onRefresh?: () => Promise<void>;
  onExport?: (reportId: string, format: 'csv' | 'pdf' | 'json') => void;
  className?: string;
}

// Date range presets
const DATE_RANGES: DateRange[] = [
  {
    start: new Date(Date.now() - 24 * 60 * 60 * 1000),
    end: new Date(),
    label: 'Last 24 Hours'
  },
  {
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    end: new Date(),
    label: 'Last 7 Days'
  },
  {
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    end: new Date(),
    label: 'Last 30 Days'
  },
  {
    start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
    end: new Date(),
    label: 'Last 90 Days'
  }
];

// Metric Card Component
function MetricCard({ metric }: { metric: Metric }) {
  const formatValue = (value: number | string, format?: string): string => {
    if (typeof value === 'string') return value;
    
    switch (format) {
      case 'currency':
        return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      case 'percentage':
        return `${value.toFixed(2)}%`;
      case 'duration':
        const hours = Math.floor(value / 3600);
        const minutes = Math.floor((value % 3600) / 60);
        return `${hours}h ${minutes}m`;
      default:
        return value.toLocaleString();
    }
  };

  const getTrendIcon = (trend?: 'up' | 'down' | 'neutral') => {
    if (!trend) return null;
    
    const baseClasses = 'w-4 h-4';
    if (trend === 'up') {
      return (
        <svg className={`${baseClasses} text-green-500`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
        </svg>
      );
    } else if (trend === 'down') {
      return (
        <svg className={`${baseClasses} text-red-500`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      );
    }
    return (
      <svg className={`${baseClasses} text-gray-500`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" />
      </svg>
    );
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{metric.label}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {formatValue(metric.value, metric.format)}
          </p>
          {metric.change !== undefined && (
            <div className="flex items-center gap-1 mt-2">
              {getTrendIcon(metric.trend)}
              <span className={`text-sm font-medium ${
                metric.trend === 'up' ? 'text-green-600 dark:text-green-400' :
                metric.trend === 'down' ? 'text-red-600 dark:text-red-400' :
                'text-gray-600 dark:text-gray-400'
              }`}>
                {metric.change > 0 ? '+' : ''}{metric.change.toFixed(2)}%
              </span>
            </div>
          )}
        </div>
        {metric.icon && (
          <div className="text-blue-600 dark:text-blue-400">
            {metric.icon}
          </div>
        )}
      </div>
    </div>
  );
};

// Simple Line Chart Component
function LineChart({ data, height = 300 }: { data: ChartData[]; height?: number }) {
  const getMinMax = () => {
    let minY = Infinity;
    let maxY = -Infinity;
    
    data.forEach(series => {
      series.data.forEach(point => {
        minY = Math.min(minY, point.y);
        maxY = Math.max(maxY, point.y);
      });
    });
    
    return { minY, maxY };
  };

  const { minY, maxY } = getMinMax();
  const range = maxY - minY || 1;

  const getPath = (series: ChartData): string => {
    const points = series.data.map((point, index) => {
      const x = (index / (series.data.length - 1)) * 100;
      const y = ((maxY - point.y) / range) * 100;
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');
    
    return points;
  };

  return (
    <div className="relative" style={{ height }}>
      {/* Y-axis labels */}
      <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-xs text-gray-500 pr-2">
        <span>{maxY.toLocaleString()}</span>
        <span>{((maxY + minY) / 2).toLocaleString()}</span>
        <span>{minY.toLocaleString()}</span>
      </div>

      {/* Chart area */}
      <div className="ml-12 h-full">
        <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
          {/* Grid lines */}
          <line x1="0" y1="0" x2="100" y2="0" stroke="currentColor" strokeWidth="0.1" className="text-gray-300 dark:text-gray-600" />
          <line x1="0" y1="50" x2="100" y2="50" stroke="currentColor" strokeWidth="0.1" className="text-gray-300 dark:text-gray-600" />
          <line x1="0" y1="100" x2="100" y2="100" stroke="currentColor" strokeWidth="0.1" className="text-gray-300 dark:text-gray-600" />

          {/* Data lines */}
          {data.map((series, index) => (
            <path
              key={series.id}
              d={getPath(series)}
              fill="none"
              stroke={series.color || `hsl(${index * 360 / data.length}, 70%, 50%)`}
              strokeWidth="0.5"
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>

        {/* X-axis labels */}
        <div className="flex justify-between text-xs text-gray-500 mt-2">
          {data[0]?.data?.map((point, index) => {
            if (index === 0 || index === (data[0]?.data?.length ?? 0) - 1) {
              return <span key={index}>{point.x}</span>;
            }
            return null;
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mt-4">
        {data.map((series, index) => (
          <div key={series.id} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: series.color || `hsl(${index * 360 / data.length}, 70%, 50%)` }}
            />
            <span className="text-sm text-gray-600 dark:text-gray-400">{series.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Bar Chart Component
function BarChart({ data, height = 300 }: { data: ChartData[]; height?: number }) {
  const maxValue = Math.max(...data.flatMap(series => series.data.map(d => d.y)));

  return (
    <div className="relative" style={{ height }}>
      <div className="flex items-end justify-around h-full gap-2">
        {data[0]?.data.map((point, index) => (
          <div key={index} className="flex-1 flex flex-col items-center">
            <div className="w-full relative flex-1 flex items-end justify-center">
              {data.map((series, seriesIndex) => {
                const barHeight = ((series.data[index]?.y ?? 0) / maxValue) * 100;
                return (
                  <div
                    key={series.id}
                    className="flex-1 mx-0.5 rounded-t transition-all hover:opacity-80"
                    style={{
                      height: `${barHeight}%`,
                      backgroundColor: series.color || `hsl(${seriesIndex * 360 / data.length}, 70%, 50%)`
                    }}
                    title={`${series.label}: ${series.data[index]?.y ?? 0}`}
                  />
                );
              })}
            </div>
            <span className="text-xs text-gray-500 mt-2">{point.x}</span>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mt-4">
        {data.map((series, index) => (
          <div key={series.id} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded"
              style={{ backgroundColor: series.color || `hsl(${index * 360 / data.length}, 70%, 50%)` }}
            />
            <span className="text-sm text-gray-600 dark:text-gray-400">{series.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Main Dashboard Component
export function ReportingDashboard({
  reports,
  onRefresh,
  onExport,
  className = ''
}: ReportingDashboardProps) {
  const [selectedReportId, setSelectedReportId] = useState<string>(reports[0]?.id || '');
  const [dateRange, setDateRange] = useState<DateRange>(DATE_RANGES[1] ?? DATE_RANGES[0] ?? { start: new Date(), end: new Date(), label: 'Custom' });
  const [chartType, setChartType] = useState<'line' | 'bar'>('line');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const selectedReport = useMemo(
    () => reports.find(r => r.id === selectedReportId),
    [reports, selectedReportId]
  );

  const handleRefresh = async () => {
    if (!onRefresh) return;
    
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleExport = (format: 'csv' | 'pdf' | 'json') => {
    if (onExport && selectedReportId) {
      onExport(selectedReportId, format);
    }
  };

  React.useEffect(() => {
    if (!autoRefresh || !selectedReport?.updateInterval) return;

    const interval = setInterval(() => {
      handleRefresh();
    }, selectedReport.updateInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, selectedReport]);

  if (!selectedReport) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <p className="text-gray-500 dark:text-gray-400">No reports available</p>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {selectedReport.title}
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {selectedReport.description}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
            Last updated: {selectedReport.lastUpdated.toLocaleString()}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {onRefresh && (
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <svg
                className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          )}

          {onExport && (
            <div className="flex gap-2">
              <button
                onClick={() => handleExport('csv')}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                CSV
              </button>
              <button
                onClick={() => handleExport('pdf')}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                PDF
              </button>
              <button
                onClick={() => handleExport('json')}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                JSON
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col md:flex-row gap-4 bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
        {/* Report selector */}
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Report
          </label>
          <select
            value={selectedReportId}
            onChange={(e) => setSelectedReportId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          >
            {reports.map(report => (
              <option key={report.id} value={report.id}>
                {report.title}
              </option>
            ))}
          </select>
        </div>

        {/* Date range selector */}
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Date Range
          </label>
          <select
            value={dateRange.label}
            onChange={(e) => {
              const range = DATE_RANGES.find(r => r.label === e.target.value);
              if (range) setDateRange(range);
            }}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          >
            {DATE_RANGES.map(range => (
              <option key={range.label} value={range.label}>
                {range.label}
              </option>
            ))}
          </select>
        </div>

        {/* Chart type selector */}
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Chart Type
          </label>
          <select
            value={chartType}
            onChange={(e) => setChartType(e.target.value as 'line' | 'bar')}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          >
            <option value="line">Line Chart</option>
            <option value="bar">Bar Chart</option>
          </select>
        </div>

        {/* Auto-refresh toggle */}
        {selectedReport.updateInterval && (
          <div className="flex items-end">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Auto-refresh</span>
            </label>
          </div>
        )}
      </div>

      {/* Metrics Grid */}
      {selectedReport.metrics.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {selectedReport.metrics.map(metric => (
            <MetricCard key={metric.id} metric={metric} />
          ))}
        </div>
      )}

      {/* Charts */}
      {selectedReport.charts.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Trends
          </h2>
          {chartType === 'line' ? (
            <LineChart data={selectedReport.charts} />
          ) : (
            <BarChart data={selectedReport.charts} />
          )}
        </div>
      )}
    </div>
  );
};

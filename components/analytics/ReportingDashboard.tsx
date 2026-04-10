import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, BarChart3, LineChart as LineChartIcon, RefreshCw, Download } from 'lucide-react';
import { useTransactionSounds } from '@/hooks/useTransactionSounds';

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

// Animated Counter Component
function AnimatedCounter({ value, format }: { value: number; format?: string }) {
  const motionValue = useMotionValue(0);
  const rounded = useTransform(motionValue, latest => Math.round(latest));
  const [displayValue, setDisplayValue] = React.useState(0);

  React.useEffect(() => {
    const controls = animate(motionValue, value, {
      duration: 1,
      ease: 'easeOut'
    });
    
    const unsubscribe = rounded.on('change', latest => setDisplayValue(latest));
    
    return () => {
      controls.stop();
      unsubscribe();
    };
  }, [value, motionValue, rounded]);

  const formatValue = (val: number): string => {
    switch (format) {
      case 'currency':
        return `$${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      case 'percentage':
        return `${val.toFixed(2)}%`;
      case 'duration':
        const hours = Math.floor(val / 3600);
        const minutes = Math.floor((val % 3600) / 60);
        return `${hours}h ${minutes}m`;
      default:
        return val.toLocaleString();
    }
  };

  return <>{formatValue(displayValue)}</>;
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
    
    if (trend === 'up') {
      return <TrendingUp className="w-4 h-4 text-green-500" />;
    } else if (trend === 'down') {
      return <TrendingDown className="w-4 h-4 text-red-500" />;
    }
    return <Minus className="w-4 h-4 text-gray-500" />;
  };

  return (
    <motion.div 
      className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)' }}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{metric.label}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {typeof metric.value === 'number' ? (
              <AnimatedCounter value={metric.value} format={metric.format} />
            ) : (
              formatValue(metric.value, metric.format)
            )}
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
    </motion.div>
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
  const { playSuccess, playNotification } = useTransactionSounds();

  const selectedReport = useMemo(
    () => reports.find(r => r.id === selectedReportId),
    [reports, selectedReportId]
  );

  const handleRefresh = async () => {
    if (!onRefresh) return;
    
    setIsRefreshing(true);
    try {
      await onRefresh();
      playSuccess();
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
            <motion.button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              whileHover={{ scale: isRefreshing ? 1 : 1.05 }}
              whileTap={{ scale: isRefreshing ? 1 : 0.95 }}
            >
              <motion.div
                animate={{ rotate: isRefreshing ? 360 : 0 }}
                transition={{ duration: 1, repeat: isRefreshing ? Infinity : 0, ease: 'linear' }}
              >
                <RefreshCw className="w-4 h-4" />
              </motion.div>
              Refresh
            </motion.button>
          )}

          {onExport && (
            <div className="flex gap-2">
              {(['csv', 'pdf', 'json'] as const).map((format, index) => (
                <motion.button
                  key={format}
                  onClick={() => {
                    handleExport(format);
                    playNotification();
                  }}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center gap-2"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Download className="w-4 h-4" />
                  {format.toUpperCase()}
                </motion.button>
              ))}
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
            onChange={(e) =>  setSelectedReportId(e.target.value)}
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
            onChange={(e) =>  {
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
          <div className="flex gap-2">
            <motion.button
              onClick={() => {
                setChartType('line');
                playNotification();
              }}
              className={`flex-1 px-3 py-2 rounded-lg border-2 transition-colors flex items-center justify-center gap-2 ${
                chartType === 'line'
                  ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                  : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <LineChartIcon className="w-4 h-4" />
              Line
            </motion.button>
            <motion.button
              onClick={() => {
                setChartType('bar');
                playNotification();
              }}
              className={`flex-1 px-3 py-2 rounded-lg border-2 transition-colors flex items-center justify-center gap-2 ${
                chartType === 'bar'
                  ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                  : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <BarChart3 className="w-4 h-4" />
              Bar
            </motion.button>
          </div>
        </div>

        {/* Auto-refresh toggle */}
        {selectedReport.updateInterval && (
          <div className="flex items-end">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) =>  setAutoRefresh(e.target.checked)}
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
          <AnimatePresence mode="popLayout">
            {selectedReport.metrics.map((metric, index) => (
              <motion.div
                key={metric.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: index * 0.05 }}
              >
                <MetricCard metric={metric} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Charts */}
      {selectedReport.charts.length > 0 && (
        <AnimatePresence mode="wait">
          <motion.div 
            key={`${selectedReportId}-${chartType}`}
            className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Trends
            </h2>
            {chartType === 'line' ? (
              <LineChart data={selectedReport.charts} />
            ) : (
              <BarChart data={selectedReport.charts} />
            )}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
};

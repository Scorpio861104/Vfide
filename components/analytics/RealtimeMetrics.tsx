import React, { useState, useEffect, useRef } from 'react';

// Exported for use elsewhere
export interface MetricUpdate {
  id: string;
  value: number;
  timestamp: number;
}

interface RealtimeMetric {
  id: string;
  label: string;
  value: number;
  history: number[];
  unit?: string;
  color?: string;
  threshold?: {
    warning: number;
    critical: number;
  };
}

interface RealtimeMetricsProps {
  metrics: RealtimeMetric[];
  onUpdate?: (metricId: string) => Promise<number>;
  updateInterval?: number; // milliseconds
  maxHistoryLength?: number;
  className?: string;
}

export function RealtimeMetrics({
  metrics: initialMetrics,
  onUpdate,
  updateInterval = 5000,
  maxHistoryLength = 60,
  className = ''
}: RealtimeMetricsProps) {
  const [metrics, setMetrics] = useState<RealtimeMetric[]>(initialMetrics);
  const [isPaused, setIsPaused] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | undefined>(undefined);

  useEffect(() => {
    if (isPaused || !onUpdate) return;

    const fetchUpdates = async () => {
      const updates = await Promise.all(
        metrics.map(async (metric) => {
          const newValue = await onUpdate(metric.id);
          return { ...metric, newValue };
        })
      );

      setMetrics(prev =>
        prev.map((metric, index) => {
          const update = updates[index];
          const newHistory = [...metric.history, update.newValue].slice(-maxHistoryLength);
          return {
            ...metric,
            value: update.newValue,
            history: newHistory
          };
        })
      );
    };

    fetchUpdates();
    intervalRef.current = setInterval(fetchUpdates, updateInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPaused, onUpdate, updateInterval, maxHistoryLength]);

  const getStatus = (metric: RealtimeMetric): 'normal' | 'warning' | 'critical' => {
    if (!metric.threshold) return 'normal';
    if (metric.value >= metric.threshold.critical) return 'critical';
    if (metric.value >= metric.threshold.warning) return 'warning';
    return 'normal';
  };

  const getStatusColor = (status: 'normal' | 'warning' | 'critical'): string => {
    switch (status) {
      case 'critical':
        return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20';
      case 'warning':
        return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20';
      default:
        return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20';
    }
  };

  function MiniSparkline({ data, color = '#3b82f6' }: { data: number[]; color?: string }) {
    if (data.length < 2) return <div className="w-full h-12" />;

    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;

    const points = data.map((value, index) => {
      const x = (index / (data.length - 1)) * 100;
      const y = ((max - value) / range) * 100;
      return `${x},${y}`;
    }).join(' ');

    return (
      <svg viewBox="0 0 100 100" className="w-full h-12" preserveAspectRatio="none">
        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    );
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Controls */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Real-time Metrics
        </h2>
        <button
          onClick={() => setIsPaused(!isPaused)}
          className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center gap-2"
        >
          {isPaused ? (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Resume
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Pause
            </>
          )}
        </button>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {metrics.map(metric => {
          const status = getStatus(metric);
          const statusColor = getStatusColor(status);

          return (
            <div
              key={metric.id}
              className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {metric.label}
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                    {metric.value.toLocaleString()}
                    {metric.unit && <span className="text-sm ml-1">{metric.unit}</span>}
                  </p>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-medium ${statusColor}`}>
                  {status.toUpperCase()}
                </span>
              </div>

              {/* Sparkline */}
              <MiniSparkline data={metric.history} color={metric.color} />

              {/* Stats */}
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-2">
                <span>
                  Min: {Math.min(...metric.history).toLocaleString()}
                </span>
                <span>
                  Max: {Math.max(...metric.history).toLocaleString()}
                </span>
                <span>
                  Avg: {(metric.history.reduce((a, b) => a + b, 0) / metric.history.length).toFixed(2)}
                </span>
              </div>

              {/* Threshold indicators */}
              {metric.threshold && (
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-yellow-600 dark:text-yellow-400">
                      Warning: {metric.threshold.warning}
                    </span>
                    <span className="text-red-600 dark:text-red-400">
                      Critical: {metric.threshold.critical}
                    </span>
                  </div>
                </div>
              )}

              {/* Live indicator */}
              {!isPaused && (
                <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                  </span>
                  <span>Live</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Update info */}
      <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
        Updates every {updateInterval / 1000}s • Showing last {maxHistoryLength} data points
      </p>
    </div>
  );
};

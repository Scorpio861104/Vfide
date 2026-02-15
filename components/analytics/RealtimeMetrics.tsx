'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, Activity, AlertTriangle, AlertCircle } from 'lucide-react';
import { useTransactionSounds } from '@/hooks/useTransactionSounds';

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
  const { playSuccess: _playSuccess, playNotification } = useTransactionSounds();

  useEffect(() => {
    if (isPaused || !onUpdate) return;

    const fetchUpdates = async () => {
      const updates = await Promise.all(
        metrics.map(async (metric) => {
          const newValue = await onUpdate(metric.id);
          return { ...metric, newValue };
        })
      );

      // Optimized: Only update metrics that have changed
      setMetrics(prev =>
        prev.map((metric, index) => {
          const update = updates[index];
          const newValue = update?.newValue ?? metric.value;
          
          // Skip update if value hasn't changed
          if (newValue === metric.value) return metric;
          
          const newHistory = [...metric.history, newValue].slice(-maxHistoryLength);
          return {
            ...metric,
            value: newValue,
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
  }, [isPaused, onUpdate, updateInterval, maxHistoryLength, metrics]);

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
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-500" />
          Real-time Metrics
        </h2>
        <motion.button
          onClick={() => {
            setIsPaused(!isPaused);
            playNotification();
          }}
          className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center gap-2"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {isPaused ? (
            <>
              <Play className="w-4 h-4" />
              Resume
            </>
          ) : (
            <>
              <Pause className="w-4 h-4" />
              Pause
            </>
          )}
        </motion.button>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {metrics.map((metric, index) => {
          const status = getStatus(metric);
          const statusColor = getStatusColor(status);

          return (
            <motion.div
              key={metric.id}
              className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.02, boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
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
                <motion.span 
                  className={`px-2 py-1 rounded text-xs font-medium ${statusColor} flex items-center gap-1`}
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  key={status}
                >
                  {status === 'critical' && <AlertCircle className="w-3 h-3" />}
                  {status === 'warning' && <AlertTriangle className="w-3 h-3" />}
                  {status.toUpperCase()}
                </motion.span>
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
                <motion.div 
                  className="flex items-center gap-1 mt-2 text-xs text-gray-500"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                  </span>
                  <span>Live</span>
                </motion.div>
              )}
            </motion.div>
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

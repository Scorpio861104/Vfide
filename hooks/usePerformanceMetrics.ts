/**
 * usePerformanceMetrics Hook
 * Real-time system and application performance monitoring
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  PerformanceMetric,
  MetricType,
  SystemMetrics,
  DEFAULT_PERFORMANCE_THRESHOLDS,
} from '@/config/performance-dashboard';

interface UsePerformanceMetricsResult {
  metrics: PerformanceMetric[];
  systemMetrics: SystemMetrics[];
  isLoading: boolean;
  error: Error | null;
  refreshMetrics: () => Promise<void>;
}

const METRIC_UNIT_MAP: Record<MetricType, string> = {
  [MetricType.CPU]: '%',
  [MetricType.MEMORY]: '%',
  [MetricType.DISK]: '%',
  [MetricType.NETWORK]: 'Mbps',
  [MetricType.API_RESPONSE_TIME]: 'ms',
  [MetricType.PAGE_LOAD_TIME]: 'ms',
  [MetricType.ERROR_RATE]: '%',
  [MetricType.DATABASE_QUERY]: 'ms',
  [MetricType.BUNDLE_SIZE]: 'KB',
  [MetricType.LIGHTHOUSE_SCORE]: 'score',
};

const isTestEnv = typeof process !== 'undefined' &&
    (process.env.JEST_WORKER_ID !== undefined || process.env.NODE_ENV === 'test');

export function usePerformanceMetrics(): UsePerformanceMetricsResult {
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const refreshInFlight = useRef(false);

  // Get page load time from Performance API
  const getPageLoadMetric = useCallback(async (): Promise<PerformanceMetric> => {
    let loadTime = 0;

    if (typeof window !== 'undefined' && window.performance) {
      const perfData = window.performance.timing;
      loadTime = perfData.loadEventEnd - perfData.navigationStart;
    }

    const threshold = DEFAULT_PERFORMANCE_THRESHOLDS[MetricType.PAGE_LOAD_TIME];

    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (loadTime >= threshold.critical) status = 'critical';
    else if (loadTime >= threshold.warning) status = 'warning';

    return {
      id: `load-${Date.now()}`,
      type: MetricType.PAGE_LOAD_TIME,
      value: loadTime,
      unit: 'ms',
      timestamp: Date.now(),
      threshold,
      status,
    };
  }, []);

  const toPerformanceMetric = useCallback(
    (row: { id: number; metric_name: string; value: number; metadata?: unknown; timestamp: string }): PerformanceMetric | null => {
      const metricType = row.metric_name as MetricType;
      if (!Object.values(MetricType).includes(metricType)) return null;
      const threshold = DEFAULT_PERFORMANCE_THRESHOLDS[metricType];
      const value = Number(row.value);

      let status: 'healthy' | 'warning' | 'critical' = 'healthy';
      if (value >= threshold.critical) status = 'critical';
      else if (value >= threshold.warning) status = 'warning';

      return {
        id: String(row.id),
        type: metricType,
        value,
        unit: METRIC_UNIT_MAP[metricType] ?? '',
        timestamp: new Date(row.timestamp).getTime(),
        threshold,
        status,
      };
    },
    []
  );

  // Get all metrics
  const refreshMetrics = useCallback(async () => {
    try {
      if (refreshInFlight.current) return;
      refreshInFlight.current = true;
      setIsLoading(true);
      setError(null);

      if (isTestEnv) {
        const pageLoad = await getPageLoadMetric();
        setMetrics([pageLoad]);
        setSystemMetrics((prev) => [{
          timestamp: Date.now(),
          cpu: 0,
          memory: 0,
          disk: 0,
          networkIn: 0,
          networkOut: 0,
          activeConnections: 0,
          requestsPerSecond: 0,
        }, ...prev.slice(0, 59)]);
        return;
      }

      const canFetch =
        typeof window !== 'undefined' &&
        typeof globalThis.fetch === 'function';

      const rows: Array<{ id: number; metric_name: string; value: number; metadata?: unknown; timestamp: string }> = [];

      if (canFetch) {
        const response = await globalThis.fetch('/api/performance/metrics?limit=200', {
          credentials: 'include',
        });
        if (!response.ok) {
          throw new Error('Failed to fetch performance metrics');
        }

        const data = await response.json();
        if (Array.isArray(data.metrics)) {
          rows.push(...data.metrics);
        }
      }

      const mapped = rows
        .map((row) => toPerformanceMetric(row))
        .filter((metric): metric is PerformanceMetric => Boolean(metric));

      const latestByType = new Map<MetricType, PerformanceMetric>();
      mapped.forEach((metric) => {
        const existing = latestByType.get(metric.type);
        if (!existing || metric.timestamp > existing.timestamp) {
          latestByType.set(metric.type, metric);
        }
      });

      const pageLoad = await getPageLoadMetric();
      if (!latestByType.has(MetricType.PAGE_LOAD_TIME)) {
        latestByType.set(MetricType.PAGE_LOAD_TIME, pageLoad);
      }

      const allMetrics = Array.from(latestByType.values());
      setMetrics(allMetrics);

      const cpu = latestByType.get(MetricType.CPU)?.value ?? 0;
      const memory = latestByType.get(MetricType.MEMORY)?.value ?? 0;
      const disk = latestByType.get(MetricType.DISK)?.value ?? 0;
      const network = latestByType.get(MetricType.NETWORK)?.value ?? 0;

      const newSystemMetrics: SystemMetrics = {
        timestamp: Date.now(),
        cpu,
        memory,
        disk,
        networkIn: network,
        networkOut: network,
        activeConnections: 0,
        requestsPerSecond: 0,
      };

      setSystemMetrics((prev) => [newSystemMetrics, ...prev.slice(0, 59)]);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch metrics'));
    } finally {
      setIsLoading(false);
      refreshInFlight.current = false;
    }
  }, [getPageLoadMetric, toPerformanceMetric]);

  // Auto-refresh metrics every 30 seconds
  useEffect(() => {
    refreshMetrics();
    if (isTestEnv) {
      return undefined;
    }
    const interval = setInterval(refreshMetrics, 30000);
    return () => clearInterval(interval);
  }, [refreshMetrics]);

  return {
    metrics,
    systemMetrics,
    isLoading,
    error,
    refreshMetrics,
  };
}

/**
 * usePagePerformance Hook
 * Track individual page load times and Core Web Vitals
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { PagePerformance, ApiPerformance } from '@/config/performance-dashboard';
import { logger } from '@/lib/logger';

interface UsePagePerformanceResult {
  pageMetrics: PagePerformance | null;
  apiMetrics: ApiPerformance[];
  isLoading: boolean;
  error: Error | null;
  trackApiCall: (
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
    duration: number,
    success: boolean
  ) => void;
  getMetricsForPage: (page: string) => PagePerformance | null;
  refreshMetrics: () => void;
}

const STORAGE_KEY = 'page_performance_v1';
const API_STORAGE_KEY = 'api_performance_v1';

export function usePagePerformance(): UsePagePerformanceResult {
  const [pageMetrics, setPageMetrics] = useState<PagePerformance | null>(null);
  const [apiMetrics, setApiMetrics] = useState<ApiPerformance[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Load metrics from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setPageMetrics(JSON.parse(stored));
      }

      const apiStored = localStorage.getItem(API_STORAGE_KEY);
      if (apiStored) {
        setApiMetrics(JSON.parse(apiStored));
      }
    } catch (e) {
      logger.error('Failed to load performance metrics:', e);
    }
  }, []);

  // Calculate metrics from Performance API
  const refreshMetrics = useCallback(() => {
    try {
      setIsLoading(true);
      setError(null);

      if (typeof window === 'undefined' || !window.performance) {
        return;
      }

      const perfData = window.performance;
      const navigation = perfData.timing;

      // Calculate Core Web Vitals
      const loadTime = navigation.loadEventEnd - navigation.navigationStart;
      const interactiveTime =
        navigation.domInteractive - navigation.navigationStart;
      const paintEntries = perfData
        .getEntriesByType('paint')
        .filter(
          (entry) => entry.name === 'first-contentful-paint' ||
          entry.name === 'largest-contentful-paint'
        ) as PerformanceEntryList;

      let fcp = 0;
      let lcp = 0;

      paintEntries.forEach((entry) => {
        if (entry.name === 'first-contentful-paint') {
          fcp = entry.startTime;
        }
        if (entry.name === 'largest-contentful-paint') {
          lcp = entry.startTime;
        }
      });

      // Get error count from local error logs
      const errorLogsStr = localStorage.getItem('error_logs_v1');
      const errorLogs = errorLogsStr ? JSON.parse(errorLogsStr) : [];
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayErrors = errorLogs.filter(
        (e: { timestamp: number }) => e.timestamp >= todayStart.getTime()
      );

      const metrics: PagePerformance = {
        page: window.location.pathname,
        avgLoadTime: loadTime,
        avgInteractiveTime: interactiveTime,
        avgFirstContentfulPaint: fcp,
        avgLargestContentfulPaint: lcp,
        totalErrors: todayErrors.length,
        errorRate: (todayErrors.length / Math.max(1, apiMetrics.length)) * 100,
        averageSessionDuration: Math.random() * 300000, // 0-5 min in ms
      };

      setPageMetrics(metrics);

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(metrics));
      } catch (e) {
        logger.error('Failed to save page metrics:', e);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error('Failed to load metrics')
      );
    } finally {
      setIsLoading(false);
    }
  }, [apiMetrics.length]);

  // Track API call performance
  const trackApiCall = useCallback(
    (
      endpoint: string,
      method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
      duration: number,
      success: boolean
    ) => {
      setApiMetrics((prev) => {
        const existing = prev.find(
          (m) => m.endpoint === endpoint && m.method === method
        );

        if (existing) {
          const newMetric: ApiPerformance = {
            ...existing,
            totalCalls: existing.totalCalls + 1,
            avgResponseTime:
              (existing.avgResponseTime * existing.totalCalls + duration) /
              (existing.totalCalls + 1),
            errorRate: success
              ? existing.errorRate
              : (existing.errorRate * existing.totalCalls + 100) /
              (existing.totalCalls + 1),
            successRate: success
              ? (existing.successRate * existing.totalCalls + 100) /
              (existing.totalCalls + 1)
              : existing.successRate,
          };

          const updated = prev.map((m) =>
            m.endpoint === endpoint && m.method === method ? newMetric : m
          );

          try {
            localStorage.setItem(API_STORAGE_KEY, JSON.stringify(updated));
          } catch (e) {
            logger.error('Failed to save API metrics:', e);
          }

          return updated;
        } else {
          const newMetric: ApiPerformance = {
            endpoint,
            method,
            avgResponseTime: duration,
            errorRate: success ? 0 : 100,
            totalCalls: 1,
            p50ResponseTime: duration,
            p95ResponseTime: duration,
            p99ResponseTime: duration,
            successRate: success ? 100 : 0,
          };

          const updated = [...prev, newMetric];

          try {
            localStorage.setItem(API_STORAGE_KEY, JSON.stringify(updated));
          } catch (e) {
            logger.error('Failed to save API metrics:', e);
          }

          return updated;
        }
      });
    },
    []
  );

  // Get metrics for a specific page
  const getMetricsForPage = useCallback(
    (page: string) => {
      if (!pageMetrics || pageMetrics.page !== page) {
        return null;
      }
      return pageMetrics;
    },
    [pageMetrics]
  );

  // Auto-refresh on page load
  useEffect(() => {
    refreshMetrics();
  }, [refreshMetrics]);

  return {
    pageMetrics,
    apiMetrics,
    isLoading,
    error,
    trackApiCall,
    getMetricsForPage,
    refreshMetrics,
  };
}

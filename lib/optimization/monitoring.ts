import { logger } from '@/lib/logger';
import { safeLocalStorage, safeSessionStorage } from '@/lib/utils';
/**
 * Monitoring and Observability Enhancements
 * 
 * Enhanced monitoring utilities beyond basic error tracking:
 * - Performance monitoring
 * - Business metrics tracking
 * - User behavior analytics
 * - Real-time dashboards
 * - Custom alerts
 */

/**
 * Performance metrics types
 */
export interface PerformanceMetrics {
  // Core Web Vitals
  lcp?: number; // Largest Contentful Paint
  fid?: number; // First Input Delay
  cls?: number; // Cumulative Layout Shift
  fcp?: number; // First Contentful Paint
  ttfb?: number; // Time to First Byte
  
  // Custom metrics
  apiResponseTime?: number;
  componentRenderTime?: number;
  transactionTime?: number;
}

/**
 * Business metrics types
 */
export interface BusinessMetrics {
  event: string;
  value?: number;
  properties?: Record<string, any>;
  timestamp: number;
  userId?: string;
  sessionId?: string;
}

/**
 * Track Core Web Vitals
 * Monitors user experience metrics
 */
export function trackWebVitals() {
  if (typeof window === 'undefined') return;

  // Use web-vitals library if available
  const reportWebVital = (metric: { name: string; value: number; rating: string; id: string; delta?: number }) => {
    // Send to analytics
    sendMetric({
      event: `web_vital_${metric.name.toLowerCase()}`,
      value: metric.value,
      properties: {
        rating: metric.rating,
        delta: metric.delta,
        id: metric.id,
      },
      timestamp: Date.now(),
    });
  };

  // Dynamically import web-vitals to avoid bundle size impact
  import('web-vitals').then(({ onCLS, onFID, onFCP, onLCP, onTTFB }) => {
    onCLS(reportWebVital);
    onFID(reportWebVital);
    onFCP(reportWebVital);
    onLCP(reportWebVital);
    onTTFB(reportWebVital);
  }).catch(() => {
    // Silently fail if web-vitals not available
  });
}

/**
 * Track custom business events
 * Monitors user actions and conversions
 */
export function trackEvent(event: string, properties?: Record<string, any>) {
  const metric: BusinessMetrics = {
    event,
    properties,
    timestamp: Date.now(),
    userId: getUserId(),
    sessionId: getSessionId(),
  };

  sendMetric(metric);
}

/**
 * Track API performance
 * Monitors backend response times
 */
export async function trackApiCall<T>(
  endpoint: string,
  fn: () => Promise<T>
): Promise<T> {
  const startTime = performance.now();
  let success = false;
  let error: unknown;

  try {
    const result = await fn();
    success = true;
    return result;
  } catch (e) {
    error = e;
    throw e;
  } finally {
    const duration = performance.now() - startTime;
    
    const errorMessage = error instanceof Error ? error.message : undefined;
    const statusCode = error && typeof error === 'object' && 'statusCode' in error && typeof (error as { statusCode: unknown }).statusCode === 'number'
      ? (error as { statusCode: number }).statusCode 
      : undefined;

    sendMetric({
      event: 'api_call',
      value: duration,
      properties: {
        endpoint,
        success,
        error: errorMessage,
        statusCode,
      },
      timestamp: Date.now(),
    });
  }
}

/**
 * Track transaction performance
 * Monitors blockchain transaction times
 */
export async function trackTransaction<T>(
  type: string,
  fn: () => Promise<T>
): Promise<T> {
  const startTime = performance.now();
  let success = false;
  let txHash: string | undefined;

  try {
    const result = await fn();
    success = true;
    
    // Extract transaction hash if available
    if (result && typeof result === 'object' && 'hash' in result && typeof (result as Record<string, unknown>).hash === 'string') {
      txHash = (result as Record<string, unknown>).hash as string;
    }

    return result;
  } finally {
    const duration = performance.now() - startTime;

    sendMetric({
      event: 'transaction',
      value: duration,
      properties: {
        type,
        success,
        txHash,
      },
      timestamp: Date.now(),
    });
  }
}

/**
 * Track page views
 * Monitors navigation and user flow
 */
export function trackPageView(path: string, referrer?: string) {
  sendMetric({
    event: 'page_view',
    properties: {
      path,
      referrer,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
    },
    timestamp: Date.now(),
  });
}

/**
 * Track user retention
 * Monitors DAU/MAU and user engagement
 */
export function trackRetention() {
  const lastVisit = safeLocalStorage.getItem('last_visit');
  const now = Date.now();

  if (lastVisit) {
    const daysSinceLastVisit = (now - parseInt(lastVisit)) / (1000 * 60 * 60 * 24);

    sendMetric({
      event: 'user_return',
      value: daysSinceLastVisit,
      properties: {
        isReturning: true,
        daysSinceLastVisit,
      },
      timestamp: now,
    });
  } else {
    sendMetric({
      event: 'user_first_visit',
      properties: {
        isReturning: false,
      },
      timestamp: now,
    });
  }

  safeLocalStorage.setItem('last_visit', now.toString());
}

/**
 * Track conversion funnel
 * Monitors user progress through key flows
 */
export function trackFunnelStep(funnel: string, step: string, properties?: Record<string, any>) {
  sendMetric({
    event: 'funnel_step',
    properties: {
      funnel,
      step,
      ...properties,
    },
    timestamp: Date.now(),
  });
}

/**
 * Track feature usage
 * Identifies popular and unused features
 */
export function trackFeatureUsage(feature: string, action: string) {
  sendMetric({
    event: 'feature_usage',
    properties: {
      feature,
      action,
    },
    timestamp: Date.now(),
  });
}

/**
 * Monitor error rates
 * Tracks application stability
 */
export function trackErrorRate(error: Error, context?: Record<string, any>) {
  sendMetric({
    event: 'error',
    properties: {
      message: error.message,
      stack: error.stack,
      name: error.name,
      ...context,
    },
    timestamp: Date.now(),
  });
}

/**
 * Send metric to analytics backend
 * Batches metrics for efficiency
 */
const metricsQueue: BusinessMetrics[] = [];
const BATCH_SIZE = 10;
const BATCH_TIMEOUT = 5000; // 5 seconds

let batchTimer: NodeJS.Timeout | null = null;

function sendMetric(metric: BusinessMetrics) {
  metricsQueue.push(metric);

  // Flush if batch size reached
  if (metricsQueue.length >= BATCH_SIZE) {
    flushMetrics();
  } else if (!batchTimer) {
    // Set timer to flush after timeout
    batchTimer = setTimeout(flushMetrics, BATCH_TIMEOUT);
  }
}

async function flushMetrics() {
  if (metricsQueue.length === 0) return;

  const batch = metricsQueue.splice(0, metricsQueue.length);
  
  if (batchTimer) {
    clearTimeout(batchTimer);
    batchTimer = null;
  }

  try {
    // Send to analytics endpoint
    await fetch('/api/analytics/metrics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ metrics: batch }),
      keepalive: true, // Ensure metrics sent even on page unload
    });
  } catch (error) {
    // Silently fail - don't block user experience
    logger.error('Failed to send metrics:', error);
  }
}

// Flush metrics on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    if (metricsQueue.length > 0) {
      // Use sendBeacon for reliable delivery on page unload
      const data = JSON.stringify({ metrics: metricsQueue });
      navigator.sendBeacon('/api/analytics/metrics', data);
    }
  });
}

/**
 * Helper functions
 */
function getUserId(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  return safeLocalStorage.getItem('user_id') || undefined;
}

function getSessionId(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  
  let sessionId = safeSessionStorage.getItem('session_id');
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    safeSessionStorage.setItem('session_id', sessionId);
  }
  
  return sessionId;
}

/**
 * Real-time monitoring dashboard data
 */
export interface DashboardMetrics {
  // Current values
  activeUsers: number;
  requestsPerMinute: number;
  errorRate: number;
  avgResponseTime: number;
  
  // Trends (vs previous period)
  activeUsersTrend: number;
  requestsTrend: number;
  errorRateTrend: number;
  responseTimeTrend: number;
}

/**
 * Get real-time dashboard metrics
 * For admin monitoring UI
 */
export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const response = await fetch('/api/admin/metrics/dashboard');
  return response.json();
}

/**
 * Alert thresholds configuration
 */
export const ALERT_THRESHOLDS = {
  errorRate: 0.05, // 5% error rate
  responseTime: 1000, // 1 second avg response time
  availability: 0.999, // 99.9% uptime
  activeUsers: 1000, // Minimum active users
};

/**
 * Check if metrics exceed alert thresholds
 */
export function checkAlertThresholds(metrics: DashboardMetrics): Array<{
  metric: string;
  threshold: number;
  current: number;
  severity: 'warning' | 'critical';
}> {
  const alerts: Array<{
    metric: string;
    threshold: number;
    current: number;
    severity: 'warning' | 'critical';
  }> = [];

  if (metrics.errorRate > ALERT_THRESHOLDS.errorRate) {
    alerts.push({
      metric: 'Error Rate',
      threshold: ALERT_THRESHOLDS.errorRate,
      current: metrics.errorRate,
      severity: (metrics.errorRate > ALERT_THRESHOLDS.errorRate * 2 ? 'critical' : 'warning') as 'warning' | 'critical',
    });
  }

  if (metrics.avgResponseTime > ALERT_THRESHOLDS.responseTime) {
    alerts.push({
      metric: 'Response Time',
      threshold: ALERT_THRESHOLDS.responseTime,
      current: metrics.avgResponseTime,
      severity: (metrics.avgResponseTime > ALERT_THRESHOLDS.responseTime * 2 ? 'critical' : 'warning') as 'warning' | 'critical',
    });
  }

  return alerts;
}

/**
 * Simple API call tracking for server-side routes
 * Use this in API route handlers to track performance
 */
export function trackApiCallSimple(
  endpoint: string,
  method: string,
  statusCode: number,
  durationMs: number
): void {
  sendMetric({
    event: 'api_call',
    value: durationMs,
    properties: {
      endpoint,
      method,
      statusCode,
      success: statusCode >= 200 && statusCode < 400,
    },
    timestamp: Date.now(),
  });
}

// Re-export with alternate name for convenience
export { trackApiCallSimple as trackApiRoute };

/**
 * Performance Dashboard Configuration
 * Provides types, enums, and utilities for system metrics monitoring
 */

// ============================================
// PERFORMANCE METRICS TYPES
// ============================================

export enum MetricType {
  CPU = 'cpu',
  MEMORY = 'memory',
  DISK = 'disk',
  NETWORK = 'network',
  API_RESPONSE_TIME = 'api_response_time',
  PAGE_LOAD_TIME = 'page_load_time',
  ERROR_RATE = 'error_rate',
  DATABASE_QUERY = 'database_query',
  BUNDLE_SIZE = 'bundle_size',
  LIGHTHOUSE_SCORE = 'lighthouse_score',
}

export enum AlertLevel {
  INFO = 'info',
  WARNING = 'warning',
  CRITICAL = 'critical',
}

export enum TimeRange {
  LAST_HOUR = 'last_hour',
  LAST_24_HOURS = 'last_24_hours',
  LAST_7_DAYS = 'last_7_days',
  LAST_30_DAYS = 'last_30_days',
  LAST_90_DAYS = 'last_90_days',
  CUSTOM = 'custom',
}

export enum ErrorCategory {
  NETWORK = 'network',
  CLIENT = 'client',
  SERVER = 'server',
  TIMEOUT = 'timeout',
  VALIDATION = 'validation',
  PERMISSION = 'permission',
  NOT_FOUND = 'not_found',
  CONFLICT = 'conflict',
  UNKNOWN = 'unknown',
}

// ============================================
// PERFORMANCE METRIC DATA STRUCTURES
// ============================================

export interface PerformanceMetric {
  id: string;
  type: MetricType;
  value: number;
  unit: string;
  timestamp: number;
  threshold: {
    warning: number;
    critical: number;
  };
  status: 'healthy' | 'warning' | 'critical';
}

export interface PerformanceAlert {
  id: string;
  metricType: MetricType;
  level: AlertLevel;
  title: string;
  message: string;
  timestamp: number;
  value: number;
  threshold: number;
  acknowledged: boolean;
  acknowledgedAt?: number;
}

export interface ErrorLog {
  id: string;
  category: ErrorCategory;
  message: string;
  stackTrace?: string;
  userAgent: string;
  url: string;
  timestamp: number;
  userId?: string;
  severity: 'low' | 'medium' | 'high';
  resolved: boolean;
}

export interface AnalyticsEvent {
  id: string;
  eventName: string;
  category: string;
  userId: string;
  sessionId: string;
  timestamp: number;
  duration?: number;
  metadata: Record<string, any>;
  page: string;
}

export interface UserAnalytics {
  totalUsers: number;
  activeUsers: number;
  sessionsToday: number;
  averageSessionDuration: number;
  bounceRate: number;
  conversionRate: number;
  topPages: Array<{ page: string; views: number; duration: number }>;
  topEvents: Array<{ eventName: string; count: number }>;
}

export interface PagePerformance {
  page: string;
  avgLoadTime: number;
  avgInteractiveTime: number;
  avgFirstContentfulPaint: number;
  avgLargestContentfulPaint: number;
  totalErrors: number;
  errorRate: number;
  averageSessionDuration: number;
}

export interface ApiPerformance {
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  avgResponseTime: number;
  errorRate: number;
  totalCalls: number;
  p50ResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  successRate: number;
}

export interface SystemMetrics {
  timestamp: number;
  cpu: number;
  memory: number;
  disk: number;
  networkIn: number;
  networkOut: number;
  activeConnections: number;
  requestsPerSecond: number;
}

export interface PerformanceDashboardData {
  lastUpdated: number;
  timeRange: TimeRange;
  metrics: PerformanceMetric[];
  alerts: PerformanceAlert[];
  errorLogs: ErrorLog[];
  userAnalytics: UserAnalytics;
  pagePerformance: PagePerformance[];
  apiPerformance: ApiPerformance[];
  systemMetrics: SystemMetrics[];
}

export interface PerformanceReport {
  generatedAt: number;
  timeRange: TimeRange;
  summary: {
    overallScore: number;
    healthStatus: 'excellent' | 'good' | 'fair' | 'poor';
    criticalIssues: number;
    warnings: number;
  };
  metrics: PerformanceMetric[];
  topErrors: ErrorLog[];
  recommendations: string[];
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

export function getAlertLevelColor(level: AlertLevel): string {
  switch (level) {
    case AlertLevel.INFO:
      return 'blue';
    case AlertLevel.WARNING:
      return 'yellow';
    case AlertLevel.CRITICAL:
      return 'red';
  }
}

export function getErrorCategoryLabel(category: ErrorCategory): string {
  const labels: Record<ErrorCategory, string> = {
    [ErrorCategory.NETWORK]: 'Network Error',
    [ErrorCategory.CLIENT]: 'Client Error',
    [ErrorCategory.SERVER]: 'Server Error',
    [ErrorCategory.TIMEOUT]: 'Timeout Error',
    [ErrorCategory.VALIDATION]: 'Validation Error',
    [ErrorCategory.PERMISSION]: 'Permission Error',
    [ErrorCategory.NOT_FOUND]: 'Not Found',
    [ErrorCategory.CONFLICT]: 'Conflict',
    [ErrorCategory.UNKNOWN]: 'Unknown Error',
  };
  return labels[category];
}

export function getMetricTypeLabel(type: MetricType): string {
  const labels: Record<MetricType, string> = {
    [MetricType.CPU]: 'CPU Usage',
    [MetricType.MEMORY]: 'Memory Usage',
    [MetricType.DISK]: 'Disk Usage',
    [MetricType.NETWORK]: 'Network Usage',
    [MetricType.API_RESPONSE_TIME]: 'API Response Time',
    [MetricType.PAGE_LOAD_TIME]: 'Page Load Time',
    [MetricType.ERROR_RATE]: 'Error Rate',
    [MetricType.DATABASE_QUERY]: 'Database Query Time',
    [MetricType.BUNDLE_SIZE]: 'Bundle Size',
    [MetricType.LIGHTHOUSE_SCORE]: 'Lighthouse Score',
  };
  return labels[type];
}

export function formatMetricValue(value: number, unit: string): string {
  if (unit === '%') {
    return `${value.toFixed(1)}%`;
  }
  if (unit === 'ms') {
    return `${value.toFixed(0)}ms`;
  }
  if (unit === 'MB') {
    return `${value.toFixed(1)}MB`;
  }
  if (unit === 'Mbps') {
    return `${value.toFixed(1)}Mbps`;
  }
  if (unit === 'KB') {
    return `${(value / 1024).toFixed(1)}KB`;
  }
  return `${value.toFixed(2)}${unit}`;
}

export function calculateHealthScore(metrics: PerformanceMetric[]): number {
  if (metrics.length === 0) return 100;

  const healthScores = metrics.map((metric) => {
    if (metric.status === 'healthy') return 100;
    if (metric.status === 'warning') return 75;
    if (metric.status === 'critical') return 0;
    return 50;
  });

  const sum = healthScores.reduce((acc: number, score) => acc + score, 0);
  return Math.round(sum / healthScores.length);
}

export function generateMetricTrendAnalysis(
  metrics: PerformanceMetric[],
  timeRange: TimeRange
): string {
  const avgValue =
    metrics.reduce((sum, m) => sum + m.value, 0) / metrics.length;
  const criticalCount = metrics.filter((m) => m.status === 'critical').length;
  const warningCount = metrics.filter((m) => m.status === 'warning').length;

  if (criticalCount > 0) {
    return `⚠️ Critical: ${criticalCount} metrics exceed thresholds`;
  }
  if (warningCount > 0) {
    return `⚠️ Warning: ${warningCount} metrics near thresholds`;
  }
  return '✅ All metrics within normal range';
}

export function getTimeRangeLabel(timeRange: TimeRange): string {
  const labels: Record<TimeRange, string> = {
    [TimeRange.LAST_HOUR]: 'Last Hour',
    [TimeRange.LAST_24_HOURS]: 'Last 24 Hours',
    [TimeRange.LAST_7_DAYS]: 'Last 7 Days',
    [TimeRange.LAST_30_DAYS]: 'Last 30 Days',
    [TimeRange.LAST_90_DAYS]: 'Last 90 Days',
    [TimeRange.CUSTOM]: 'Custom Range',
  };
  return labels[timeRange];
}

export function getTimeRangeMilliseconds(timeRange: TimeRange): number {
  const now = Date.now();
  switch (timeRange) {
    case TimeRange.LAST_HOUR:
      return 1000 * 60 * 60;
    case TimeRange.LAST_24_HOURS:
      return 1000 * 60 * 60 * 24;
    case TimeRange.LAST_7_DAYS:
      return 1000 * 60 * 60 * 24 * 7;
    case TimeRange.LAST_30_DAYS:
      return 1000 * 60 * 60 * 24 * 30;
    case TimeRange.LAST_90_DAYS:
      return 1000 * 60 * 60 * 24 * 90;
    case TimeRange.CUSTOM:
      return 1000 * 60 * 60 * 24 * 30;
  }
}

export const DEFAULT_PERFORMANCE_THRESHOLDS = {
  [MetricType.CPU]: { warning: 70, critical: 90 },
  [MetricType.MEMORY]: { warning: 75, critical: 90 },
  [MetricType.DISK]: { warning: 80, critical: 95 },
  [MetricType.API_RESPONSE_TIME]: { warning: 1000, critical: 5000 },
  [MetricType.PAGE_LOAD_TIME]: { warning: 3000, critical: 10000 },
  [MetricType.ERROR_RATE]: { warning: 1, critical: 5 },
  [MetricType.DATABASE_QUERY]: { warning: 500, critical: 2000 },
  [MetricType.LIGHTHOUSE_SCORE]: { warning: 60, critical: 40 },
};

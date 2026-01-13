/**
 * Reporting & Analytics Configuration
 * Types, enums, utilities, and default settings for the analytics system
 */

/**
 * Report Types
 */
export enum ReportType {
  REVENUE = 'revenue',
  TRANSACTIONS = 'transactions',
  USERS = 'users',
  PERFORMANCE = 'performance',
  SECURITY = 'security',
  GOVERNANCE = 'governance',
  MERCHANT = 'merchant',
  CUSTOM = 'custom',
}

/**
 * Chart Types
 */
export enum ChartType {
  LINE = 'line',
  BAR = 'bar',
  AREA = 'area',
  PIE = 'pie',
  DOUGHNUT = 'doughnut',
  SCATTER = 'scatter',
  HEATMAP = 'heatmap',
  TABLE = 'table',
}

/**
 * Time Ranges
 */
export enum TimeRange {
  LAST_HOUR = 'last_hour',
  LAST_24H = 'last_24h',
  LAST_7D = 'last_7d',
  LAST_30D = 'last_30d',
  LAST_90D = 'last_90d',
  LAST_YEAR = 'last_year',
  CUSTOM = 'custom',
}

/**
 * Metric Types
 */
export enum MetricType {
  CURRENCY = 'currency',
  PERCENTAGE = 'percentage',
  NUMBER = 'number',
  DURATION = 'duration',
  RATE = 'rate',
}

/**
 * Data Aggregation Types
 */
export enum AggregationType {
  SUM = 'sum',
  AVERAGE = 'average',
  MIN = 'min',
  MAX = 'max',
  COUNT = 'count',
  DISTINCT = 'distinct',
}

/**
 * Export Formats
 */
export enum ExportFormat {
  CSV = 'csv',
  JSON = 'json',
  EXCEL = 'excel',
  PDF = 'pdf',
}

/**
 * Metric Data Point
 */
export interface MetricPoint {
  id: string;
  label: string;
  value: number;
  change: number; // Percentage change
  trend: 'up' | 'down' | 'neutral';
  format: MetricType;
  unit?: string; // $ for currency, % for percentage, etc.
  sparklineData?: number[]; // Historical data for sparkline
  status: 'healthy' | 'warning' | 'critical';
  lastUpdated: number;
}

/**
 * Chart Data Point
 */
export interface ChartDataPoint {
  x: string | number;
  y: number;
  value?: number; // Alternative to y
  label?: string;
}

/**
 * Chart Definition
 */
export interface Chart {
  id: string;
  label: string;
  type: ChartType;
  data: ChartDataPoint[];
  color?: string;
  compareColor?: string; // For comparison charts
  unit?: string;
  stacked?: boolean; // For bar/area charts
  showLegend?: boolean;
  showTooltip?: boolean;
  animationDuration?: number;
}

/**
 * Report Definition
 */
export interface Report {
  id: string;
  title: string;
  description?: string;
  type: ReportType;
  metrics: MetricPoint[];
  charts: Chart[];
  lastUpdated: number;
  updateInterval?: number; // ms for auto-refresh
  createdAt: number;
  updatedBy?: string;
}

/**
 * Query Filter
 */
export interface QueryFilter {
  field: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'in' | 'between';
  value: string | number | string[] | number[] | { start: number; end: number };
}

/**
 * Query Aggregation
 */
export interface QueryAggregation {
  field: string;
  type: AggregationType;
  alias?: string;
}

/**
 * Query Definition
 */
export interface Query {
  id: string;
  name: string;
  table: string;
  fields: string[];
  filters: QueryFilter[];
  aggregations: QueryAggregation[];
  groupBy?: string[];
  orderBy?: { field: string; direction: 'asc' | 'desc' }[];
  limit?: number;
  offset?: number;
}

/**
 * Export Configuration
 */
export interface ExportConfig {
  format: ExportFormat;
  filename: string;
  title?: string;
  includeMetadata?: boolean;
  dateRange?: { start: number; end: number };
  selectedFields?: string[];
}

/**
 * Real-time Metric Update
 */
export interface RealtimeMetricUpdate {
  id: string;
  timestamp: number;
  value: number;
  change?: number;
  status?: 'healthy' | 'warning' | 'critical';
}

/**
 * Dashboard Configuration
 */
export interface DashboardConfig {
  id: string;
  name: string;
  description?: string;
  reports: string[]; // Report IDs
  refreshInterval?: number;
  isPublic?: boolean;
  owner?: string;
  createdAt: number;
}

/**
 * Color Utilities
 */
export const chartColors = {
  revenue: '#10b981',
  transactions: '#3b82f6',
  users: '#8b5cf6',
  performance: '#f59e0b',
  security: '#ef4444',
  governance: '#6366f1',
  merchant: '#ec4899',
  custom: '#06b6d4',
};

export const trendColors = {
  up: '#10b981',
  down: '#ef4444',
  neutral: '#6b7280',
};

export const statusColors = {
  healthy: '#10b981',
  warning: '#f59e0b',
  critical: '#ef4444',
};

/**
 * Format Utilities
 */
export function formatMetricValue(
  value: number,
  format: MetricType,
  decimals: number = 2
): string {
  switch (format) {
    case MetricType.CURRENCY:
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }).format(value);

    case MetricType.PERCENTAGE:
      return `${value.toFixed(decimals)}%`;

    case MetricType.DURATION:
      const seconds = Math.round(value);
      if (seconds < 60) return `${seconds}s`;
      if (seconds < 3600) return `${(seconds / 60).toFixed(1)}m`;
      return `${(seconds / 3600).toFixed(1)}h`;

    case MetricType.RATE:
      return `${value.toFixed(decimals)}/s`;

    default: // NUMBER
      return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: decimals,
      }).format(value);
  }
}

/**
 * Format Trend Value
 */
export function formatTrendValue(change: number): string {
  const sign = change > 0 ? '+' : '';
  return `${sign}${change.toFixed(1)}%`;
}

/**
 * Get Trend Direction
 */
export function getTrendDirection(change: number): 'up' | 'down' | 'neutral' {
  if (change > 0) return 'up';
  if (change < 0) return 'down';
  return 'neutral';
}

/**
 * Get Status Color
 */
export function getStatusColor(status: 'healthy' | 'warning' | 'critical'): string {
  return statusColors[status];
}

/**
 * Get Trend Color
 */
export function getTrendColor(trend: 'up' | 'down' | 'neutral'): string {
  return trendColors[trend];
}

/**
 * Get Report Type Color
 */
export function getReportTypeColor(type: ReportType): string {
  return chartColors[type] || chartColors.custom;
}

/**
 * Format Date Range
 */
export function formatDateRange(range: TimeRange, customStart?: number, customEnd?: number): string {
  switch (range) {
    case TimeRange.LAST_HOUR:
      return 'Last Hour';
    case TimeRange.LAST_24H:
      return 'Last 24 Hours';
    case TimeRange.LAST_7D:
      return 'Last 7 Days';
    case TimeRange.LAST_30D:
      return 'Last 30 Days';
    case TimeRange.LAST_90D:
      return 'Last 90 Days';
    case TimeRange.LAST_YEAR:
      return 'Last Year';
    case TimeRange.CUSTOM:
      if (customStart && customEnd) {
        const start = new Date(customStart).toLocaleDateString();
        const end = new Date(customEnd).toLocaleDateString();
        return `${start} - ${end}`;
      }
      return 'Custom Range';
    default:
      return 'Unknown Range';
  }
}

/**
 * Get Date Range Timestamps
 */
export function getDateRangeTimestamps(range: TimeRange): { start: number; end: number } {
  const now = Date.now();
  const oneHour = 60 * 60 * 1000;
  const oneDay = 24 * oneHour;

  switch (range) {
    case TimeRange.LAST_HOUR:
      return { start: now - oneHour, end: now };
    case TimeRange.LAST_24H:
      return { start: now - oneDay, end: now };
    case TimeRange.LAST_7D:
      return { start: now - oneDay * 7, end: now };
    case TimeRange.LAST_30D:
      return { start: now - oneDay * 30, end: now };
    case TimeRange.LAST_90D:
      return { start: now - oneDay * 90, end: now };
    case TimeRange.LAST_YEAR:
      return { start: now - oneDay * 365, end: now };
    default:
      return { start: now - oneDay * 30, end: now };
  }
}

/**
 * Default Report Templates
 */
export const defaultReports: Report[] = [
  {
    id: 'revenue-overview',
    title: 'Revenue Overview',
    type: ReportType.REVENUE,
    metrics: [
      {
        id: 'total-revenue',
        label: 'Total Revenue',
        value: 125000,
        change: 15.5,
        trend: 'up',
        format: MetricType.CURRENCY,
        unit: '$',
        status: 'healthy',
        lastUpdated: Date.now(),
      },
      {
        id: 'avg-transaction',
        label: 'Avg Transaction',
        value: 245.5,
        change: 3.2,
        trend: 'up',
        format: MetricType.CURRENCY,
        unit: '$',
        status: 'healthy',
        lastUpdated: Date.now(),
      },
      {
        id: 'growth-rate',
        label: 'Growth Rate',
        value: 12.8,
        change: 2.1,
        trend: 'up',
        format: MetricType.PERCENTAGE,
        unit: '%',
        status: 'healthy',
        lastUpdated: Date.now(),
      },
    ],
    charts: [
      {
        id: 'revenue-trend',
        label: 'Revenue Trend',
        type: ChartType.LINE,
        color: '#10b981',
        data: [
          { x: 'Jan', y: 100000 },
          { x: 'Feb', y: 110000 },
          { x: 'Mar', y: 125000 },
          { x: 'Apr', y: 118000 },
          { x: 'May', y: 135000 },
        ],
        unit: '$',
      },
    ],
    lastUpdated: Date.now(),
    createdAt: Date.now(),
  },
];

/**
 * Sample Query for Revenue Report
 */
export const sampleRevenueQuery: Query = {
  id: 'revenue-query',
  name: 'Total Revenue',
  table: 'transactions',
  fields: ['amount', 'timestamp', 'status'],
  filters: [
    {
      field: 'status',
      operator: 'equals',
      value: 'completed',
    },
  ],
  aggregations: [
    {
      field: 'amount',
      type: AggregationType.SUM,
      alias: 'total_revenue',
    },
  ],
  groupBy: ['DATE(timestamp)'],
  orderBy: [{ field: 'timestamp', direction: 'desc' }],
  limit: 30,
};

/**
 * Sample Metric Sparkline Data
 */
export function generateSparklineData(days: number = 7): number[] {
  return Array.from({ length: days }, () => Math.random() * 100);
}

'use client';

/**
 * Analytics System
 * 
 * Comprehensive analytics for tracking user activity, engagement, and platform metrics.
 */

import { useState, useEffect, useCallback } from 'react';
import { logger } from '@/lib/logger';
import { safeLocalStorage } from '@/lib/utils';

// ============================================================================
// Types & Interfaces
// ============================================================================

export enum MetricType {
  // User Metrics
  USER_SIGNUP = 'user_signup',
  USER_LOGIN = 'user_login',
  USER_PROFILE_VIEW = 'user_profile_view',
  USER_PROFILE_EDIT = 'user_profile_edit',
  
  // Message Metrics
  MESSAGE_SENT = 'message_sent',
  MESSAGE_EDITED = 'message_edited',
  MESSAGE_DELETED = 'message_deleted',
  MESSAGE_REACTION = 'message_reaction',
  
  // Group Metrics
  GROUP_CREATED = 'group_created',
  GROUP_JOINED = 'group_joined',
  GROUP_LEFT = 'group_left',
  GROUP_INVITE_CREATED = 'group_invite_created',
  GROUP_INVITE_USED = 'group_invite_used',
  
  // Engagement Metrics
  SESSION_START = 'session_start',
  SESSION_END = 'session_end',
  PAGE_VIEW = 'page_view',
  SEARCH_QUERY = 'search_query',
  
  // Badge Metrics
  BADGE_EARNED = 'badge_earned',
  BADGE_VIEWED = 'badge_viewed',
  
  // Performance Metrics
  PAGE_LOAD_TIME = 'page_load_time',
  API_RESPONSE_TIME = 'api_response_time',
  ERROR_OCCURRED = 'error_occurred',
}

export interface AnalyticsEvent {
  id: string;
  type: MetricType;
  userId?: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface TimeSeriesData {
  timestamp: number;
  value: number;
}

export interface MetricSummary {
  type: MetricType;
  count: number;
  uniqueUsers?: number;
  trend?: 'up' | 'down' | 'stable';
  percentChange?: number;
}

export interface UserAnalytics {
  userId: string;
  totalMessages: number;
  totalGroups: number;
  totalBadges: number;
  totalReactions: number;
  averageSessionDuration: number;
  lastActive: number;
  joinedAt: number;
}

export interface GroupAnalytics {
  groupId: string;
  memberCount: number;
  messageCount: number;
  activeMembers: number;
  averageMessagesPerDay: number;
  topContributors: Array<{ userId: string; messageCount: number }>;
}

export interface PlatformAnalytics {
  totalUsers: number;
  activeUsers: number;
  totalMessages: number;
  totalGroups: number;
  totalBadges: number;
  averageSessionDuration: number;
  peakHours: number[];
}

export enum TimeRange {
  HOUR = '1h',
  DAY = '24h',
  WEEK = '7d',
  MONTH = '30d',
  YEAR = '1y',
  ALL = 'all',
}

// ============================================================================
// Client Storage + Backend Ingestion
// ============================================================================

const ANALYTICS_STORAGE_KEY = 'vfide:analytics:events';
const MAX_LOCAL_ANALYTICS_EVENTS = 500;

const analyticsStore = new Map<string, AnalyticsEvent>();
let analyticsStoreInitialized = false;
let eventIdCounter = 0;

function isBrowserRuntime(): boolean {
  return typeof window !== 'undefined';
}

function toValidEvent(value: unknown): AnalyticsEvent | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  if (typeof input.id !== 'string' || typeof input.type !== 'string' || typeof input.timestamp !== 'number') {
    return null;
  }

  return {
    id: input.id,
    type: input.type as MetricType,
    userId: typeof input.userId === 'string' ? input.userId : undefined,
    timestamp: input.timestamp,
    metadata: input.metadata && typeof input.metadata === 'object' && !Array.isArray(input.metadata)
      ? (input.metadata as Record<string, unknown>)
      : undefined,
  };
}

function initializeAnalyticsStore(): void {
  if (analyticsStoreInitialized) return;
  analyticsStoreInitialized = true;

  if (!isBrowserRuntime()) return;

  try {
    const serialized = safeLocalStorage.getItem(ANALYTICS_STORAGE_KEY);
    if (!serialized) return;

    const parsed = JSON.parse(serialized) as unknown;
    if (!Array.isArray(parsed)) return;

    for (const row of parsed) {
      const event = toValidEvent(row);
      if (event) {
        analyticsStore.set(event.id, event);
      }
    }

    eventIdCounter = analyticsStore.size;
  } catch (err) {
    logger.warn('Analytics local store initialization failed:', err);
  }
}

function persistAnalyticsStore(): void {
  if (!isBrowserRuntime()) return;

  try {
    const latestEvents = Array.from(analyticsStore.values())
      .sort((a, b) => a.timestamp - b.timestamp)
      .slice(-MAX_LOCAL_ANALYTICS_EVENTS);
    safeLocalStorage.setItem(ANALYTICS_STORAGE_KEY, JSON.stringify(latestEvents));
  } catch (err) {
    logger.warn('Analytics local store persistence failed:', err);
  }
}

async function sendEventToBackend(event: AnalyticsEvent): Promise<void> {
  if (!isBrowserRuntime()) return;

  const payload = {
    userId: event.userId,
    eventType: event.type,
    eventData: event.metadata ?? {},
  };

  try {
    await fetch('/api/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      keepalive: true,
      body: JSON.stringify(payload),
    });
  } catch (err) {
    logger.debug('Analytics backend ingestion skipped:', err);
  }
}

// ============================================================================
// Event Tracking Functions
// ============================================================================

/**
 * Track an analytics event
 */
export function trackEvent(
  type: MetricType,
  userId?: string,
  metadata?: Record<string, unknown>
): AnalyticsEvent {
  initializeAnalyticsStore();

  const event: AnalyticsEvent = {
    id: `evt_${Date.now()}_${++eventIdCounter}`,
    type,
    userId,
    timestamp: Date.now(),
    metadata,
  };

  analyticsStore.set(event.id, event);
  persistAnalyticsStore();
  void sendEventToBackend(event);
  
  return event;
}

/**
 * Track page view
 */
export function trackPageView(path: string, userId?: string) {
  return trackEvent(MetricType.PAGE_VIEW, userId, { path });
}

/**
 * Track search query
 */
export function trackSearch(query: string, results: number, userId?: string) {
  return trackEvent(MetricType.SEARCH_QUERY, userId, { query, results });
}

/**
 * Track performance metric
 */
export function trackPerformance(
  metric: 'page_load' | 'api_response',
  duration: number,
  metadata?: Record<string, any>
) {
  const type = metric === 'page_load' 
    ? MetricType.PAGE_LOAD_TIME 
    : MetricType.API_RESPONSE_TIME;
  
  return trackEvent(type, undefined, { duration, ...metadata });
}

/**
 * Track error
 */
export function trackError(
  error: Error | string,
  severity: 'low' | 'medium' | 'high',
  userId?: string
) {
  const message = typeof error === 'string' ? error : error.message;
  const stack = typeof error === 'string' ? undefined : error.stack;
  
  return trackEvent(MetricType.ERROR_OCCURRED, userId, {
    message,
    stack,
    severity,
  });
}

// ============================================================================
// Data Aggregation Functions
// ============================================================================

/**
 * Get events within a time range
 */
export function getEventsInRange(
  startTime: number,
  endTime: number,
  type?: MetricType,
  userId?: string
): AnalyticsEvent[] {
  initializeAnalyticsStore();

  const events: AnalyticsEvent[] = [];
  
  analyticsStore.forEach((event) => {
    if (event.timestamp >= startTime && event.timestamp <= endTime) {
      if (!type || event.type === type) {
        if (!userId || event.userId === userId) {
          events.push(event);
        }
      }
    }
  });
  
  return events.sort((a, b) => a.timestamp - b.timestamp);
}

/**
 * Get time range boundaries
 */
export function getTimeRangeBounds(range: TimeRange): { start: number; end: number } {
  const end = Date.now();
  let start = end;
  
  switch (range) {
    case TimeRange.HOUR:
      start = end - 60 * 60 * 1000;
      break;
    case TimeRange.DAY:
      start = end - 24 * 60 * 60 * 1000;
      break;
    case TimeRange.WEEK:
      start = end - 7 * 24 * 60 * 60 * 1000;
      break;
    case TimeRange.MONTH:
      start = end - 30 * 24 * 60 * 60 * 1000;
      break;
    case TimeRange.YEAR:
      start = end - 365 * 24 * 60 * 60 * 1000;
      break;
    case TimeRange.ALL:
      start = 0;
      break;
  }
  
  return { start, end };
}

/**
 * Count events by type
 */
export function countEvents(
  type: MetricType,
  range: TimeRange = TimeRange.DAY,
  userId?: string
): number {
  const { start, end } = getTimeRangeBounds(range);
  const events = getEventsInRange(start, end, type, userId);
  return events.length;
}

/**
 * Get unique users for event type
 */
export function getUniqueUsers(
  type: MetricType,
  range: TimeRange = TimeRange.DAY
): Set<string> {
  const { start, end } = getTimeRangeBounds(range);
  const events = getEventsInRange(start, end, type);
  const users = new Set<string>();
  
  events.forEach((event) => {
    if (event.userId) {
      users.add(event.userId);
    }
  });
  
  return users;
}

/**
 * Get time series data
 */
export function getTimeSeriesData(
  type: MetricType,
  range: TimeRange,
  interval: number, // in milliseconds
  userId?: string
): TimeSeriesData[] {
  const { start, end } = getTimeRangeBounds(range);
  const events = getEventsInRange(start, end, type, userId);
  
  // Create buckets
  const buckets = new Map<number, number>();
  const bucketCount = Math.ceil((end - start) / interval);
  
  for (let i = 0; i < bucketCount; i++) {
    const bucketStart = start + i * interval;
    buckets.set(bucketStart, 0);
  }
  
  // Fill buckets
  events.forEach((event) => {
    const bucketIndex = Math.floor((event.timestamp - start) / interval);
    const bucketStart = start + bucketIndex * interval;
    buckets.set(bucketStart, (buckets.get(bucketStart) || 0) + 1);
  });
  
  // Convert to array
  return Array.from(buckets.entries())
    .map(([timestamp, value]) => ({ timestamp, value }))
    .sort((a, b) => a.timestamp - b.timestamp);
}

/**
 * Calculate trend
 */
export function calculateTrend(
  type: MetricType,
  range: TimeRange
): { trend: 'up' | 'down' | 'stable'; percentChange: number } {
  const { start, end } = getTimeRangeBounds(range);
  const duration = end - start;
  const midpoint = start + duration / 2;
  
  const firstHalf = getEventsInRange(start, midpoint, type);
  const secondHalf = getEventsInRange(midpoint, end, type);
  
  if (firstHalf.length === 0) {
    return { trend: 'stable', percentChange: 0 };
  }
  
  const percentChange = ((secondHalf.length - firstHalf.length) / firstHalf.length) * 100;
  
  let trend: 'up' | 'down' | 'stable';
  if (percentChange > 5) {
    trend = 'up';
  } else if (percentChange < -5) {
    trend = 'down';
  } else {
    trend = 'stable';
  }
  
  return { trend, percentChange };
}

/**
 * Get metric summary
 */
export function getMetricSummary(
  type: MetricType,
  range: TimeRange = TimeRange.DAY
): MetricSummary {
  const count = countEvents(type, range);
  const uniqueUsers = getUniqueUsers(type, range).size;
  const { trend, percentChange } = calculateTrend(type, range);
  
  return {
    type,
    count,
    uniqueUsers,
    trend,
    percentChange,
  };
}

/**
 * Get user analytics
 */
export function getUserAnalytics(userId: string, range: TimeRange = TimeRange.ALL): UserAnalytics {
  const { start, end } = getTimeRangeBounds(range);
  const userEvents = getEventsInRange(start, end, undefined, userId);
  
  const totalMessages = userEvents.filter(e => e.type === MetricType.MESSAGE_SENT).length;
  const totalReactions = userEvents.filter(e => e.type === MetricType.MESSAGE_REACTION).length;
  const totalBadges = userEvents.filter(e => e.type === MetricType.BADGE_EARNED).length;
  
  const groupJoins = userEvents.filter(e => e.type === MetricType.GROUP_JOINED);
  const groupLeaves = userEvents.filter(e => e.type === MetricType.GROUP_LEFT);
  const totalGroups = groupJoins.length - groupLeaves.length;
  
  // Calculate session duration
  const sessions = userEvents.filter(e => 
    e.type === MetricType.SESSION_START || e.type === MetricType.SESSION_END
  );
  const sessionDurations: number[] = [];
  for (let i = 0; i < sessions.length - 1; i++) {
    const currentSession = sessions[i];
    const nextSession = sessions[i + 1];
    if (currentSession?.type === MetricType.SESSION_START && 
        nextSession?.type === MetricType.SESSION_END) {
      sessionDurations.push(nextSession.timestamp - currentSession.timestamp);
    }
  }
  const averageSessionDuration = sessionDurations.length > 0
    ? sessionDurations.reduce((a, b) => a + b, 0) / sessionDurations.length
    : 0;
  
  const lastActive = userEvents.length > 0 
    ? Math.max(...userEvents.map(e => e.timestamp))
    : 0;
  
  const joinedAt = userEvents.find(e => e.type === MetricType.USER_SIGNUP)?.timestamp || 0;
  
  return {
    userId,
    totalMessages,
    totalGroups,
    totalBadges,
    totalReactions,
    averageSessionDuration,
    lastActive,
    joinedAt,
  };
}

/**
 * Get platform analytics
 */
export function getPlatformAnalytics(range: TimeRange = TimeRange.DAY): PlatformAnalytics {
  const { start, end } = getTimeRangeBounds(range);
  const events = getEventsInRange(start, end);
  
  const uniqueUsers = new Set<string>();
  events.forEach(e => e.userId && uniqueUsers.add(e.userId));
  
  const totalMessages = events.filter(e => e.type === MetricType.MESSAGE_SENT).length;
  const totalGroups = events.filter(e => e.type === MetricType.GROUP_CREATED).length;
  const totalBadges = events.filter(e => e.type === MetricType.BADGE_EARNED).length;
  
  // Calculate peak hours
  const hourCounts = new Array(24).fill(0);
  events.forEach(e => {
    const hour = new Date(e.timestamp).getHours();
    hourCounts[hour]++;
  });
  const maxCount = Math.max(...hourCounts);
  const peakHours = hourCounts
    .map((count, hour) => ({ hour, count }))
    .filter(({ count }) => count === maxCount)
    .map(({ hour }) => hour);
  
  // Average session duration
  const sessions = events.filter(e => 
    e.type === MetricType.SESSION_START || e.type === MetricType.SESSION_END
  );
  const sessionDurations: number[] = [];
  for (let i = 0; i < sessions.length - 1; i++) {
    const currentSession = sessions[i];
    const nextSession = sessions[i + 1];
    if (currentSession?.type === MetricType.SESSION_START && 
        nextSession?.type === MetricType.SESSION_END) {
      sessionDurations.push(nextSession.timestamp - currentSession.timestamp);
    }
  }
  const averageSessionDuration = sessionDurations.length > 0
    ? sessionDurations.reduce((a, b) => a + b, 0) / sessionDurations.length
    : 0;
  
  return {
    totalUsers: uniqueUsers.size,
    activeUsers: uniqueUsers.size,
    totalMessages,
    totalGroups,
    totalBadges,
    averageSessionDuration,
    peakHours,
  };
}

// ============================================================================
// React Hooks
// ============================================================================

/**
 * Hook to track page views automatically
 */
export function usePageTracking(userId?: string) {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      trackPageView(window.location.pathname, userId);
    }
  }, [userId]);
}

/**
 * Hook to get metric summary with auto-refresh
 */
export function useMetricSummary(
  type: MetricType,
  range: TimeRange = TimeRange.DAY,
  refreshInterval: number = 30000
) {
  const [summary, setSummary] = useState<MetricSummary | null>(null);
  const [loading, setLoading] = useState(true);
  
  const loadSummary = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/analytics/metrics?type=${type}&range=${range}`
      );
      const data = await response.json();
      
      if (data.success) {
        setSummary(data.summary);
      }
    } catch (err) {
      logger.error('Failed to load metric summary:', err);
    } finally {
      setLoading(false);
    }
  }, [type, range]);
  
  useEffect(() => {
    loadSummary();
    
    const interval = setInterval(loadSummary, refreshInterval);
    return () => clearInterval(interval);
  }, [loadSummary, refreshInterval]);
  
  return { summary, loading, reload: loadSummary };
}

/**
 * Hook to get time series data
 */
export function useTimeSeriesData(
  type: MetricType,
  range: TimeRange,
  refreshInterval: number = 30000
) {
  const [data, setData] = useState<TimeSeriesData[]>([]);
  const [loading, setLoading] = useState(true);
  
  const loadData = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/analytics/timeseries?type=${type}&range=${range}`
      );
      const result = await response.json();
      
      if (result.success) {
        setData(result.data);
      }
    } catch (err) {
      logger.error('Failed to load time series data:', err);
    } finally {
      setLoading(false);
    }
  }, [type, range]);
  
  useEffect(() => {
    loadData();
    
    const interval = setInterval(loadData, refreshInterval);
    return () => clearInterval(interval);
  }, [loadData, refreshInterval]);
  
  return { data, loading, reload: loadData };
}

/**
 * Hook to get platform analytics
 */
export function usePlatformAnalytics(
  range: TimeRange = TimeRange.DAY,
  refreshInterval: number = 60000
) {
  const [analytics, setAnalytics] = useState<PlatformAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  
  const loadAnalytics = useCallback(async () => {
    try {
      const response = await fetch(`/api/analytics/platform?range=${range}`);
      const data = await response.json();
      
      if (data.success) {
        setAnalytics(data.analytics);
      }
    } catch (err) {
      logger.error('Failed to load platform analytics:', err);
    } finally {
      setLoading(false);
    }
  }, [range]);
  
  useEffect(() => {
    loadAnalytics();
    
    const interval = setInterval(loadAnalytics, refreshInterval);
    return () => clearInterval(interval);
  }, [loadAnalytics, refreshInterval]);
  
  return { analytics, loading, reload: loadAnalytics };
}

/**
 * Format duration for display
 */
export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

/**
 * Format number with k/m suffix
 */
export function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

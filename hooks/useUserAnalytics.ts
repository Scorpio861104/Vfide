/**
import { log } from '@/lib/logging';
 * useUserAnalytics Hook
 * Track user behavior, sessions, and engagement metrics
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import { AnalyticsEvent, UserAnalytics } from '@/config/performance-dashboard';

interface UseUserAnalyticsResult {
  events: AnalyticsEvent[];
  analytics: UserAnalytics;
  trackEvent: (event: Omit<AnalyticsEvent, 'id' | 'timestamp'>) => void;
  getSessionMetrics: () => UserAnalytics;
  getEventsByPage: (page: string) => AnalyticsEvent[];
  getEventsByCategory: (category: string) => AnalyticsEvent[];
  exportAnalytics: (format: 'json' | 'csv') => string;
}

const STORAGE_KEY = 'analytics_events_v1';
const SESSION_KEY = 'session_id_v1';
const MAX_EVENTS = 1000;

function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return '';

  let sessionId = sessionStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem(SESSION_KEY, sessionId);
  }
  return sessionId;
}

export function useUserAnalytics(): UseUserAnalyticsResult {
  const [events, setEvents] = useState<AnalyticsEvent[]>([]);
  const [analytics, setAnalytics] = useState<UserAnalytics>({
    totalUsers: 0,
    activeUsers: 0,
    sessionsToday: 0,
    averageSessionDuration: 0,
    bounceRate: 0,
    conversionRate: 0,
    topPages: [],
    topEvents: [],
  });

  const sessionId = getOrCreateSessionId();

  // Load events from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setEvents(Array.isArray(parsed) ? parsed : []);
      }
    } catch (e) {
      log.error('Failed to load analytics events:', e);
    }
  }, []);

  // Save events to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
    } catch (e) {
      log.error('Failed to save analytics events:', e);
    }
  }, [events]);

  // Track a user event
  const trackEvent = useCallback(
    (eventData: Omit<AnalyticsEvent, 'id' | 'timestamp'>) => {
      const newEvent: AnalyticsEvent = {
        ...eventData,
        id: `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        sessionId,
      };

      setEvents((prev) => {
        const updated = [newEvent, ...prev];
        return updated.slice(0, MAX_EVENTS);
      });
    },
    [sessionId]
  );

  // Get session metrics
  const getSessionMetrics = useCallback((): UserAnalytics => {
    // Calculate total users (simulated - unique session IDs)
    const uniqueSessions = new Set(events.map((e) => e.sessionId)).size;

    // Calculate active users (last 30 minutes)
    const thirtyMinutesAgo = Date.now() - 30 * 60 * 1000;
    const activeUserSessions = new Set(
      events
        .filter((e) => e.timestamp > thirtyMinutesAgo)
        .map((e) => e.sessionId)
    ).size;

    // Calculate sessions today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const sessionsToday = new Set(
      events
        .filter((e) => e.timestamp >= todayStart.getTime())
        .map((e) => e.sessionId)
    ).size;

    // Calculate average session duration
    const sessionDurations: Record<string, { start: number; end: number }> = {};
    events.forEach((event) => {
      if (!sessionDurations[event.sessionId]) {
        sessionDurations[event.sessionId] = {
          start: event.timestamp,
          end: event.timestamp,
        };
      }
      const session = sessionDurations[event.sessionId];
      if (session) {
        session.end = Math.max(
          session.end,
          event.timestamp
        );
      }
    });

    const avgDuration =
      Object.values(sessionDurations).length > 0
        ? Object.values(sessionDurations).reduce(
            (sum, { start, end }) => sum + (end - start),
            0
          ) / Object.values(sessionDurations).length
        : 0;

    // Get top pages
    const pageViews: Record<string, number> = {};
    const pageDurations: Record<string, number[]> = {};

    events.forEach((event) => {
      pageViews[event.page] = (pageViews[event.page] || 0) + 1;
      if (event.duration) {
        if (!pageDurations[event.page]) pageDurations[event.page] = [];
        pageDurations[event.page]!.push(event.duration);
      }
    });

    const topPages = Object.entries(pageViews)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([page, views]) => ({
        page,
        views,
        duration:
          (pageDurations[page]?.reduce((a, b) => a + b, 0) ?? 0) /
          (pageDurations[page]?.length || 1),
      }));

    // Get top events
    const eventCounts: Record<string, number> = {};
    events.forEach((event) => {
      eventCounts[event.eventName] =
        (eventCounts[event.eventName] || 0) + 1;
    });

    const topEvents = Object.entries(eventCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([eventName, count]) => ({
        eventName,
        count,
      }));

    // Calculate bounce rate (single page visits / total sessions)
    const singlePageSessions = Object.values(sessionDurations).filter(
      ({ start, end }) => end - start < 10000
    ).length;
    const bounceRate =
      Object.values(sessionDurations).length > 0
        ? (singlePageSessions / Object.values(sessionDurations).length) * 100
        : 0;

    // Calculate conversion rate (mock - based on conversion events)
    const conversionEvents = events.filter(
      (e) => e.eventName.includes('conversion') || e.eventName.includes('purchase')
    ).length;
    const conversionRate =
      events.length > 0 ? (conversionEvents / events.length) * 100 : 0;

    return {
      totalUsers: uniqueSessions,
      activeUsers: activeUserSessions,
      sessionsToday,
      averageSessionDuration: avgDuration,
      bounceRate,
      conversionRate,
      topPages,
      topEvents,
    };
  }, [events]);

  // Get events by page
  const getEventsByPage = useCallback(
    (page: string) => {
      return events.filter((e) => e.page === page);
    },
    [events]
  );

  // Get events by category
  const getEventsByCategory = useCallback(
    (category: string) => {
      return events.filter((e) => e.category === category);
    },
    [events]
  );

  // Export analytics
  const exportAnalytics = useCallback(
    (format: 'json' | 'csv') => {
      if (format === 'json') {
        return JSON.stringify(
          {
            exportedAt: new Date().toISOString(),
            analytics: getSessionMetrics(),
            events: events.slice(0, 100), // Export last 100 events
          },
          null,
          2
        );
      } else {
        // CSV format
        const headers = [
          'Event Name',
          'Category',
          'Page',
          'Session ID',
          'User ID',
          'Timestamp',
          'Duration (ms)',
        ];
        const rows = events.slice(0, 100).map((event) => [
          event.eventName,
          event.category,
          event.page,
          event.sessionId,
          event.userId,
          new Date(event.timestamp).toISOString(),
          event.duration?.toString() || '',
        ]);

        const csv = [
          headers.join(','),
          ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
        ].join('\n');

        return csv;
      }
    },
    [events, getSessionMetrics]
  );

  // Update analytics on events change
  useEffect(() => {
    setAnalytics(getSessionMetrics());
  }, [events, getSessionMetrics]);

  // Track page views automatically
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const handlePageChange = () => {
        trackEvent({
          eventName: 'page_view',
          category: 'navigation',
          userId: 'anonymous',
          sessionId,
          page: window.location.pathname,
          metadata: {
            referrer: document.referrer,
            title: document.title,
          },
        });
      };

      window.addEventListener('popstate', handlePageChange);
      return () => window.removeEventListener('popstate', handlePageChange);
    }
    return undefined;
  }, [trackEvent, sessionId]);

  return {
    events,
    analytics,
    trackEvent,
    getSessionMetrics,
    getEventsByPage,
    getEventsByCategory,
    exportAnalytics,
  };
}

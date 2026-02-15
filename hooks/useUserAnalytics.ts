/**
 * useUserAnalytics Hook
 * Track user behavior, sessions, and engagement metrics
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { AnalyticsEvent, UserAnalytics } from '@/config/performance-dashboard';
import { buildCsrfHeaders } from '@/lib/security/csrfClient';

interface UseUserAnalyticsResult {
  events: AnalyticsEvent[];
  analytics: UserAnalytics;
  trackEvent: (event: Omit<AnalyticsEvent, 'id' | 'timestamp'>) => void;
  getSessionMetrics: () => UserAnalytics;
  getEventsByPage: (page: string) => AnalyticsEvent[];
  getEventsByCategory: (category: string) => AnalyticsEvent[];
  exportAnalytics: (format: 'json' | 'csv') => string;
}

const SESSION_KEY = 'session_id_v1';
const MAX_EVENTS = 1000;

function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return '';

  let sessionId = sessionStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId = `session-${Date.now()}-${Array.from(crypto.getRandomValues(new Uint8Array(7)), b => b.toString(16).padStart(2, '0')).join('').slice(0, 9)}`;
    sessionStorage.setItem(SESSION_KEY, sessionId);
  }
  return sessionId;
}

export function useUserAnalytics(): UseUserAnalyticsResult {
  const { address } = useAccount();
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

  const mapApiEvent = useCallback((event: Record<string, unknown>): AnalyticsEvent => {
    const data = typeof event?.event_data === 'string'
      ? (() => {
          try {
            return JSON.parse(event.event_data);
          } catch {
            return {} as Record<string, unknown>;
          }
        })()
      : (event?.event_data ?? {});

    return {
      id: String(event.id ?? `event-${Date.now()}`),
      eventName: data.eventName ?? event.event_type ?? 'event',
      category: data.category ?? 'general',
      userId: data.userId ?? event.user_id ?? '',
      sessionId: data.sessionId ?? sessionId,
      timestamp: event.timestamp ? new Date(event.timestamp).getTime() : Date.now(),
      duration: data.duration,
      metadata: data.metadata ?? {},
      page: data.page ?? 'unknown',
    };
  }, [sessionId]);

  // Load events from API on mount
  useEffect(() => {
    if (!address) return;

    let isMounted = true;

    const loadEvents = async () => {
      try {
        const response = await fetch(`/api/analytics?userId=${address}&limit=1000`);
        if (!response.ok) throw new Error('Failed to fetch analytics');
        const data = await response.json();
        const items = Array.isArray(data.events) ? data.events : [];
        if (isMounted) {
          setEvents(items.map(mapApiEvent).slice(0, MAX_EVENTS));
        }
      } catch (e) {
        console.error('Failed to load analytics events:', e);
        if (isMounted) setEvents([]);
      }
    };

    loadEvents();

    return () => {
      isMounted = false;
    };
  }, [address, mapApiEvent]);

  // Track a user event
  const trackEvent = useCallback(
    (eventData: Omit<AnalyticsEvent, 'id' | 'timestamp'>) => {
      const newEvent: AnalyticsEvent = {
        ...eventData,
        id: `event-${Date.now()}-${Array.from(crypto.getRandomValues(new Uint8Array(7)), b => b.toString(16).padStart(2, '0')).join('').slice(0, 9)}`,
        timestamp: Date.now(),
        sessionId,
      };

      setEvents((prev) => {
        const updated = [newEvent, ...prev];
        return updated.slice(0, MAX_EVENTS);
      });

      void buildCsrfHeaders({ 'Content-Type': 'application/json' }, 'POST')
        .then((headers) =>
          fetch('/api/analytics', {
            method: 'POST',
            headers,
            credentials: 'include',
            body: JSON.stringify({
              userId: eventData.userId || address || '',
              eventType: eventData.eventName,
              eventData: {
                ...eventData,
                sessionId,
              },
            }),
          })
        )
        .catch((error) => {
          console.error('Failed to track analytics event:', error);
        });
    },
    [sessionId, address]
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

    // Calculate conversion rate (based on conversion events)
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

  useEffect(() => {
    setAnalytics(getSessionMetrics());
  }, [events, getSessionMetrics]);

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

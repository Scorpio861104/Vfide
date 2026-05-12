/**
 * useNotificationHub Hook
 *
 * Centralized notification management. The server is the source of truth
 * for the user's own notifications via /api/notifications; localStorage
 * is used as an offline cache and to persist client-side preferences
 * (the API doesn't yet store per-channel/per-type preferences).
 *
 * Adapts the flat server shape (id, type:string, title, message, data,
 * is_read, created_at) into the richer UI shape defined in
 * config/notification-hub.ts.
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAccount } from 'wagmi';
import { safeLocalStorage } from '@/lib/utils';
import type {
  Notification,
  NotificationPreference,
  NotificationFilter,
} from '@/config/notification-hub';
import {
  NotificationStatus,
  NotificationStats,
  NotificationType,
  NotificationSeverity,
  DeliveryChannel,
  NotificationPriority,
  DEFAULT_NOTIFICATION_PREFERENCES,
  calculateNotificationStats,
  groupNotificationsByType as _groupNotificationsByType,
} from '@/config/notification-hub';
import { logger } from '@/lib/logger';

interface UseNotificationHubResult {
  notifications: Notification[];
  stats: NotificationStats;
  isLoading: boolean;
  error: Error | null;

  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'status'>) => void;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  dismissNotification: (notificationId: string) => void;
  clearNotifications: () => void;

  filterNotifications: (filter: NotificationFilter) => Notification[];
  searchNotifications: (query: string) => Notification[];
  getByType: (type: NotificationType) => Notification[];

  preferences: Record<NotificationType, NotificationPreference>;
  updatePreference: (type: NotificationType, preference: Partial<NotificationPreference>) => void;
  resetPreferences: () => void;

  addDeliveryChannel: (channel: DeliveryChannel, value: string) => Promise<void>;
  removeDeliveryChannel: (channel: DeliveryChannel) => void;

  exportNotifications: (format: 'json' | 'csv') => string;
  archiveOldNotifications: (daysOld: number) => number;

  refresh: () => Promise<void>;
}

// Per-wallet cache key — switching wallets in the same browser must not
// leak between accounts.
const STORAGE_PREFIX = 'notifications_v2';
const PREFS_STORAGE_KEY = 'notification_preferences_v2';
const MAX_NOTIFICATIONS = 1000;

function cacheKeyFor(address: string | undefined): string | null {
  if (!address) return null;
  return `${STORAGE_PREFIX}:${address.toLowerCase()}`;
}

// ── Adapter: API row → UI Notification ──────────────────────────────────────

interface ApiNotification {
  id: number;
  user_id: number;
  type: string;
  title: string;
  message: string;
  data: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
  updated_at: string;
}

const VALID_TYPES = new Set<string>(Object.values(NotificationType));

function mapApiType(t: string): NotificationType {
  return VALID_TYPES.has(t) ? (t as NotificationType) : NotificationType.SYSTEM;
}

function defaultSeverityFor(t: NotificationType): NotificationSeverity {
  switch (t) {
    case NotificationType.SECURITY:    return NotificationSeverity.HIGH;
    case NotificationType.ALERT:       return NotificationSeverity.HIGH;
    case NotificationType.TRANSACTION: return NotificationSeverity.MEDIUM;
    case NotificationType.GOVERNANCE:  return NotificationSeverity.MEDIUM;
    default:                           return NotificationSeverity.LOW;
  }
}

function defaultIconFor(t: NotificationType): string {
  switch (t) {
    case NotificationType.TRANSACTION: return '💸';
    case NotificationType.SECURITY:    return '🛡️';
    case NotificationType.GOVERNANCE:  return '🗳️';
    case NotificationType.REWARD:      return '🎁';
    case NotificationType.ALERT:       return '⚠️';
    case NotificationType.SOCIAL:      return '👋';
    case NotificationType.MARKET:      return '📈';
    default:                           return '🔔';
  }
}

function defaultColorFor(s: NotificationSeverity): string {
  switch (s) {
    case NotificationSeverity.CRITICAL: return '#EF4444';
    case NotificationSeverity.HIGH:     return '#F59E0B';
    case NotificationSeverity.MEDIUM:   return '#06B6D4';
    case NotificationSeverity.LOW:      return '#10B981';
  }
}

function fromApi(row: ApiNotification, userAddress: string): Notification {
  const type = mapApiType(row.type);
  const severity = defaultSeverityFor(type);
  const status = row.is_read ? NotificationStatus.READ : NotificationStatus.DELIVERED;
  const timestamp = new Date(row.created_at).getTime();
  const data = row.data ?? {};

  return {
    id: String(row.id),
    type,
    severity,
    title: row.title,
    message: row.message,
    description: typeof data.description === 'string' ? data.description : undefined,
    icon: typeof data.icon === 'string' ? data.icon : defaultIconFor(type),
    color: typeof data.color === 'string' ? data.color : defaultColorFor(severity),
    timestamp,
    userId: userAddress,
    status,
    priority: NotificationPriority.NORMAL,
    metadata: data,
    actionUrl: typeof data.actionUrl === 'string' ? data.actionUrl : undefined,
    actionLabel: typeof data.actionLabel === 'string' ? data.actionLabel : undefined,
    relatedId: typeof data.relatedId === 'string' ? data.relatedId : undefined,
    channels: [DeliveryChannel.IN_APP],
    deliveryStatus: {
      [DeliveryChannel.IN_APP]: status,
      [DeliveryChannel.EMAIL]: NotificationStatus.PENDING,
      [DeliveryChannel.SMS]: NotificationStatus.PENDING,
      [DeliveryChannel.PUSH]: NotificationStatus.PENDING,
      [DeliveryChannel.WEBHOOK]: NotificationStatus.PENDING,
    },
    readAt: row.is_read ? new Date(row.updated_at).getTime() : undefined,
  };
}

// ── Hook ────────────────────────────────────────────────────────────────────

export function useNotificationHub(): UseNotificationHubResult {
  const { address } = useAccount();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [preferences, setPreferences] = useState<Record<NotificationType, NotificationPreference>>(
    DEFAULT_NOTIFICATION_PREFERENCES,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const activeTimeouts = useRef<Set<NodeJS.Timeout>>(new Set());

  useEffect(() => {
    try {
      const stored = safeLocalStorage.getItem(PREFS_STORAGE_KEY);
      if (stored) setPreferences(JSON.parse(stored));
    } catch (e) {
      logger.error('[Notifications] Failed to load preferences:', e);
    }
  }, []);

  useEffect(() => {
    try {
      safeLocalStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(preferences));
    } catch (e) {
      logger.error('[Notifications] Failed to save preferences:', e);
    }
  }, [preferences]);

  const refresh = useCallback(async () => {
    if (!address) { setNotifications([]); return; }
    const key = cacheKeyFor(address);
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/notifications?userAddress=${address}&unreadOnly=false&limit=200`);
      if (response.ok) {
        const data = await response.json();
        const apiRows: ApiNotification[] = Array.isArray(data.notifications) ? data.notifications : [];
        const mapped = apiRows.map((r) => fromApi(r, address));
        setNotifications(mapped);
        if (key) safeLocalStorage.setItem(key, JSON.stringify(mapped));
        return;
      }
      if (response.status === 401 || response.status === 403) {
        const cached = key && safeLocalStorage.getItem(key);
        if (cached) {
          try { setNotifications(JSON.parse(cached)); } catch {}
        }
        return;
      }
      throw new Error(`API responded ${response.status}`);
    } catch (e) {
      logger.error('[Notifications] API load failed; falling back to cache:', e);
      setError(e instanceof Error ? e : new Error('Failed to load notifications'));
      const cached = key && safeLocalStorage.getItem(key);
      if (cached) {
        try { setNotifications(JSON.parse(cached)); } catch {}
      }
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  useEffect(() => { void refresh(); }, [refresh]);

  useEffect(() => {
    return () => {
      activeTimeouts.current.forEach(clearTimeout);
      activeTimeouts.current.clear();
    };
  }, []);

  const markAsRead = useCallback(async (notificationId: string) => {
    if (!address) return;
    setNotifications((prev) =>
      prev.map((n) => n.id === notificationId ? { ...n, status: NotificationStatus.READ, readAt: Date.now() } : n),
    );
    try {
      const id = Number(notificationId);
      if (!Number.isInteger(id)) return;
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationIds: [id] }),
      });
      if (!response.ok) throw new Error(`API ${response.status}`);
    } catch (e) {
      logger.error('[Notifications] markAsRead API failed, reverting:', e);
      await refresh();
    }
  }, [address, refresh]);

  const markAllAsRead = useCallback(async () => {
    if (!address) return;
    setNotifications((prev) =>
      prev.map((n) => n.status !== NotificationStatus.READ ? { ...n, status: NotificationStatus.READ, readAt: Date.now() } : n),
    );
    try {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllRead: true, userAddress: address.toLowerCase() }),
      });
      if (!response.ok) throw new Error(`API ${response.status}`);
    } catch (e) {
      logger.error('[Notifications] markAllAsRead API failed, reverting:', e);
      await refresh();
    }
  }, [address, refresh]);

  const dismissNotification = useCallback(async (notificationId: string) => {
    if (!address) return;
    setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
    const key = cacheKeyFor(address);
    if (key) {
      try {
        const cached = safeLocalStorage.getItem(key);
        if (cached) {
          const arr: Notification[] = JSON.parse(cached);
          safeLocalStorage.setItem(key, JSON.stringify(arr.filter((n) => n.id !== notificationId)));
        }
      } catch {}
    }
  }, [address]);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
    const key = cacheKeyFor(address);
    if (key) safeLocalStorage.removeItem(key);
  }, [address]);

  const addNotification = useCallback(
    (notificationData: Omit<Notification, 'id' | 'timestamp' | 'status'>) => {
      try {
        const newNotif: Notification = {
          ...notificationData,
          id: `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: Date.now(),
          status: NotificationStatus.DELIVERED,
          deliveryStatus: notificationData.channels.reduce(
            (acc, channel) => ({ ...acc, [channel]: NotificationStatus.DELIVERED }),
            notificationData.deliveryStatus ?? {} as Record<DeliveryChannel, NotificationStatus>,
          ),
        };
        setNotifications((prev) => [newNotif, ...prev].slice(0, MAX_NOTIFICATIONS));

        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
          new Notification(notificationData.title, {
            body: notificationData.message,
            icon: notificationData.icon,
            tag: newNotif.id,
          });
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to add notification'));
      }
    },
    [],
  );

  const filterNotifications = useCallback(
    (filter: NotificationFilter): Notification[] => {
      return notifications.filter((notif) => {
        if (filter.types && !filter.types.includes(notif.type)) return false;
        if (filter.severities && !filter.severities.includes(notif.severity)) return false;
        if (filter.statuses && !filter.statuses.includes(notif.status)) return false;
        if (filter.channels && !filter.channels.some((c) => notif.channels.includes(c))) return false;
        if (filter.dateRange) {
          if (notif.timestamp < filter.dateRange.start) return false;
          if (notif.timestamp > filter.dateRange.end) return false;
        }
        return true;
      });
    },
    [notifications],
  );

  const searchNotifications = useCallback(
    (query: string): Notification[] => {
      const q = query.toLowerCase().trim();
      if (!q) return notifications;
      return notifications.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          n.message.toLowerCase().includes(q) ||
          (n.description ?? '').toLowerCase().includes(q),
      );
    },
    [notifications],
  );

  const getByType = useCallback(
    (type: NotificationType): Notification[] => notifications.filter((n) => n.type === type),
    [notifications],
  );

  const updatePreference = useCallback(
    (type: NotificationType, partial: Partial<NotificationPreference>) => {
      setPreferences((prev) => ({ ...prev, [type]: { ...prev[type], ...partial } }));
    },
    [],
  );

  const resetPreferences = useCallback(() => {
    setPreferences(DEFAULT_NOTIFICATION_PREFERENCES);
  }, []);

  const addDeliveryChannel = useCallback(
    async (_channel: DeliveryChannel, _value: string): Promise<void> => {
      try {
        setIsLoading(true);
        await new Promise((r) => setTimeout(r, 500));
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const removeDeliveryChannel = useCallback((channel: DeliveryChannel) => {
    setPreferences((prev) =>
      Object.entries(prev).reduce(
        (acc, [type, pref]) => ({
          ...acc,
          [type]: { ...pref, channels: pref.channels.filter((c) => c !== channel) },
        }),
        {} as Record<NotificationType, NotificationPreference>,
      ),
    );
  }, []);

  const exportNotifications = useCallback(
    (format: 'json' | 'csv'): string => {
      if (format === 'json') {
        return JSON.stringify(
          {
            exportedAt: new Date().toISOString(),
            stats: calculateNotificationStats(notifications),
            notifications: notifications.slice(0, 100),
          },
          null,
          2,
        );
      }
      const headers = ['ID', 'Type', 'Severity', 'Title', 'Message', 'Status', 'Timestamp'];
      const rows = notifications.slice(0, 100).map((n) => [
        n.id,
        n.type,
        n.severity,
        `"${n.title.replace(/"/g, '""')}"`,
        `"${n.message.replace(/"/g, '""')}"`,
        n.status,
        new Date(n.timestamp).toISOString(),
      ]);
      return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    },
    [notifications],
  );

  const archiveOldNotifications = useCallback(
    (daysOld: number): number => {
      const cutoffTime = Date.now() - daysOld * 24 * 60 * 60 * 1000;
      const before = notifications.length;
      setNotifications((prev) =>
        prev.filter((n) => n.timestamp > cutoffTime || n.status !== NotificationStatus.READ),
      );
      return Math.max(0, before - notifications.length);
    },
    [notifications.length],
  );

  const stats = calculateNotificationStats(notifications);

  return {
    notifications,
    stats,
    isLoading,
    error,
    addNotification,
    markAsRead,
    markAllAsRead,
    dismissNotification,
    clearNotifications,
    filterNotifications,
    searchNotifications,
    getByType,
    preferences,
    updatePreference,
    resetPreferences,
    addDeliveryChannel,
    removeDeliveryChannel,
    exportNotifications,
    archiveOldNotifications,
    refresh,
  };
}

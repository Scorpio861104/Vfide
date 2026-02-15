/**
 * useNotificationHub Hook
 * Centralized notification management with preferences and delivery
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { buildCsrfHeaders } from '@/lib/security/csrfClient';
import type {
  Notification,
  NotificationPreference,
  NotificationFilter,
} from '@/config/notification-hub';
import {
  NotificationStatus,
  NotificationStats,
  NotificationType,
  NotificationSeverity as _NotificationSeverity,
  DeliveryChannel,
  DEFAULT_NOTIFICATION_PREFERENCES,
  calculateNotificationStats,
  getNotificationColor,
  getNotificationIcon,
  groupNotificationsByType as _groupNotificationsByType,
} from '@/config/notification-hub';

interface UseNotificationHubResult {
  notifications: Notification[];
  stats: NotificationStats;
  isLoading: boolean;
  error: Error | null;
  
  // Core operations
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'status'>) => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  dismissNotification: (notificationId: string) => Promise<void>;
  clearNotifications: () => Promise<void>;
  
  // Filtering and search
  filterNotifications: (filter: NotificationFilter) => Notification[];
  searchNotifications: (query: string) => Notification[];
  getByType: (type: NotificationType) => Notification[];
  
  // Preferences
  preferences: Record<NotificationType, NotificationPreference>;
  updatePreference: (type: NotificationType, preference: Partial<NotificationPreference>) => void;
  resetPreferences: () => void;
  
  // Delivery channels
  addDeliveryChannel: (channel: DeliveryChannel, value: string) => Promise<void>;
  removeDeliveryChannel: (channel: DeliveryChannel) => void;
  
  // Export and archive
  exportNotifications: (format: 'json' | 'csv') => string;
  archiveOldNotifications: (daysOld: number) => number;
}

const PREFS_STORAGE_KEY = 'notification_preferences_v1';
const MAX_NOTIFICATIONS = 1000;

interface ApiNotification {
  id: number;
  type: string;
  title: string;
  message: string;
  data?: Record<string, unknown> | null;
  is_read: boolean;
  created_at: string;
}

function mapApiNotification(
  apiNotification: ApiNotification,
  userAddress: string
): Notification {
  const type = Object.values(NotificationType).includes(apiNotification.type as NotificationType)
    ? (apiNotification.type as NotificationType)
    : NotificationType.SYSTEM;
  const severity = (apiNotification.data?.severity as Notification['severity']) ?? _NotificationSeverity.MEDIUM;
  const priority = (apiNotification.data?.priority as Notification['priority']) ?? 1;

  return {
    id: apiNotification.id.toString(),
    type,
    severity,
    title: apiNotification.title,
    message: apiNotification.message,
    description: typeof apiNotification.data?.description === 'string' ? apiNotification.data.description : undefined,
    icon: getNotificationIcon(type),
    color: getNotificationColor(type),
    timestamp: new Date(apiNotification.created_at).getTime(),
    userId: userAddress,
    status: apiNotification.is_read ? NotificationStatus.READ : NotificationStatus.DELIVERED,
    priority,
    metadata: apiNotification.data ?? {},
    actionUrl: typeof apiNotification.data?.actionUrl === 'string' ? apiNotification.data.actionUrl : undefined,
    actionLabel: typeof apiNotification.data?.actionLabel === 'string' ? apiNotification.data.actionLabel : undefined,
    relatedId: typeof apiNotification.data?.relatedId === 'string' ? apiNotification.data.relatedId : undefined,
    channels: [DeliveryChannel.IN_APP],
    deliveryStatus: {
      [DeliveryChannel.IN_APP]: NotificationStatus.DELIVERED,
      [DeliveryChannel.EMAIL]: NotificationStatus.PENDING,
      [DeliveryChannel.SMS]: NotificationStatus.PENDING,
      [DeliveryChannel.PUSH]: NotificationStatus.PENDING,
      [DeliveryChannel.WEBHOOK]: NotificationStatus.PENDING,
    },
    readAt: apiNotification.is_read ? new Date(apiNotification.created_at).getTime() : undefined,
  };
}

export function useNotificationHub(): UseNotificationHubResult {
  const { address } = useAccount();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [preferences, setPreferences] = useState<Record<NotificationType, NotificationPreference>>(
    DEFAULT_NOTIFICATION_PREFERENCES
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchPreferences = useCallback(async () => {
    if (!address) {
      return;
    }

    try {
      const response = await fetch(`/api/notifications/hub-preferences?userAddress=${address}`);
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to fetch notification preferences');
      }

      const data = await response.json();
      if (data.preferences) {
        setPreferences(data.preferences as Record<NotificationType, NotificationPreference>);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch notification preferences'));
    }
  }, [address]);

  const savePreferences = useCallback(
    async (nextPreferences: Record<NotificationType, NotificationPreference>) => {
      if (!address) return;

      try {
        const headers = await buildCsrfHeaders({ 'Content-Type': 'application/json' }, 'PUT');
        const response = await fetch('/api/notifications/hub-preferences', {
          method: 'PUT',
          headers,
          credentials: 'include',
          body: JSON.stringify({
            userAddress: address,
            preferences: nextPreferences,
          }),
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error || 'Failed to update notification preferences');
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to update notification preferences'));
      }
    },
    [address]
  );

  const fetchNotifications = useCallback(async () => {
    if (!address) {
      setNotifications([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/notifications?userAddress=${address}&limit=100&offset=0`);
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to fetch notifications');
      }

      const data = await response.json();
      const items: ApiNotification[] = Array.isArray(data.notifications) ? data.notifications : [];
      const mapped = items.map((item) => mapApiNotification(item, address));
      setNotifications(mapped.slice(0, MAX_NOTIFICATIONS));
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch notifications'));
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  // Load notifications from API
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Load preferences from API
  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  // Save preferences to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(preferences));
    } catch (e) {
      console.error('Failed to save preferences:', e);
    }
  }, [preferences]);

  // Add notification
  const addNotification = useCallback(
    async (notificationData: Omit<Notification, 'id' | 'timestamp' | 'status'>) => {
      if (!address) {
        setError(new Error('Wallet address required to add notification'));
        return;
      }

      try {
        const headers = await buildCsrfHeaders({ 'Content-Type': 'application/json' }, 'POST');
        const response = await fetch('/api/notifications', {
          method: 'POST',
          headers,
          credentials: 'include',
          body: JSON.stringify({
            userAddress: address,
            type: notificationData.type,
            title: notificationData.title,
            message: notificationData.message,
            data: {
              ...notificationData.metadata,
              severity: notificationData.severity,
              priority: notificationData.priority,
              actionUrl: notificationData.actionUrl,
              actionLabel: notificationData.actionLabel,
              relatedId: notificationData.relatedId,
            },
          }),
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error || 'Failed to create notification');
        }

        const result = await response.json();
        const created = result.notification as ApiNotification | undefined;
        if (created) {
          const mapped = mapApiNotification(created, address);
          setNotifications((prev) => [mapped, ...prev].slice(0, MAX_NOTIFICATIONS));
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to add notification'));
      }
    },
    [address]
  );

  // Mark as read
  const markAsRead = useCallback(async (notificationId: string) => {
    if (!address) return;

    const numericId = Number(notificationId);
    if (Number.isNaN(numericId)) return;

    try {
      const headers = await buildCsrfHeaders({ 'Content-Type': 'application/json' }, 'PATCH');
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          notificationIds: [numericId],
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to mark notification as read');
      }

      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId
            ? { ...n, status: NotificationStatus.READ, readAt: Date.now() }
            : n
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to mark notification as read'));
    }
  }, [address]);

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    if (!address) return;

    try {
      const headers = await buildCsrfHeaders({ 'Content-Type': 'application/json' }, 'PATCH');
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          markAllRead: true,
          userAddress: address,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to mark notifications as read');
      }

      setNotifications((prev) =>
        prev.map((n) =>
          n.status !== NotificationStatus.READ
            ? { ...n, status: NotificationStatus.READ, readAt: Date.now() }
            : n
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to mark notifications as read'));
    }
  }, [address]);

  // Dismiss notification
  const dismissNotification = useCallback(async (notificationId: string) => {
    if (!address) return;

    const numericId = Number(notificationId);
    if (Number.isNaN(numericId)) return;

    try {
      const headers = await buildCsrfHeaders({ 'Content-Type': 'application/json' }, 'DELETE');
      const response = await fetch('/api/notifications', {
        method: 'DELETE',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          notificationIds: [numericId],
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to delete notification');
      }

      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to delete notification'));
    }
  }, [address]);

  // Clear all notifications
  const clearNotifications = useCallback(async () => {
    if (!address) return;

    try {
      const headers = await buildCsrfHeaders({ 'Content-Type': 'application/json' }, 'DELETE');
      const response = await fetch('/api/notifications', {
        method: 'DELETE',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          deleteAll: true,
          userAddress: address,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to clear notifications');
      }

      setNotifications([]);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to clear notifications'));
    }
  }, [address]);

  // Filter notifications
  const filterNotifications = useCallback(
    (filter: NotificationFilter): Notification[] => {
      return notifications.filter((notif) => {
        if (filter.types && !filter.types.includes(notif.type)) return false;
        if (filter.severities && !filter.severities.includes(notif.severity))
          return false;
        if (filter.statuses && !filter.statuses.includes(notif.status))
          return false;
        if (filter.channels && !filter.channels.some((c) => notif.channels.includes(c)))
          return false;
        if (filter.dateRange) {
          if (notif.timestamp < filter.dateRange.start) return false;
          if (notif.timestamp > filter.dateRange.end) return false;
        }
        if (filter.searchQuery) {
          const query = filter.searchQuery.toLowerCase();
          const matches =
            notif.title.toLowerCase().includes(query) ||
            notif.message.toLowerCase().includes(query);
          if (!matches) return false;
        }
        return true;
      });
    },
    [notifications]
  );

  // Search notifications
  const searchNotifications = useCallback(
    (query: string): Notification[] => {
      const lower = query.toLowerCase();
      return notifications.filter(
        (n) =>
          n.title.toLowerCase().includes(lower) ||
          n.message.toLowerCase().includes(lower) ||
          n.description?.toLowerCase().includes(lower)
      );
    },
    [notifications]
  );

  // Get by type
  const getByType = useCallback(
    (type: NotificationType): Notification[] => {
      return notifications.filter((n) => n.type === type);
    },
    [notifications]
  );

  // Update preference
  const updatePreference = useCallback(
    (type: NotificationType, preference: Partial<NotificationPreference>) => {
      setPreferences((prev) => {
        const next = {
          ...prev,
          [type]: {
            ...prev[type],
            ...preference,
            type,
          },
        };

        void savePreferences(next);
        return next;
      });
    },
    [savePreferences]
  );

  // Reset preferences
  const resetPreferences = useCallback(() => {
    setPreferences(DEFAULT_NOTIFICATION_PREFERENCES);
    void savePreferences(DEFAULT_NOTIFICATION_PREFERENCES);
  }, [savePreferences]);

  // Add delivery channel
  const addDeliveryChannel = useCallback(
    async (_channel: DeliveryChannel, _value: string): Promise<void> => {
      // Simulate verification
      try {
        setIsLoading(true);
        await new Promise((resolve) => setTimeout(resolve, 2000));
        // In production, send verification code to the channel
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // Remove delivery channel
  const removeDeliveryChannel = useCallback((channel: DeliveryChannel) => {
    setPreferences((prev) => {
      const next = Object.entries(prev).reduce(
        (acc, [type, pref]) => ({
          ...acc,
          [type]: {
            ...pref,
            channels: pref.channels.filter((c) => c !== channel),
          },
        }),
        {} as Record<NotificationType, NotificationPreference>
      );

      void savePreferences(next);
      return next;
    });
  }, [savePreferences]);

  // Export notifications
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
          2
        );
      } else {
        // CSV format
        const headers = [
          'ID',
          'Type',
          'Severity',
          'Title',
          'Message',
          'Status',
          'Timestamp',
        ];
        const rows = notifications.slice(0, 100).map((n) => [
          n.id,
          n.type,
          n.severity,
          `"${n.title.replace(/"/g, '""')}"`,
          `"${n.message.replace(/"/g, '""')}"`,
          n.status,
          new Date(n.timestamp).toISOString(),
        ]);

        const csv = [
          headers.join(','),
          ...rows.map((row) => row.join(',')),
        ].join('\n');

        return csv;
      }
    },
    [notifications]
  );

  // Archive old notifications
  const archiveOldNotifications = useCallback((daysOld: number): number => {
    const cutoffTime = Date.now() - daysOld * 24 * 60 * 60 * 1000;
    const beforeCount = notifications.length;

    setNotifications((prev) =>
      prev.filter((n) => n.timestamp > cutoffTime || n.status !== NotificationStatus.READ)
    );

    return beforeCount - (beforeCount - notifications.length);
  }, [notifications.length]);

  // Calculate stats
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
  };
}

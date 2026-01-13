/**
 * useNotificationHub Hook
 * Centralized notification management with preferences and delivery
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
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
  groupNotificationsByType as _groupNotificationsByType,
} from '@/config/notification-hub';

interface UseNotificationHubResult {
  notifications: Notification[];
  stats: NotificationStats;
  isLoading: boolean;
  error: Error | null;
  
  // Core operations
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'status'>) => void;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  dismissNotification: (notificationId: string) => void;
  clearNotifications: () => void;
  
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

const STORAGE_KEY = 'notifications_v1';
const PREFS_STORAGE_KEY = 'notification_preferences_v1';
const MAX_NOTIFICATIONS = 1000;

export function useNotificationHub(): UseNotificationHubResult {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [preferences, setPreferences] = useState<Record<NotificationType, NotificationPreference>>(
    DEFAULT_NOTIFICATION_PREFERENCES
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Load notifications from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setNotifications(Array.isArray(parsed) ? parsed : []);
      }

      const storedPrefs = localStorage.getItem(PREFS_STORAGE_KEY);
      if (storedPrefs) {
        const parsed = JSON.parse(storedPrefs);
        setPreferences(parsed);
      }
    } catch (e) {
      console.error('Failed to load notifications:', e);
    }
  }, []);

  // Save notifications to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
    } catch (e) {
      console.error('Failed to save notifications:', e);
    }
  }, [notifications]);

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
    (notificationData: Omit<Notification, 'id' | 'timestamp' | 'status'>) => {
      try {
        const newNotification: Notification = {
          ...notificationData,
          id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: Date.now(),
          status: NotificationStatus.DELIVERED,
          deliveryStatus: Object.values(DeliveryChannel).reduce(
            (acc, channel) => ({
              ...acc,
              [channel]: NotificationStatus.PENDING,
            }),
            {} as Record<DeliveryChannel, NotificationStatus>
          ),
        };

        setNotifications((prev) => {
          const updated = [newNotification, ...prev];
          return updated.slice(0, MAX_NOTIFICATIONS);
        });

        // Simulate delivery
        setTimeout(() => {
          setNotifications((prev) =>
            prev.map((n) =>
              n.id === newNotification.id
                ? {
                    ...n,
                    deliveryStatus: Object.entries(n.deliveryStatus).reduce(
                      (acc, [channel, _]) => ({
                        ...acc,
                        [channel]: NotificationStatus.DELIVERED,
                      }),
                      {} as Record<DeliveryChannel, NotificationStatus>
                    ),
                  }
                : n
            )
          );
        }, 1000);

        // Fire browser notification if supported
        if (typeof window !== 'undefined' && 'Notification' in window) {
          if (Notification.permission === 'granted') {
            new Notification(notificationData.title, {
              body: notificationData.message,
              icon: notificationData.icon,
              tag: newNotification.id,
            });
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to add notification'));
      }
    },
    []
  );

  // Mark as read
  const markAsRead = useCallback((notificationId: string) => {
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === notificationId
          ? { ...n, status: NotificationStatus.READ, readAt: Date.now() }
          : n
      )
    );
  }, []);

  // Mark all as read
  const markAllAsRead = useCallback(() => {
    setNotifications((prev) =>
      prev.map((n) =>
        n.status !== NotificationStatus.READ
          ? { ...n, status: NotificationStatus.READ, readAt: Date.now() }
          : n
      )
    );
  }, []);

  // Dismiss notification
  const dismissNotification = useCallback((notificationId: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
  }, []);

  // Clear all notifications
  const clearNotifications = useCallback(() => {
    setNotifications([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

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
      setPreferences((prev) => ({
        ...prev,
        [type]: {
          ...prev[type],
          ...preference,
          type,
        },
      }));
    },
    []
  );

  // Reset preferences
  const resetPreferences = useCallback(() => {
    setPreferences(DEFAULT_NOTIFICATION_PREFERENCES);
  }, []);

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
    setPreferences((prev) =>
      Object.entries(prev).reduce(
        (acc, [type, pref]) => ({
          ...acc,
          [type]: {
            ...pref,
            channels: pref.channels.filter((c) => c !== channel),
          },
        }),
        {} as Record<NotificationType, NotificationPreference>
      )
    );
  }, []);

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

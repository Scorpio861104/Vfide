'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useTransactionSounds } from './useTransactionSounds';

// ==================== TYPES ====================

export type NotificationType = 'success' | 'error' | 'warning' | 'info' | 'transaction';
export type NotificationPriority = 'low' | 'medium' | 'high' | 'critical';
export type NotificationCategory = 'transaction' | 'governance' | 'merchant' | 'security' | 'system' | 'social';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  icon: string;
  timestamp: number;
  read: boolean;
  archived: boolean;
  snoozedUntil?: number;
  actionUrl?: string;
  actionLabel?: string;
  priority: NotificationPriority;
  category: NotificationCategory;
  source: string;
  groupKey?: string; // For grouping similar notifications
}

export interface NotificationGroup {
  key: string;
  notifications: Notification[];
  latestTimestamp: number;
  count: number;
}

export interface NotificationPreferences {
  enabled: boolean;
  sound: boolean;
  desktop: boolean;
  vibrate: boolean;
  categories: Record<NotificationCategory, boolean>;
  quietHours: {
    enabled: boolean;
    start: string; // HH:MM
    end: string;
  };
  snoozeMinutes: number;
}

const STORAGE_KEY = 'vfide-notifications';
const PREFS_KEY = 'vfide-notification-prefs';

const DEFAULT_PREFS: NotificationPreferences = {
  enabled: true,
  sound: true,
  desktop: true,
  vibrate: true,
  categories: {
    transaction: true,
    governance: true,
    merchant: true,
    security: true,
    system: true,
    social: true,
  },
  quietHours: {
    enabled: false,
    start: '22:00',
    end: '08:00',
  },
  snoozeMinutes: 30,
};

// ==================== HOOK ====================

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_PREFS);
  const { playSound } = useTransactionSounds();
  const desktopPermission = useRef<NotificationPermission>('default');

  // Load from storage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Filter out old archived notifications (older than 7 days)
        const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        setNotifications(parsed.filter((n: Notification) => 
          !n.archived || n.timestamp > weekAgo
        ));
      }

      const prefs = localStorage.getItem(PREFS_KEY);
      if (prefs) {
        setPreferences({ ...DEFAULT_PREFS, ...JSON.parse(prefs) });
      }
    } catch {
      // Ignore storage errors
    }

    // Check desktop notification permission
    if (typeof window !== 'undefined' && 'Notification' in window) {
      desktopPermission.current = Notification.permission;
    }
  }, []);

  // Save to storage
  useEffect(() => {
    if (notifications.length > 0) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
      } catch {
        // Ignore storage errors
      }
    }
  }, [notifications]);

  // Save preferences
  useEffect(() => {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(preferences));
    } catch {
      // Ignore storage errors
    }
  }, [preferences]);

  // Check if in quiet hours
  const isInQuietHours = useCallback(() => {
    if (!preferences.quietHours.enabled) return false;
    
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    const [startH, startM] = preferences.quietHours.start.split(':').map(Number);
    const [endH, endM] = preferences.quietHours.end.split(':').map(Number);
    const startTime = startH * 60 + startM;
    const endTime = endH * 60 + endM;

    if (startTime <= endTime) {
      return currentTime >= startTime && currentTime < endTime;
    } else {
      // Overnight quiet hours
      return currentTime >= startTime || currentTime < endTime;
    }
  }, [preferences.quietHours]);

  // Request desktop notification permission
  const requestDesktopPermission = useCallback(async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const permission = await Notification.requestPermission();
      desktopPermission.current = permission;
      return permission === 'granted';
    }
    return false;
  }, []);

  // Show desktop notification
  const showDesktopNotification = useCallback((notification: Notification) => {
    if (
      typeof window !== 'undefined' &&
      'Notification' in window &&
      desktopPermission.current === 'granted' &&
      preferences.desktop &&
      !isInQuietHours()
    ) {
      const n = new Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.ico',
        tag: notification.id,
        silent: !preferences.sound,
      });

      n.onclick = () => {
        window.focus();
        if (notification.actionUrl) {
          window.location.href = notification.actionUrl;
        }
        n.close();
      };

      setTimeout(() => n.close(), 5000);
    }
  }, [preferences.desktop, preferences.sound, isInQuietHours]);

  // Add notification
  const addNotification = useCallback((
    notification: Omit<Notification, 'id' | 'timestamp' | 'read' | 'archived'>
  ) => {
    if (!preferences.enabled) return null;
    if (!preferences.categories[notification.category]) return null;

    const newNotification: Notification = {
      ...notification,
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      timestamp: Date.now(),
      read: false,
      archived: false,
    };

    setNotifications(prev => [newNotification, ...prev].slice(0, 100)); // Max 100 notifications

    // Play sound
    if (preferences.sound && !isInQuietHours()) {
      playSound('notification');
    }

    // Vibrate on mobile
    if (preferences.vibrate && 'vibrate' in navigator && !isInQuietHours()) {
      navigator.vibrate([100, 50, 100]);
    }

    // Show desktop notification for high priority
    if (notification.priority === 'high' || notification.priority === 'critical') {
      showDesktopNotification(newNotification);
    }

    return newNotification;
  }, [preferences, playSound, isInQuietHours, showDesktopNotification]);

  // Mark as read
  const markAsRead = useCallback((id: string) => {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  }, []);

  // Mark all as read
  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  // Archive notification
  const archive = useCallback((id: string) => {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, archived: true, read: true } : n)
    );
  }, []);

  // Snooze notification
  const snooze = useCallback((id: string, minutes?: number) => {
    const snoozeTime = (minutes || preferences.snoozeMinutes) * 60 * 1000;
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, snoozedUntil: Date.now() + snoozeTime } : n)
    );
  }, [preferences.snoozeMinutes]);

  // Delete notification
  const remove = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  // Clear all archived
  const clearArchived = useCallback(() => {
    setNotifications(prev => prev.filter(n => !n.archived));
  }, []);

  // Group similar notifications
  const groupedNotifications = useCallback((): NotificationGroup[] => {
    const now = Date.now();
    const active = notifications.filter(n => 
      !n.archived && 
      (!n.snoozedUntil || n.snoozedUntil <= now)
    );

    const groups: Map<string, Notification[]> = new Map();
    const ungrouped: Notification[] = [];

    active.forEach(n => {
      if (n.groupKey) {
        const existing = groups.get(n.groupKey) || [];
        existing.push(n);
        groups.set(n.groupKey, existing);
      } else {
        ungrouped.push(n);
      }
    });

    const result: NotificationGroup[] = [];

    // Add grouped notifications
    groups.forEach((notifs, key) => {
      result.push({
        key,
        notifications: notifs.sort((a, b) => b.timestamp - a.timestamp),
        latestTimestamp: Math.max(...notifs.map(n => n.timestamp)),
        count: notifs.length,
      });
    });

    // Add ungrouped as single-item groups
    ungrouped.forEach(n => {
      result.push({
        key: n.id,
        notifications: [n],
        latestTimestamp: n.timestamp,
        count: 1,
      });
    });

    // Sort by latest timestamp
    return result.sort((a, b) => b.latestTimestamp - a.latestTimestamp);
  }, [notifications]);

  // Computed values
  const unreadCount = notifications.filter(n => !n.read && !n.archived).length;
  const activeNotifications = notifications.filter(n => !n.archived);
  const archivedNotifications = notifications.filter(n => n.archived);

  return {
    notifications: activeNotifications,
    archivedNotifications,
    groupedNotifications,
    unreadCount,
    preferences,
    setPreferences,
    addNotification,
    markAsRead,
    markAllAsRead,
    archive,
    snooze,
    remove,
    clearArchived,
    requestDesktopPermission,
    isInQuietHours,
  };
}

// ==================== NOTIFICATION CONTEXT ====================

import { createContext, useContext, ReactNode } from 'react';

interface NotificationContextValue extends ReturnType<typeof useNotifications> {}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const value = useNotifications();
  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotificationContext() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotificationContext must be used within NotificationProvider');
  }
  return context;
}

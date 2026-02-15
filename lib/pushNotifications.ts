/**
 * Push Notifications System
 * 
 * Web Push API integration for real-time notifications.
 */

import { useState, useEffect, useCallback } from 'react';
import { buildCsrfHeaders } from '@/lib/security/csrfClient';

// ============================================================================
// Types & Interfaces
// ============================================================================

export enum NotificationType {
  MESSAGE = 'message',
  MENTION = 'mention',
  REACTION = 'reaction',
  GROUP_INVITE = 'group_invite',
  BADGE_EARNED = 'badge_earned',
  ANNOUNCEMENT = 'announcement',
}

export interface PushSubscription {
  userId: string;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  createdAt: number;
  userAgent?: string;
}

export interface NotificationPreferences {
  userId: string;
  enabled: boolean;
  types: {
    [NotificationType.MESSAGE]: boolean;
    [NotificationType.MENTION]: boolean;
    [NotificationType.REACTION]: boolean;
    [NotificationType.GROUP_INVITE]: boolean;
    [NotificationType.BADGE_EARNED]: boolean;
    [NotificationType.ANNOUNCEMENT]: boolean;
  };
  quietHours?: {
    enabled: boolean;
    start: string; // HH:mm format
    end: string;   // HH:mm format
  };
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  data?: Record<string, unknown>;
  tag?: string;
  requireInteraction?: boolean;
}

// ============================================================================
// Service Worker Registration
// ============================================================================

/**
 * Check if service workers are supported
 */
export function isServiceWorkerSupported(): boolean {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator;
}

/**
 * Check if push notifications are supported
 */
export function isPushSupported(): boolean {
  return (
    isServiceWorkerSupported() &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/**
 * Register service worker
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!isServiceWorkerSupported()) {
    console.warn('Service workers are not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/service-worker.js', {
      scope: '/',
    });

    console.log('Service worker registered:', registration.scope);
    return registration;
  } catch (error) {
    console.error('Service worker registration failed:', error);
    return null;
  }
}

/**
 * Get service worker registration
 */
export async function getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!isServiceWorkerSupported()) {
    return null;
  }

  try {
    return await navigator.serviceWorker.ready;
  } catch (error) {
    console.error('Failed to get service worker registration:', error);
    return null;
  }
}

// ============================================================================
// Permission Management
// ============================================================================

/**
 * Get current notification permission status
 */
export function getNotificationPermission(): NotificationPermission {
  if (!('Notification' in window)) {
    return 'denied';
  }
  return Notification.permission;
}

/**
 * Request notification permission
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    throw new Error('Notifications not supported');
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission === 'denied') {
    throw new Error('Notification permission denied');
  }

  const permission = await Notification.requestPermission();
  return permission;
}

// ============================================================================
// Push Subscription Management
// ============================================================================

/**
 * Subscribe to push notifications
 */
export async function subscribeToPush(
  vapidPublicKey: string
): Promise<PushSubscriptionJSON | null> {
  if (!isPushSupported()) {
    throw new Error('Push notifications not supported');
  }

  const permission = await requestNotificationPermission();
  if (permission !== 'granted') {
    throw new Error('Notification permission not granted');
  }

  const registration = await getServiceWorkerRegistration();
  if (!registration) {
    throw new Error('Service worker not registered');
  }

  try {
    // Convert VAPID key
    const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);

    // Subscribe to push
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: applicationServerKey as BufferSource,
    });

    return subscription.toJSON();
  } catch (error) {
    console.error('Failed to subscribe to push:', error);
    throw error;
  }
}

/**
 * Get current push subscription
 */
export async function getCurrentPushSubscription(): Promise<PushSubscriptionJSON | null> {
  if (!isPushSupported()) {
    return null;
  }

  const registration = await getServiceWorkerRegistration();
  if (!registration) {
    return null;
  }

  try {
    const subscription = await registration.pushManager.getSubscription();
    return subscription ? subscription.toJSON() : null;
  } catch (error) {
    console.error('Failed to get push subscription:', error);
    return null;
  }
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPush(): Promise<boolean> {
  if (!isPushSupported()) {
    return false;
  }

  const registration = await getServiceWorkerRegistration();
  if (!registration) {
    return false;
  }

  try {
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      await subscription.unsubscribe();
      return true;
    }
    return false;
  } catch (error) {
    console.error('Failed to unsubscribe from push:', error);
    return false;
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Convert base64 string to Uint8Array
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

/**
 * Show local notification (for testing)
 */
export async function showLocalNotification(
  title: string,
  options?: NotificationOptions
): Promise<void> {
  if (!('Notification' in window)) {
    throw new Error('Notifications not supported');
  }

  if (Notification.permission !== 'granted') {
    throw new Error('Notification permission not granted');
  }

  const registration = await getServiceWorkerRegistration();
  if (registration) {
    await registration.showNotification(title, {
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      ...options,
    });
  } else {
    new Notification(title, options);
  }
}

/**
 * Default notification preferences
 */
export function getDefaultPreferences(userId: string): NotificationPreferences {
  return {
    userId,
    enabled: true,
    types: {
      [NotificationType.MESSAGE]: true,
      [NotificationType.MENTION]: true,
      [NotificationType.REACTION]: true,
      [NotificationType.GROUP_INVITE]: true,
      [NotificationType.BADGE_EARNED]: true,
      [NotificationType.ANNOUNCEMENT]: true,
    },
    quietHours: {
      enabled: false,
      start: '22:00',
      end: '08:00',
    },
  };
}

/**
 * Check if currently in quiet hours
 */
export function isInQuietHours(preferences: NotificationPreferences): boolean {
  if (!preferences.quietHours?.enabled) {
    return false;
  }

  const now = new Date();
  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

  const { start, end } = preferences.quietHours;

  // Handle overnight quiet hours (e.g., 22:00 to 08:00)
  if (start > end) {
    return currentTime >= start || currentTime <= end;
  }

  return currentTime >= start && currentTime <= end;
}

// ============================================================================
// React Hooks
// ============================================================================

/**
 * Hook to manage push notification subscription
 */
export function usePushNotifications(userAddress?: string) {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscriptionJSON | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setIsSupported(isPushSupported());
    setPermission(getNotificationPermission());
  }, []);

  useEffect(() => {
    const checkSubscription = async () => {
      if (!isSupported) {
        setLoading(false);
        return;
      }

      try {
        const sub = await getCurrentPushSubscription();
        setSubscription(sub);
        setIsSubscribed(!!sub);
      } catch (error) {
        console.error('Failed to check subscription:', error);
      } finally {
        setLoading(false);
      }
    };

    checkSubscription();
  }, [isSupported]);

  const subscribe = useCallback(async () => {
    if (!userAddress) {
      throw new Error('User address required');
    }

    setLoading(true);
    try {
      // Get VAPID key from server
      const response = await fetch('/api/notifications/vapid');
      if (!response.ok) throw new Error('Failed to fetch VAPID key');
      const { publicKey } = await response.json();

      // Subscribe to push
      const sub = await subscribeToPush(publicKey);
      if (!sub) {
        throw new Error('Failed to subscribe');
      }

      // Save subscription to server
      const saveHeaders = await buildCsrfHeaders({ 'Content-Type': 'application/json' }, 'POST');
      const saveResponse = await fetch('/api/notifications/push', {
        method: 'POST',
        headers: saveHeaders,
        credentials: 'include',
        body: JSON.stringify({
          userAddress,
          subscription: sub,
        }),
      });

      if (!saveResponse.ok) throw new Error('Failed to save subscription');
      const data = await saveResponse.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to save subscription');
      }

      setSubscription(sub);
      setIsSubscribed(true);
      setPermission('granted');

      return sub;
    } catch (error) {
      console.error('Failed to subscribe:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [userAddress]);

  const unsubscribe = useCallback(async () => {
    if (!userAddress) {
      throw new Error('User address required');
    }

    setLoading(true);
    try {
      // Unsubscribe from push
      await unsubscribeFromPush();

      // Remove subscription from server
      if (subscription?.endpoint) {
        const deleteHeaders = await buildCsrfHeaders({ 'Content-Type': 'application/json' }, 'DELETE');
        const deleteResponse = await fetch('/api/notifications/push', {
          method: 'DELETE',
          headers: deleteHeaders,
          credentials: 'include',
          body: JSON.stringify({ userAddress, endpoint: subscription.endpoint }),
        });
        if (!deleteResponse.ok) {
          console.warn('Failed to remove server subscription:', deleteResponse.status);
        }
      }

      setSubscription(null);
      setIsSubscribed(false);
    } catch (error) {
      console.error('Failed to unsubscribe:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [userAddress, subscription?.endpoint]);

  const requestPermission = useCallback(async () => {
    try {
      const perm = await requestNotificationPermission();
      setPermission(perm);
      return perm;
    } catch (error) {
      console.error('Failed to request permission:', error);
      throw error;
    }
  }, []);

  return {
    isSupported,
    permission,
    isSubscribed,
    subscription,
    loading,
    subscribe,
    unsubscribe,
    requestPermission,
  };
}

/**
 * Hook to manage notification preferences
 */
export function useNotificationPreferences(userAddress?: string) {
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPreferences = async () => {
      if (!userAddress) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/notifications/preferences?userAddress=${userAddress}`);
        if (!response.ok) throw new Error('Failed to load preferences');
        const data = await response.json();

        if (data.success) {
          setPreferences(data.preferences);
        } else {
          // Use defaults if none exist
          setPreferences(getDefaultPreferences(userAddress));
        }
      } catch (error) {
        console.error('Failed to load preferences:', error);
        setPreferences(getDefaultPreferences(userAddress));
      } finally {
        setLoading(false);
      }
    };

    loadPreferences();
  }, [userAddress]);

  const updatePreferences = useCallback(
    async (updates: Partial<NotificationPreferences>) => {
      if (!userAddress || !preferences) {
        throw new Error('Cannot update preferences');
      }

      const updated = { ...preferences, ...updates };
      setPreferences(updated);

      try {
        const headers = await buildCsrfHeaders({ 'Content-Type': 'application/json' }, 'PUT');
        const response = await fetch('/api/notifications/preferences', {
          method: 'PUT',
          headers,
          credentials: 'include',
          body: JSON.stringify({ userAddress, ...updated }),
        });

        if (!response.ok) {
          setPreferences(preferences);
          throw new Error('Failed to update preferences');
        }
        const data = await response.json();
        if (!data.success) {
          // Revert on error
          setPreferences(preferences);
          throw new Error(data.error || 'Failed to update preferences');
        }
      } catch (error) {
        console.error('Failed to update preferences:', error);
        throw error;
      }
    },
    [userAddress, preferences]
  );

  return {
    preferences,
    loading,
    updatePreferences,
  };
}

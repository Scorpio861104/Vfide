/**
 * Badge Notification System
 * 
 * Alerts users when they earn new badges
 * Supports multiple notification channels
 * 
 * Features:
 * - In-app notifications
 * - Browser push notifications
 * - Toast messages
 * - Badge showcase animations
 */

import { BADGE_REGISTRY } from './badge-registry';

export interface BadgeNotification {
  badgeId: string;
  badgeName: string;
  badgeRarity: string;
  points: number;
  earnedAt: number;
  userId: string;
  shown: boolean;
}

// Notification queue
const notificationQueue: BadgeNotification[] = [];
const shownNotifications = new Set<string>();

/**
 * Create a badge earned notification
 */
export function createBadgeNotification(
  userId: string,
  badgeId: string
): BadgeNotification | null {
  const badge = Object.values(BADGE_REGISTRY).find(b => b.id === badgeId);
  if (!badge) return null;

  const notification: BadgeNotification = {
    badgeId,
    badgeName: badge.name,
    badgeRarity: badge.rarity,
    points: badge.points,
    earnedAt: Date.now(),
    userId,
    shown: false,
  };

  // Add to queue
  notificationQueue.push(notification);

  return notification;
}

/**
 * Show in-app toast notification
 */
export function showBadgeToast(notification: BadgeNotification): void {
  if (typeof window === 'undefined') return;

  const notificationKey = `${notification.userId}_${notification.badgeId}`;
  if (shownNotifications.has(notificationKey)) return;

  // Mark as shown
  shownNotifications.add(notificationKey);
  notification.shown = true;

  // Dispatch event for toast system
  window.dispatchEvent(new CustomEvent('showBadgeToast', {
    detail: notification,
  }));

  console.log(`🏅 Badge Earned: ${notification.badgeName} (+${notification.points} points)`);
}

/**
 * Show browser push notification
 */
export async function showBadgePushNotification(
  notification: BadgeNotification
): Promise<void> {
  if (typeof window === 'undefined' || !('Notification' in window)) return;

  // Check permission
  if (Notification.permission === 'granted') {
    try {
      const n = new Notification('New Badge Earned! 🏅', {
        body: `You've earned the "${notification.badgeName}" badge (+${notification.points} points)!`,
        icon: '/badge-icon.png',
        badge: '/badge-badge.png',
        tag: `badge_${notification.badgeId}`,
        requireInteraction: false,
        silent: false,
      });

      n.onclick = () => {
        window.focus();
        window.location.href = '/badge-progress';
        n.close();
      };
    } catch (error) {
      console.error('Error showing push notification:', error);
    }
  } else if (Notification.permission === 'default') {
    // Request permission
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      await showBadgePushNotification(notification);
    }
  }
}

/**
 * Show badge showcase modal
 */
export function showBadgeShowcase(notification: BadgeNotification): void {
  if (typeof window === 'undefined') return;

  window.dispatchEvent(new CustomEvent('showBadgeShowcase', {
    detail: notification,
  }));
}

/**
 * Process notification queue
 */
export async function processNotificationQueue(): Promise<void> {
  while (notificationQueue.length > 0) {
    const notification = notificationQueue.shift();
    if (!notification) continue;

    // Show toast
    showBadgeToast(notification);

    // Show push notification (if enabled)
    await showBadgePushNotification(notification);

    // Wait a bit before next notification
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

/**
 * Get pending notifications
 */
export function getPendingNotifications(): BadgeNotification[] {
  return notificationQueue.filter(n => !n.shown);
}

/**
 * Mark notification as shown
 */
export function markNotificationShown(
  userId: string,
  badgeId: string
): void {
  const notificationKey = `${userId}_${badgeId}`;
  shownNotifications.add(notificationKey);
}

/**
 * Clear all notifications for user
 */
export function clearUserNotifications(userId: string): void {
  // Remove from queue
  const remaining = notificationQueue.filter(n => n.userId !== userId);
  notificationQueue.length = 0;
  notificationQueue.push(...remaining);

  // Clear shown set
  Array.from(shownNotifications).forEach(key => {
    if (key.startsWith(`${userId}_`)) {
      shownNotifications.delete(key);
    }
  });
}

/**
 * Setup notification listeners
 */
export function setupBadgeNotificationListeners(): void {
  if (typeof window === 'undefined') return;

  // Listen for badge earned events
  window.addEventListener('badgeEarned', ((event: CustomEvent) => {
    const { userId, badgeId } = event.detail;
    const notification = createBadgeNotification(userId, badgeId);
    
    if (notification) {
      showBadgeToast(notification);
      showBadgePushNotification(notification);
    }
  }) as EventListener);

  // Process queue periodically
  setInterval(() => {
    processNotificationQueue();
  }, 5000);
}

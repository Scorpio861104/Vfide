/**
 * Service Worker Registration
 * Registers the PWA service worker for offline support + push notifications.
 */
import { logger } from '@/lib/logger';

export function registerServiceWorker() {
  if (typeof window === 'undefined') return;
  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });

      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'activated' && navigator.serviceWorker.controller) {
            // New version available — could show a toast
            logger.info('[SW] New version available');
          }
        });
      });
    } catch (err) {
      logger.warn('[SW] Registration failed:', err);
    }
  });
}

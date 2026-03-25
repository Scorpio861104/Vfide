/**
 * Service Worker Registration Utility
 * 
 * Provides helpers to register and manage the service worker
 */

import { logger } from '@/lib/logger';

/**
 * Register service worker
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    logger.info('[Service Worker] Not supported in this environment');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/service-worker.js', {
      scope: '/',
    });

    logger.info('[Service Worker] Registered successfully');

    // Check for updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      logger.info('[Service Worker] Update found');

      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New service worker available
            logger.info('[Service Worker] New version available');
            
            // Notify user about update
            if (window.confirm('A new version is available. Reload to update?')) {
              newWorker.postMessage({ type: 'SKIP_WAITING' });
              window.location.reload();
            }
          }
        });
      }
    });

    // Listen for controlling service worker changes
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      logger.info('[Service Worker] Controller changed');
    });

    return registration;
  } catch (error) {
    logger.error('[Service Worker] Registration failed:', error);
    return null;
  }
}

/**
 * Unregister service worker
 */
export async function unregisterServiceWorker(): Promise<boolean> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      await registration.unregister();
      logger.info('[Service Worker] Unregistered successfully');
      return true;
    }
    return false;
  } catch (error) {
    logger.error('[Service Worker] Unregistration failed:', error);
    return false;
  }
}

/**
 * Clear all service worker caches
 */
export async function clearServiceWorkerCaches(): Promise<void> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration && registration.active) {
      registration.active.postMessage({ type: 'CLEAR_CACHE' });
      logger.info('[Service Worker] Cache clear requested');
    }
  } catch (error) {
    logger.error('[Service Worker] Failed to clear caches:', error);
  }
}

/**
 * Check if service worker is active
 */
export function isServiceWorkerActive(): boolean {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return false;
  }

  return navigator.serviceWorker.controller !== null;
}

/**
 * Get service worker registration status
 */
export async function getServiceWorkerStatus(): Promise<{
  supported: boolean;
  registered: boolean;
  active: boolean;
  waiting: boolean;
}> {
  const supported = typeof window !== 'undefined' && 'serviceWorker' in navigator;

  if (!supported) {
    return {
      supported: false,
      registered: false,
      active: false,
      waiting: false,
    };
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    
    return {
      supported: true,
      registered: registration !== undefined,
      active: registration?.active !== undefined && registration?.active !== null,
      waiting: registration?.waiting !== undefined && registration?.waiting !== null,
    };
  } catch (error) {
    logger.error('[Service Worker] Status check failed:', error);
    return {
      supported: true,
      registered: false,
      active: false,
      waiting: false,
    };
  }
}

/**
 * Update service worker
 */
export async function updateServiceWorker(): Promise<void> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      await registration.update();
      logger.info('[Service Worker] Update check completed');
    }
  } catch (error) {
    logger.error('[Service Worker] Update failed:', error);
  }
}

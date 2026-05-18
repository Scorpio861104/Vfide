'use client';

import { useEffect } from 'react';
import { getEnv } from '@/lib/env';
import { registerServiceWorker } from '@/lib/serviceWorkerRegistration';
import { logger } from '@/lib/logger';

/**
 * Service Worker Registration Component
 * 
 * Registers the service worker on app mount for:
 * - Offline caching
 * - Background sync
 * - Push notifications
 * - Faster repeat visits
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    const env = getEnv();

    // Only register in production or if explicitly enabled
    if (process.env.NODE_ENV === 'production' || env.NEXT_PUBLIC_ENABLE_SW) {
      registerServiceWorker().then((registration) => {
        if (registration) {
          logger.info('[VFIDE] Service worker registered successfully');
        }
      });
    }
  }, []);

  return null; // This component doesn't render anything
}

export default ServiceWorkerRegistration;

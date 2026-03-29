/**
 * Performance Provider Component
 * 
 * Initializes performance monitoring on the client side.
 * Tracks Web Vitals and custom metrics automatically.
 */

'use client';

import { useEffect } from 'react';
import { getDevicePerformanceProfile, initWebVitals, observeLongTasks, trackMetric } from '@/lib/performance';
import { logger } from '@/lib/logger';

export function PerformanceProvider() {
  useEffect(() => {
    // Initialize Web Vitals tracking
    initWebVitals();

    const profile = getDevicePerformanceProfile();
    const thresholdMs = profile.tier === 'low' ? 40 : 50;

    if (profile.tier === 'low') {
      // Marks low-end sessions for later trend analysis.
      trackMetric('low-end-device-session', 1);
    }

    // Observe long tasks
    const cleanup = observeLongTasks((duration) => {
      if (process.env.NODE_ENV === 'development') {
        logger.warn(`[Performance] Long task detected (${profile.tier}): ${duration.toFixed(2)}ms`);
      }
    }, {
      thresholdMs,
      profile,
    });

    // Log initial performance info in development
    if (process.env.NODE_ENV === 'development') {
      // Performance monitoring initialized
      logger.info('[Performance] Device profile:', profile);
      
      // Report after page load
      window.addEventListener('load', () => {
        setTimeout(() => {
          const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
          if (navigation) {
            logger.info('[Performance] Navigation timing:', {
              'DNS': `${(navigation.domainLookupEnd - navigation.domainLookupStart).toFixed(0)}ms`,
              'TCP': `${(navigation.connectEnd - navigation.connectStart).toFixed(0)}ms`,
              'Request': `${(navigation.responseStart - navigation.requestStart).toFixed(0)}ms`,
              'Response': `${(navigation.responseEnd - navigation.responseStart).toFixed(0)}ms`,
              'DOM Processing': `${(navigation.domComplete - navigation.domInteractive).toFixed(0)}ms`,
              'Total': `${(navigation.loadEventEnd - navigation.fetchStart).toFixed(0)}ms`,
            });
          }
        }, 0);
      });
    }

    return cleanup;
  }, []);

  // No UI, just monitoring initialization
  return null;
}

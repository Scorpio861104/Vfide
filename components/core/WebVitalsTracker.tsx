"use client";

import { useEffect } from 'react';
import { trackWebVitals, trackRetention } from '@/lib/optimization/monitoring';

/**
 * Web Vitals Tracking Component
 * 
 * Tracks Core Web Vitals and user retention metrics:
 * - LCP (Largest Contentful Paint)
 * - FID (First Input Delay)
 * - CLS (Cumulative Layout Shift)
 * - FCP (First Contentful Paint)
 * - TTFB (Time to First Byte)
 */
export function WebVitalsTracker() {
  useEffect(() => {
    // Track Core Web Vitals
    trackWebVitals();
    
    // Track retention metrics
    trackRetention();
  }, []);

  return null; // This component doesn't render anything
}

export default WebVitalsTracker;

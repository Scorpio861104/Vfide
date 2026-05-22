'use client';

import * as React from 'react';
import { getDevicePerformanceProfile, observeLongTasks, trackMetric } from '@/lib/performance';

interface PerformanceProviderProps {
  children: React.ReactNode;
}

/**
 * PerformanceProvider applies device-adaptive long-task thresholds.
 * Low-end devices use a 40ms threshold; standard/high use 50ms.
 * Emits a 'low-end-device-session' metric for low-tier devices.
 */
export function PerformanceProvider({ children }: PerformanceProviderProps) {
  React.useEffect(() => {
    const profile = getDevicePerformanceProfile();
    const thresholdMs = profile.tier === 'low' ? 40 : 50;

    if (profile.tier === 'low') {
      trackMetric('low-end-device-session', 1);
    }

    const cleanup = observeLongTasks(
      (_duration: number) => {
        // Long task callback - metrics are tracked inside observeLongTasks
      },
      { thresholdMs, profile },
    );

    return cleanup;
  }, []);

  return <>{children}</>;
}

export default PerformanceProvider;

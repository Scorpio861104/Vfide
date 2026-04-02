'use client';

import type { ReactNode } from 'react';

import { ErrorMonitoringProvider, DevErrorConsole } from '@/components/monitoring/ErrorMonitoringProvider';
import { PerformanceProvider } from '@/components/performance/PerformanceProvider';
import { SecurityProvider } from '@/components/security/SecurityProvider';
import { TestnetNotification } from '@/components/ui/TestnetNotification';
import { NetworkSwitchOverlay } from '@/components/wallet/NetworkSwitchOverlay';
import { Web3Provider } from '@/components/wallet/Web3Provider';

export function Web3Providers({ children }: { children: ReactNode }) {
  return (
    <Web3Provider>
      <SecurityProvider />
      <PerformanceProvider />
      <ErrorMonitoringProvider />
      <DevErrorConsole />
      <NetworkSwitchOverlay />
      <TestnetNotification />
      {children}
    </Web3Provider>
  );
}

'use client';

import type { ReactNode } from 'react';

import { AccessibilityProvider } from '@/components/accessibility/AccessibilityProvider';
import { OfflineIndicator } from '@/components/connectivity/OfflineIndicator';
import { ServiceWorkerRegistration } from '@/components/core/ServiceWorkerRegistration';
import { ZustandHydration } from '@/components/core/ZustandHydration';
import { WebVitalsTracker } from '@/components/core/WebVitalsTracker';
import { ErrorBoundary } from '@/components/error/ErrorBoundary';
import { DemoModeBanner } from '@/components/layout/DemoModeBanner';
import { ToastProvider } from '@/components/ui/toast';
import {
  EmbeddedWalletProvider,
  type EmbeddedWalletConfig,
} from '@/lib/embeddedWallet/embeddedWalletService';
import { PreferencesProvider } from '@/lib/preferences/userPreferences';

const embeddedWalletConfig: EmbeddedWalletConfig = {
  provider: 'magic' as const,
  appId: process.env.NEXT_PUBLIC_EMBEDDED_WALLET_APP_ID ?? 'vfide-demo',
  appName: 'VFIDE',
  authMethods: ['email', 'google', 'apple', 'twitter', 'discord'],
};

export function CoreProviders({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary>
      <PreferencesProvider>
        <AccessibilityProvider>
          <EmbeddedWalletProvider config={embeddedWalletConfig}>
            <ToastProvider>
              {children}
              <DemoModeBanner />
              <OfflineIndicator />
              <ServiceWorkerRegistration />
              <ZustandHydration />
              <WebVitalsTracker />
            </ToastProvider>
          </EmbeddedWalletProvider>
        </AccessibilityProvider>
      </PreferencesProvider>
    </ErrorBoundary>
  );
}

'use client';

import { ReactNode } from 'react';
import { ThemeProvider } from 'next-themes';
import { LocaleProvider } from '@/lib/locale/LocaleProvider';
import { AdaptiveProvider } from '@/lib/adaptive';
import { OnboardingProvider } from '@/components/onboarding/OnboardingContext';
import { ToastProvider } from '@/components/ui/toast';
// PERF-2: Defer Web3Providers (wagmi + RainbowKit + @walletconnect ≈ 65KB gz)
// so marketing/static pages receive zero Web3 JS on first paint.
import dynamic from 'next/dynamic';
const Web3Providers = dynamic(
  () => import('./Web3Providers').then((mod) => mod.Web3Providers),
  { ssr: false, loading: () => null }
);
import { ClientLayout } from '@/components/layout/ClientLayout';
import { MotionProvider } from './MotionProvider';
import { AppLockProvider } from '@/components/security/AppLockProvider';
import { TransactionTrailProvider } from '@/components/payments/TransactionTrailProvider';

export function CoreProviders({ children }: { children: ReactNode }) {
  return (
    <MotionProvider>
    <ThemeProvider attribute="class" defaultTheme="dark" disableTransitionOnChange>
      <LocaleProvider>
        <AdaptiveProvider>
          <OnboardingProvider>
            <ToastProvider>
              <Web3Providers>
                <AppLockProvider>
                  <TransactionTrailProvider>
                    <ClientLayout>{children}</ClientLayout>
                  </TransactionTrailProvider>
                </AppLockProvider>
              </Web3Providers>
            </ToastProvider>
          </OnboardingProvider>
        </AdaptiveProvider>
      </LocaleProvider>
    </ThemeProvider>
    </MotionProvider>
  );
}

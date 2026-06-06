'use client';

import { ReactNode } from 'react';
import { ThemeProvider } from 'next-themes';
import { LocaleProvider } from '@/lib/locale/LocaleProvider';
import { AdaptiveProvider } from '@/lib/adaptive';
import { OnboardingProvider } from '@/components/onboarding/OnboardingContext';
import { ToastProvider } from '@/components/ui/toast';
import { ClientLayout } from '@/components/layout/ClientLayout';
import { MotionProvider } from './MotionProvider';
import { AppLockProvider } from '@/components/security/AppLockProvider';
import { TransactionTrailProvider } from '@/components/payments/TransactionTrailProvider';

function AppInteractionProviders({ children }: { children: ReactNode }) {
  return (
    <AppLockProvider>
      <TransactionTrailProvider>
        <ClientLayout>{children}</ClientLayout>
      </TransactionTrailProvider>
    </AppLockProvider>
  );
}

export function CoreProviders({ children }: { children: ReactNode }) {
  return (
    <MotionProvider>
      <ThemeProvider attribute="class" defaultTheme="dark" disableTransitionOnChange>
        <LocaleProvider>
          <AdaptiveProvider>
            <OnboardingProvider>
              <ToastProvider>
                <AppInteractionProviders>{children}</AppInteractionProviders>
              </ToastProvider>
            </OnboardingProvider>
          </AdaptiveProvider>
        </LocaleProvider>
      </ThemeProvider>
    </MotionProvider>
  );
}

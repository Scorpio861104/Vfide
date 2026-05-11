'use client';

import { ReactNode } from 'react';
import { ThemeProvider } from 'next-themes';
import { LocaleProvider } from '@/lib/locale/LocaleProvider';
import { AdaptiveProvider } from '@/lib/adaptive';
import { OnboardingProvider } from '@/components/onboarding';
import { ToastProvider } from '@/components/ui/toast';
import { Web3Providers } from './Web3Providers';
import { ClientLayout } from '@/components/layout/ClientLayout';

export function CoreProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" disableTransitionOnChange>
      <LocaleProvider>
        <AdaptiveProvider>
          <OnboardingProvider>
            <ToastProvider>
              <Web3Providers><ClientLayout>{children}</ClientLayout></Web3Providers>
            </ToastProvider>
          </OnboardingProvider>
        </AdaptiveProvider>
      </LocaleProvider>
    </ThemeProvider>
  );
}

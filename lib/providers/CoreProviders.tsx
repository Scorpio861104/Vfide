'use client';

import { ReactNode } from 'react';
import { ThemeProvider } from 'next-themes';
import { LocaleProvider } from '@/lib/locale/LocaleProvider';
import { AdaptiveProvider } from '@/lib/adaptive';
import { Web3Providers } from '@/lib/providers/Web3Providers';
import { OnboardingProvider } from '@/components/onboarding';
import { ToastProvider } from '@/components/ui/toast';

export function CoreProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" disableTransitionOnChange>
      <LocaleProvider>
        <AdaptiveProvider>
          <Web3Providers>
            <OnboardingProvider>
              <ToastProvider>{children}</ToastProvider>
            </OnboardingProvider>
          </Web3Providers>
        </AdaptiveProvider>
      </LocaleProvider>
    </ThemeProvider>
  );
}

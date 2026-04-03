'use client';

import { ReactNode } from 'react';
import { ThemeProvider } from 'next-themes';
import { LocaleProvider } from '@/lib/locale/LocaleProvider';
import { AdaptiveProvider } from '@/lib/adaptive';
import { OnboardingProvider } from '@/components/onboarding';
import { Toaster } from '@/components/ui/toast';

/**
 * Tier 1 — Core Providers
 * Wraps the entire app. No wallet, no web3, no heavy dependencies.
 * Every page gets: theme, locale, adaptive performance, onboarding, toasts.
 */
export function CoreProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" disableTransitionOnChange>
      <LocaleProvider>
        <AdaptiveProvider>
          <OnboardingProvider>
            {children}
            <Toaster />
          </OnboardingProvider>
        </AdaptiveProvider>
      </LocaleProvider>
    </ThemeProvider>
  );
}

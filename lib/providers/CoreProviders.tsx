/**
 * Tier 1 Providers — Always loaded, zero auth dependency
 * 
 * These wrap the entire app in root layout.tsx.
 * Must be lightweight — no Web3, no wallet, no heavy state.
 */
'use client';

import { ReactNode } from 'react';
import { ThemeProvider } from '@/providers/ThemeProvider';
import { AccessibilityProvider } from '@/providers/AccessibilityProvider';
import { PreferencesProvider } from '@/providers/PreferencesProvider';
import { ToastProvider } from '@/components/ui/toast';

export function CoreProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <AccessibilityProvider>
        <PreferencesProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </PreferencesProvider>
      </AccessibilityProvider>
    </ThemeProvider>
  );
}

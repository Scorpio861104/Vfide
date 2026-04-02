/**
 * Tier 3 Providers — Feature-specific, loaded per route group
 * 
 * Each export wraps only the pages that need it.
 * Import in the specific route group layout, NOT root.
 * 
 * Usage in a layout:
 *   import { SocialProviders } from '@/lib/providers/FeatureProviders';
 *   export default function Layout({ children }) {
 *     return <SocialProviders>{children}</SocialProviders>;
 *   }
 */
'use client';

import { ReactNode } from 'react';

export function AppFeatureProviders({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

// ── Social: presence, notifications, real-time ──────────────────────────────
// Only loaded in (social) route group
export function SocialProviders({ children }: { children: ReactNode }) {
  // Lazy-import to avoid loading these modules in non-social routes
  const PresenceManager = require('@/providers/PresenceManager').PresenceManager;
  const NotificationProvider = require('@/providers/NotificationProvider').NotificationProvider;

  return (
    <PresenceManager>
      <NotificationProvider>
        {children}
      </NotificationProvider>
    </PresenceManager>
  );
}

// ── Gamification: achievements, XP events ───────────────────────────────────
// Only loaded in (gamification) route group
export function GamificationProviders({ children }: { children: ReactNode }) {
  const AchievementToastProvider = require('@/providers/AchievementToastProvider').AchievementToastProvider;

  return (
    <AchievementToastProvider>
      {children}
    </AchievementToastProvider>
  );
}

// ── Commerce: cart state, checkout flow ──────────────────────────────────────
// Only loaded in (commerce) route group
export function CommerceProviders({ children }: { children: ReactNode }) {
  const CartProvider = require('@/providers/CartProvider').CartProvider;

  return (
    <CartProvider>
      {children}
    </CartProvider>
  );
}

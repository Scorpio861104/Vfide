'use client';

import type { ReactNode } from 'react';

import { AchievementToastContainer } from '@/components/gamification/AchievementToast';
import { PieMenu } from '@/components/navigation/PieMenu';
import { HelpCenter } from '@/components/onboarding/HelpCenter';
import { OnboardingManager } from '@/components/onboarding/OnboardingManager';
import { PresenceManager } from '@/components/social/PresenceManager';

export function SocialProviders({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <PresenceManager />
    </>
  );
}

export function GamificationProviders({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <AchievementToastContainer />
    </>
  );
}

export function CommerceProviders({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function AppFeatureProviders({ children }: { children: ReactNode }) {
  return (
    <SocialProviders>
      <GamificationProviders>
        <CommerceProviders>
          {children}
          <PieMenu />
          <OnboardingManager />
          <HelpCenter />
        </CommerceProviders>
      </GamificationProviders>
    </SocialProviders>
  );
}

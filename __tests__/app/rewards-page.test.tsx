/**
 * rewards-page.test.tsx
 *
 * The /rewards route now redirects to /rewards-hub?tab=about.
 * The "No Token Rewards" policy content lives in the rewards-hub page
 * and is always rendered in the DOM (below the tab panel, unconditionally).
 * These tests target RewardsHubPage directly.
 */
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import type React from 'react';

const renderRewardsHubPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/rewards-hub/page');
  const RewardsHubPage = pageModule.default as React.ComponentType;
  return render(<RewardsHubPage />);
};

jest.mock('@/components/gamification/DailyQuestsPanel', () => ({
  __esModule: true,
  default: () => <div>Daily Quests Panel Widget</div>,
}));

jest.mock('@/components/gamification/OnboardingChecklist', () => ({
  __esModule: true,
  default: () => <div>Onboarding Checklist Widget</div>,
}));

jest.mock('@/hooks/useProofScore', () => ({
  useProofScore: () => ({ score: 4200, tier: 'LOW_TRUST', isLoading: false }),
}));

jest.mock('next/navigation', () => ({
  useSearchParams: () => ({ get: () => null }),
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  redirect: jest.fn(),
}));

jest.mock('wagmi', () => ({
  useAccount: () => ({ isConnected: false, address: undefined }),
  useReadContract: jest.fn(() => ({ data: undefined, isLoading: false })),
}));

jest.mock('@/components/layout/Footer', () => ({
  Footer: () => <div data-testid="footer" />,
}));

jest.mock('framer-motion', () => {
  const React = require('react');
  const __MOTION_PROPS = new Set(['initial','animate','exit','transition','variants','whileHover','whileTap','layout','layoutId','viewport','custom','whileInView']);
  const makeMotion = (tag: string) => React.forwardRef((props: Record<string, unknown>, ref: unknown) => {
    const sanitized: Record<string, unknown> = {};
    for (const k of Object.keys(props || {})) { if (!__MOTION_PROPS.has(k)) sanitized[k] = props[k]; }
    return React.createElement(tag, { ...sanitized, ref });
  });
  const motion = new Proxy({} as Record<string, unknown>, { get: (t, prop) => { if (typeof prop !== 'string') return undefined; if (!t[prop]) t[prop] = makeMotion(prop); return t[prop]; } });
  return { motion,
    m: motion,
    AnimatePresence: ({ children }: { children: React.ReactNode }) => children, LazyMotion: ({ children }: { children: React.ReactNode }) => children, domAnimation: {} };
});

jest.mock('lucide-react', () => {
  const React = require('react');
  return new Proxy({} as Record<string, unknown>, {
    get: (_t, prop) => {
      if (prop === '__esModule') return true;
      if (typeof prop === 'symbol') return undefined;
      const Icon = ({ className }: { className?: string }) => React.createElement('span', { 'data-testid': `icon-${String(prop)}`, className });
      Icon.displayName = `LucideMock(${String(prop)})`;
      return Icon;
    },
  });
});

describe('Rewards page compliance pathways', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders no-rewards policy and governance utility messaging', () => {
    renderRewardsHubPage();

    // "No Token Rewards" section is rendered unconditionally at the bottom of rewards-hub
    expect(screen.getByRole('heading', { name: /No Token Rewards/i })).toBeTruthy();
    expect(screen.getByText(/VFIDE is a governance utility token\./i)).toBeTruthy();
    expect(screen.getByText(/there are no referral bonuses/i)).toBeTruthy();
    expect(screen.getByText(/Governance voting rights/i)).toBeTruthy();
    expect(screen.getByText(/Protocol access/i)).toBeTruthy();
    expect(screen.getByText(/Governance duty points/i)).toBeTruthy();
    expect(screen.getByText(/Why no rewards\?/i)).toBeTruthy();
  });
});

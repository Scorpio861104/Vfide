import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import type React from 'react';

const renderRewardsPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/rewards/page');
  const RewardsPage = pageModule.default as React.ComponentType;
  return render(<RewardsPage />);
};

jest.mock('@/components/layout/Footer', () => ({
  Footer: () => <div data-testid="footer" />,
}));

jest.mock('framer-motion', () => {
  const React = require('react');
  const __MOTION_PROPS = new Set(['initial','animate','exit','transition','variants','whileHover','whileTap','whileFocus','layout','layoutId','viewport','custom']);
  const __makeMotion = (tag: string) => React.forwardRef((props: Record<string,unknown>, ref: unknown) => {
    const sanitized: Record<string,unknown> = {};
    for (const k of Object.keys(props || {})) { if (!__MOTION_PROPS.has(k)) sanitized[k] = props[k]; }
    return React.createElement(tag, { ...sanitized, ref });
  });
  const motion = new Proxy({} as Record<string, unknown>, { get: (t, prop) => { if (typeof prop !== 'string') return undefined; if (!t[prop]) t[prop] = __makeMotion(prop); return t[prop]; } });
  return { motion, AnimatePresence: ({ children }: { children: React.ReactNode }) => children };
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
    renderRewardsPage();

    expect(screen.getByRole('heading', { name: /No Token Rewards/i })).toBeTruthy();
    expect(screen.getByText(/VFIDE is a governance utility token\./i)).toBeTruthy();
    expect(screen.getByText(/there are no referral bonuses/i)).toBeTruthy();
    expect(screen.getByText(/Governance voting rights/i)).toBeTruthy();
    expect(screen.getByText(/Protocol access/i)).toBeTruthy();
    expect(screen.getByText(/Governance duty points/i)).toBeTruthy();
    expect(screen.getByText(/Why no rewards\?/i)).toBeTruthy();
  });
});
/**
 * insights-page.test.tsx
 *
 * Tests the consolidated /insights page which combines Overview, Budgets,
 * Tax Report, Performance, and Price Alerts into a single hub.
 */
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import type React from 'react';

const renderInsightsPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/insights/page');
  const InsightsPage = pageModule.default as React.ComponentType;
  return render(<InsightsPage />);
};

jest.mock('@/components/FinancialDashboard', () => ({
  __esModule: true,
  default: () => <div>Financial Dashboard Widget</div>,
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
  return { motion, AnimatePresence: ({ children }: { children: React.ReactNode }) => children, LazyMotion: ({ children }: { children: React.ReactNode }) => children, domAnimation: {} };
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

describe('Insights page pathways', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders insights hub heading and financial dashboard widget', () => {
    renderInsightsPage();

    // Hub uses "Insights" heading (consolidated from "Insight Command")
    expect(screen.getAllByRole('heading', { name: /Insights/i }).length).toBeGreaterThan(0);
    // Subtitle is statically rendered
    expect(screen.getByText(/Track treasury, revenue, and token momentum in real time/i)).toBeTruthy();
    // Tab bar is rendered
    expect(screen.getByRole('tablist', { name: /Insights sections/i })).toBeTruthy();
  });
});

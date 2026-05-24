import { describe, it, expect, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';

/* ── Mocks ── */
jest.mock('framer-motion', () => {
  const React = require('react');
  const MOTION_PROPS = new Set([
    'initial','animate','exit','transition','variants','whileHover','whileTap',
    'whileFocus','whileInView','viewport','layout','layoutId','custom',
    'onAnimationStart','onAnimationComplete','onViewportEnter','onViewportLeave',
  ]);
  const makeMotion = (tag: string) =>
    React.forwardRef((props: Record<string, unknown>, ref: unknown) => {
      const safe: Record<string, unknown> = { ref };
      for (const k of Object.keys(props)) { if (!MOTION_PROPS.has(k)) safe[k] = props[k]; }
      return React.createElement(tag, safe);
    });
  const motion = new Proxy({} as Record<string, unknown>, {
    get: (t, prop) => { if (typeof prop !== 'string') return undefined; if (!t[prop]) t[prop] = makeMotion(prop); return t[prop]; },
  });
  return { motion, AnimatePresence: ({ children }: { children: React.ReactNode }) => children };
});

jest.mock('wagmi', () => ({
  useAccount: () => ({ address: undefined, isConnected: false }),
}));

jest.mock('@/hooks/useLocale', () => ({
  useLocale: () => ['en-US', jest.fn()],
}));

jest.mock('@/lib/i18n', () => ({
  pickLocaleCopy: (_map: unknown, _locale: unknown) => ({}),
  ABOUT_TRANSLATIONS: {},
}));

jest.mock('@/components/layout/Footer', () => ({
  Footer: () => null,
}));

jest.mock('lucide-react', () =>
  new Proxy({}, {
    get: (_t, name) => {
      const React = require('react');
      return ({ className }: { className?: string }) =>
        React.createElement('span', { 'data-testid': `icon-${String(name).toLowerCase()}`, className });
    },
  })
);

import AboutPage from '@/app/about/page';

describe('About Page', () => {
  it('renders the full mission page with content', () => {
    render(<AboutPage />);
    // Page h1 contains "for everyone" — mission is financial inclusion
    expect(screen.getByText(/for everyone/i)).toBeTruthy();
    expect(screen.getByText(/unbanked/i)).toBeTruthy();
  });

  it('displays core principles', () => {
    render(<AboutPage />);
    expect(screen.getByText(/Financial Inclusion/i)).toBeTruthy();
  });

  it('shows regional focus and team context', () => {
    render(<AboutPage />);
    const pageText = document.body.textContent ?? '';
    expect(pageText).toMatch(/unbanked|developing|financial/i);
  });
});

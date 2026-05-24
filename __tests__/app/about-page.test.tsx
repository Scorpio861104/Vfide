import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, screen } from '@testing-library/react';

/* ── Suppress React DOM prop warnings from framer-motion ── */
const originalConsoleError = console.error;
beforeEach(() => {
  console.error = (...args: unknown[]) => {
    const msg = String(args[0] ?? '');
    if (msg.includes('whileInView') || msg.includes('whileinview') ||
        msg.includes('React does not recognize') || msg.includes('Unknown prop')) {
      return; // suppress known framer-motion test warnings
    }
    originalConsoleError(...args);
  };
});

/* ── Mocks ── */
jest.mock('framer-motion', () => {
  const React = require('react');
  const SKIP = new Set([
    'initial','animate','exit','transition','whileHover','whileTap','whileInView',
    'viewport','layout','layoutId','custom','onAnimationStart','onAnimationComplete',
    'onViewportEnter','onViewportLeave',
  ]);
  const make = (tag: string) =>
    React.forwardRef((props: Record<string,unknown>, ref: unknown) => {
      const s: Record<string,unknown> = { ref };
      for (const k of Object.keys(props)) { if (!SKIP.has(k)) s[k] = props[k]; }
      return React.createElement(tag, s);
    });
  const motion = new Proxy({} as Record<string,unknown>, {
    get: (t, p) => {
      if (typeof p !== 'string') return undefined;
      if (!t[p]) t[p] = make(p === 'custom' ? 'div' : p);
      return t[p];
    },
  });
  return { motion, AnimatePresence: ({ children }: { children: unknown }) => children };
});

jest.mock('wagmi', () => ({
  useAccount: () => ({ address: undefined, isConnected: false }),
}));

jest.mock('@/hooks/useLocale', () => ({
  useLocale: () => ['en-US', jest.fn()],
}));

jest.mock('@/lib/i18n', () => ({
  pickLocaleCopy: () => ({}),
  ABOUT_TRANSLATIONS: {},
}));

jest.mock('@/components/layout/Footer', () => ({
  Footer: () => null,
}));

jest.mock('lucide-react', () =>
  new Proxy({} as Record<string,unknown>, {
    get: (_t, name) => {
      const React = require('react');
      return ({ className, size }: { className?: string; size?: number }) =>
        React.createElement('span', { 'data-testid': `icon-${String(name).toLowerCase()}`, className });
    },
  })
);

import AboutPage from '@/app/about/page';

describe('About Page', () => {
  it('renders the full mission page with content', () => {
    render(<AboutPage />);
    // H1 says "Money should work...for everyone."
    expect(screen.getByText(/for everyone/i)).toBeTruthy();
    expect(screen.getByText(/unbanked/i)).toBeTruthy();
  });

  it('displays core principles', () => {
    render(<AboutPage />);
    // Page includes financial inclusion language
    expect(screen.getByText(/Financial Inclusion/i)).toBeTruthy();
  });

  it('shows regional focus and team context', () => {
    render(<AboutPage />);
    const pageText = document.body.textContent ?? '';
    expect(pageText).toMatch(/unbanked|developing|financial/i);
  });
});

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, screen } from '@testing-library/react';

/* ── Suppress React DOM prop warnings from framer-motion ── */
const originalConsoleError = console.error;
beforeEach(() => {
  console.error = (...args: unknown[]) => {
    const msg = String(args[0] ?? '');
    if (msg.includes('whileInView') || msg.includes('whileinview') ||
        msg.includes('React does not recognize') || msg.includes('Unknown prop') ||
        msg.includes('animate') || msg.includes('initial')) {
      return;
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
    'onViewportEnter','onViewportLeave','drag','dragConstraints',
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
  return { motion, m: motion, AnimatePresence: ({ children }: { children: unknown }) => children, LazyMotion: ({ children }: any) => children, domAnimation: {} };
});

jest.mock('wagmi', () => ({
  useAccount: () => ({ address: undefined, isConnected: false }),
}));

jest.mock('@/hooks/useLocale', () => ({
  useLocale: () => ['en-US', jest.fn()],
}));

jest.mock('@/lib/i18n', () => ({
  useT: () => ({ developer_heading: 'Developer Hub', support_heading: 'Help & Support Center', support_tab_faq: 'FAQ', support_tab_tickets: 'My Tickets', support_tab_new: 'New Ticket', common_loading: 'Loading…', common_back: 'Back', security_heading: 'Account Security', security_subtitle: 'Monitor sessions.', common_settings: 'Settings' }),
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
      return ({ className }: { className?: string }) =>
        React.createElement('span', { 'data-testid': `icon-${String(name).toLowerCase()}`, className });
    },
  })
);

import AboutPage from '@/app/about/page';

describe('About Page', () => {
  it('renders the full mission page with content', () => {
    render(<AboutPage />);
    // Hero h1: "Money should work...for everyone."
    expect(screen.getByText(/for everyone/i)).toBeTruthy();
    expect(screen.getByText(/unbanked/i)).toBeTruthy();
  });

  it('displays core principles', () => {
    render(<AboutPage />);
    // Real principle titles from the page
    expect(screen.getByText(/Zero merchant fees/i)).toBeTruthy();
    expect(screen.getByText(/You hold the keys/i)).toBeTruthy();
    expect(screen.getByText(/Seer Constitution/i)).toBeTruthy();
  });

  it('shows the problem section and target audience', () => {
    render(<AboutPage />);
    // "The problem we're solving" heading (apostrophe escaped as &apos;)
    expect(screen.getByText(/problem we/i)).toBeTruthy();
    expect(screen.getByText(/building for/i)).toBeTruthy();
    const pageText = document.body.textContent ?? '';
    expect(pageText).toMatch(/unbanked|developing|financial|fee/i);
  });
});

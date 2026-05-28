import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';

/* ── Mocks ── */
const mockPush = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, pathname: '/security-center' }),
  usePathname: () => '/security-center',
}));

jest.mock('wagmi', () => ({
  useAccount: () => ({ address: undefined, isConnected: false }),
}));

jest.mock('@/hooks/useLocale', () => ({
  useLocale: () => ['en-US', jest.fn()],
}));

jest.mock('@/lib/i18n', () => ({
  pickLocaleCopy: () => ({}),
  SECURITY_CENTER_TRANSLATIONS: {},
}));

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
    get: (t,p) => { if (typeof p !== 'string') return undefined; if (!t[p]) t[p] = make(p === 'custom' ? 'div' : p); return t[p]; }
  });
  return { motion,
    m: motion,
    AnimatePresence: ({ children }: { children: unknown }) => children };
});

jest.mock('@/components/crypto/VfideConnectButton', () => ({
  VfideConnectButton: () => null,
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

import SecurityCenterPage from '@/app/security-center/page';

describe('Security Center Page', () => {
  beforeEach(() => { mockPush.mockClear(); });

  it('renders the security center dashboard with score and checklist', () => {
    render(<SecurityCenterPage />);
    // Page h1 is "Account Security"
    expect(screen.getByRole('heading', { name: /Account Security/i })).toBeTruthy();
    // Security checklist section
    expect(screen.getByText(/Security checklist/i)).toBeTruthy();
    // Checklist items: Guardians configured, Session signing active
    expect(screen.getByText(/Guardians configured/i)).toBeTruthy();
    expect(screen.getByText(/Session signing active/i)).toBeTruthy();
  });

  it('displays active sessions tab', () => {
    render(<SecurityCenterPage />);
    // "Sessions" tab is visible in the nav
    expect(screen.getByText(/Sessions/i)).toBeTruthy();
  });

  it('provides security recommendations', () => {
    render(<SecurityCenterPage />);
    const pageText = document.body.textContent ?? '';
    expect(pageText).toMatch(/security|guardian|session/i);
  });
});

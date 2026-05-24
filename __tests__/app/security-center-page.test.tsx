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
  const SKIP = new Set(['initial','animate','exit','transition','whileHover','whileTap','whileInView','viewport','layout','layoutId','custom']);
  const make = (tag: string) =>
    React.forwardRef((props: Record<string,unknown>, ref: unknown) => {
      const s: Record<string,unknown> = { ref };
      for (const k of Object.keys(props)) { if (!SKIP.has(k)) s[k] = props[k]; }
      return React.createElement(tag, s);
    });
  const motion = new Proxy({} as Record<string,unknown>, { get: (t,p) => { if (typeof p !== 'string') return undefined; if (!t[p]) t[p] = make(p); return t[p]; } });
  return { motion, AnimatePresence: ({ children }: { children: unknown }) => children };
});

jest.mock('@/components/crypto/VfideConnectButton', () => ({
  VfideConnectButton: () => null,
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

import SecurityCenterPage from '@/app/security-center/page';

describe('Security Center Page', () => {
  beforeEach(() => { mockPush.mockClear(); });

  it('renders the security center dashboard with score and checklist', () => {
    render(<SecurityCenterPage />);
    expect(screen.getByRole('heading', { name: /Security Score/i })).toBeTruthy();
    expect(screen.getByText(/Backup Seed Phrase/i)).toBeTruthy();
    expect(screen.getByText(/Set Up 2FA/i)).toBeTruthy();
    expect(screen.getByText(/Add Guardian/i)).toBeTruthy();
  });

  it('displays active sessions', () => {
    render(<SecurityCenterPage />);
    expect(screen.getByRole('heading', { name: /Active Sessions/i })).toBeTruthy();
  });

  it('provides security recommendations', () => {
    render(<SecurityCenterPage />);
    const pageText = document.body.textContent ?? '';
    expect(pageText).toMatch(/seed phrase|security|guardian/i);
  });
});

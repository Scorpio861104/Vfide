import { render, screen } from '@testing-library/react';

/* ── Mocks ───────────────────────────────────────────────────────────────
 * The page reads `useLocale` from @/lib/locale/LocaleProvider (NOT @/hooks/useLocale),
 * and `locale` is unused (`void locale`), so a trivial stub suffices. The three heavy
 * security sub-components only render on their own tabs (not the default Overview tab);
 * they pull in transitive deps that are undefined under jsdom, so stub them — this suite
 * exercises the page's own structure (header, tabs, Overview content), not their internals.
 */
const mockPush = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, pathname: '/security-center' }),
  usePathname: () => '/security-center',
}));

jest.mock('wagmi', () => ({
  useAccount: () => ({ address: undefined, isConnected: false }),
}));

jest.mock('@/lib/locale/LocaleProvider', () => ({
  useLocale: () => ({ locale: 'en-US' }),
}));

jest.mock('framer-motion', () => {
  const React = require('react');
  const SKIP = new Set([
    'initial', 'animate', 'exit', 'transition', 'whileHover', 'whileTap', 'whileInView',
    'viewport', 'layout', 'layoutId', 'custom', 'onAnimationStart', 'onAnimationComplete',
    'onViewportEnter', 'onViewportLeave', 'drag', 'dragConstraints', 'mode',
  ]);
  const make = (tag: string) =>
    React.forwardRef((props: Record<string, unknown>, ref: unknown) => {
      const s: Record<string, unknown> = { ref };
      for (const k of Object.keys(props)) { if (!SKIP.has(k)) s[k] = props[k]; }
      return React.createElement(tag, s);
    });
  const motion = new Proxy({} as Record<string, unknown>, {
    get: (t, p) => { if (typeof p !== 'string') return undefined; if (!t[p]) t[p] = make(p); return t[p]; },
  });
  return { motion, m: motion, AnimatePresence: ({ children }: { children: unknown }) => children };
});

jest.mock('lucide-react', () =>
  new Proxy({} as Record<string, unknown>, {
    get: (_t, name) => {
      const React = require('react');
      return ({ className }: { className?: string }) =>
        React.createElement('span', { 'data-testid': `icon-${String(name).toLowerCase()}`, className });
    },
  })
);

jest.mock('@/components/layout/Footer', () => ({ Footer: () => null }));
jest.mock('@/components/security/BiometricSetup', () => ({ BiometricSetup: () => null }));
jest.mock('@/components/security/SecurityLogsDashboard', () => ({ SecurityLogsDashboard: () => null }));
jest.mock('@/components/security/ThreatDetectionPanel', () => ({ ThreatDetectionPanel: () => null }));

import SecurityCenterPage from '@/app/security-center/page';

describe('Security Center Page', () => {
  beforeEach(() => { mockPush.mockClear(); });

  it('renders the Security Center header and intro', () => {
    render(<SecurityCenterPage />);
    // h1 (distinct from the "badge-live" pill, which also reads "Security Center")
    expect(screen.getByRole('heading', { name: /Security Center/i })).toBeTruthy();
    expect(screen.getByText(/Manage authentication methods/i)).toBeTruthy();
  });

  it('shows the security tabs', () => {
    render(<SecurityCenterPage />);
    expect(screen.getByRole('tablist')).toBeTruthy();
    // Tab labels are hardcoded; assert the unambiguous ones.
    expect(screen.getByText('Overview')).toBeTruthy();
    expect(screen.getByText('Biometric')).toBeTruthy();
    expect(screen.getByText('Threat Detection')).toBeTruthy();
  });

  it('renders the Overview tab content by default', () => {
    render(<SecurityCenterPage />);
    expect(screen.getByText('Two-Factor Auth')).toBeTruthy();
    expect(screen.getByText('Quick Actions')).toBeTruthy();
    expect(screen.getByText('Recent Activity')).toBeTruthy();
  });
});

import { describe, it, expect, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import type React from 'react';

const renderRecoveryStatusPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/vault/recover/status/page');
  const RecoveryStatusPage = pageModule.default as React.ComponentType;
  return render(<RecoveryStatusPage />);
};

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, ...props }: any) => <a href={href} {...props}>{children}</a>,
}));

jest.mock('next/navigation', () => ({
  useSearchParams: () => ({
    get: () => null,
  }),
}));

jest.mock('wagmi', () => ({
  usePublicClient: () => null,
  useReadContract: () => ({ data: undefined }),
}));

jest.mock('@/lib/locale/LocaleProvider', () => ({
  useLocale: () => ({ locale: 'en' }),
}));

jest.mock('@/components/ui/GlassCard', () => ({
  GlassCard: ({ children }: { children: React.ReactNode }) => <div data-testid="glass-card">{children}</div>,
}));

jest.mock('@/components/layout/Footer', () => ({
  Footer: () => <div data-testid="footer" />,
}));

jest.mock('@/hooks/useRecoveryClaim', () => ({
  RecoveryClaimStatus: {
    None: 0,
    Pending: 1,
    GuardianApproved: 2,
    Approved: 3,
    Challenged: 4,
    Rejected: 5,
    Expired: 6,
    Executed: 7,
  },
  useRecoveryClaim: () => ({
    state: null,
    refresh: jest.fn(),
    finalizeClaim: jest.fn(),
    isFinalizing: false,
  }),
}));

jest.mock('lucide-react', () => {
  const Icon = ({ className }: { className?: string }) => <span className={className}>icon</span>;
  return new Proxy({}, { get: () => Icon });
});

describe('Vault recovery status route', () => {
  it('renders lookup flow when no vault query param is present', () => {
    renderRecoveryStatusPage();

    expect(screen.getByRole('heading', { name: /Recovery status/i })).toBeTruthy();
    expect(screen.getByRole('link', { name: /Back to recovery search/i }).getAttribute('href')).toBe('/vault/recover');
    expect(screen.getByRole('button', { name: /Look up/i })).toBeDisabled();
    expect(screen.getByPlaceholderText(/0x... or recovery ID/i)).toBeTruthy();
    expect(screen.getByTestId('footer')).toBeTruthy();
  });
});

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import type React from 'react';

let mockAddress: `0x${string}` | undefined;
let mockHasVault = false;
let mockIsLoadingVault = false;

const renderPendingChangesPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/vault/pending-changes/page');
  const PendingChangesPage = pageModule.default as React.ComponentType;
  return render(<PendingChangesPage />);
};

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, ...props }: any) => <a href={href} {...props}>{children}</a>,
}));

jest.mock('wagmi', () => ({
  useAccount: () => ({ address: mockAddress }),
  useReadContract: () => ({ data: undefined }),
}));

jest.mock('@/lib/locale/LocaleProvider', () => ({
  useLocale: () => ({ locale: 'en' }),
}));

jest.mock('@/components/layout/Footer', () => ({
  Footer: () => <div data-testid="footer" />,
}));

jest.mock('@/components/ui/GlassCard', () => ({
  GlassCard: ({ children }: { children: React.ReactNode }) => <div data-testid="glass-card">{children}</div>,
}));

jest.mock('@/hooks/useVaultHub', () => ({
  useVaultHub: () => ({
    vaultAddress: undefined,
    hasVault: mockHasVault,
    isLoadingVault: mockIsLoadingVault,
  }),
}));

jest.mock('@/hooks/usePendingChanges', () => ({
  usePendingChanges: () => ({
    changes: [],
    apply: jest.fn(),
    cancel: jest.fn(),
    isWritePending: false,
    refetch: jest.fn(),
  }),
}));

jest.mock('lucide-react', () => {
  const Icon = ({ className }: { className?: string }) => <span className={className}>icon</span>;
  return new Proxy({}, { get: () => Icon });
});

jest.mock('framer-motion', () => ({
  motion: new Proxy({}, { get: () => ({ children }: any) => <div>{children}</div> }),
}));

describe('Vault pending changes route', () => {
  beforeEach(() => {
    mockAddress = undefined;
    mockHasVault = false;
    mockIsLoadingVault = false;
  });

  it('renders connect-wallet state and back-link when disconnected', () => {
    renderPendingChangesPage();

    expect(screen.getByRole('heading', { name: /Pending changes/i })).toBeTruthy();
    expect(screen.getByRole('link', { name: /Back to your vault/i }).getAttribute('href')).toBe('/vault');
    expect(screen.getByText(/Connect your wallet/i)).toBeTruthy();
    expect(screen.getByTestId('footer')).toBeTruthy();
  });
});

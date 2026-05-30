import { describe, it, expect, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import type React from 'react';

const renderVaultSafetyWindowPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/vault/safety/window/page');
  const VaultSafetyWindowPage = pageModule.default as React.ComponentType;
  return render(<VaultSafetyWindowPage />);
};

jest.mock('wagmi', () => ({
  useAccount: () => ({ address: undefined }),
  usePublicClient: () => null,
  useReadContract: () => ({ data: 0n, refetch: jest.fn() }),
  useWriteContract: () => ({ writeContractAsync: jest.fn(), isPending: false }),
}));

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, ...props }: any) => <a href={href} {...props}>{children}</a>,
}));

jest.mock('@/hooks/useVaultHub', () => ({
  useVaultHub: () => ({ vaultAddress: undefined, hasVault: false }),
}));

jest.mock('@/lib/contracts', () => ({
  ACTIVE_VAULT_ABI: [],
}));

jest.mock('@/components/ui/GlassCard', () => ({
  GlassCard: ({ children }: any) => <div>{children}</div>,
}));

jest.mock('@/lib/locale/LocaleProvider', () => ({
  useLocale: () => ({ locale: 'en' }),
}));

jest.mock('@/components/layout/Footer', () => ({
  Footer: () => <div data-testid="footer" />,
}));

jest.mock('lucide-react', () => {
  const Icon = ({ className }: { className?: string }) => <span className={className}>icon</span>;
  return new Proxy({}, { get: () => Icon });
});

describe('Vault safety window route', () => {
  it('renders no-vault guard message', () => {
    renderVaultSafetyWindowPage();

    expect(screen.getByRole('heading', { name: /Your veto window/i })).toBeTruthy();
    expect(screen.getByText(/No vault found on this wallet/i)).toBeTruthy();
  });
});

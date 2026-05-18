import { describe, it, expect, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import type React from 'react';

const mockIsCardBoundVaultMode = jest.fn(() => false);

const renderVaultSettingsPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/vault/settings/page');
  const VaultSettingsPage = pageModule.default as React.ComponentType;
  return render(<VaultSettingsPage />);
};

jest.mock('@/components/layout/Footer', () => ({
  Footer: () => <div data-testid="footer" />,
}));

jest.mock('@/components/vault/VaultSettingsPanel', () => ({
  VaultSettingsPanel: () => <div data-testid="vault-settings-panel">VaultSettingsPanel</div>,
}));

jest.mock('@/components/security/GuardianManagementPanel', () => ({
  GuardianManagementPanel: () => <div data-testid="guardian-management-panel">GuardianManagementPanel</div>,
}));

jest.mock('@/lib/contracts', () => ({
  isCardBoundVaultMode: () => mockIsCardBoundVaultMode(),
}));

jest.mock('framer-motion', () => {
  const motion = new Proxy(
    {},
    {
      get: () => ({ children, ...props }: any) => <div {...props}>{children}</div>,
    }
  );

  return { motion };
});

jest.mock('lucide-react', () => {
  const Icon = ({ className }: { className?: string }) => <span className={className}>icon</span>;
  return {
    Vault: Icon,
    Shield: Icon,
    Settings: Icon,
  };
});

describe('Vault settings page logic pathways', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsCardBoundVaultMode.mockReturnValue(false);
  });

  it('renders primary security control sections and mounted panels', () => {
    renderVaultSettingsPage();

    expect(screen.getByText(/Vault Settings/i)).toBeTruthy();
    expect(screen.getByText(/Transaction Controls/i)).toBeTruthy();
    expect(screen.getByText(/Guardian Protection/i)).toBeTruthy();

    expect(screen.getByTestId('vault-settings-panel')).toBeTruthy();
    expect(screen.getByTestId('guardian-management-panel')).toBeTruthy();
  });

  it('relabels legacy inheritance guidance in CardBound mode', () => {
    mockIsCardBoundVaultMode.mockReturnValue(true);

    renderVaultSettingsPage();

    expect(screen.getByText(/Guardian Governance/i)).toBeTruthy();
    expect(screen.getByText(/wallet-rotation and vault-protection actions instead of legacy inheritance claims/i)).toBeTruthy();
    expect(screen.queryByText(/^Inheritance Guard$/i)).toBeNull();
  });
});
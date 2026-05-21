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
  // CANONICAL_CONTRACTS_MOCK_V4
  CONTRACT_ADDRESSES: { VFIDEToken: '0x1111111111111111111111111111111111111101', StablecoinRegistry: '0x1111111111111111111111111111111111111102', MerchantPortal: '0x1111111111111111111111111111111111111103', MerchantRegistry: '0x1111111111111111111111111111111111111104', VaultHub: '0x1111111111111111111111111111111111111105', Seer: '0x1111111111111111111111111111111111111106', SeerView: '0x1111111111111111111111111111111111111107', DAO: '0x1111111111111111111111111111111111111108', DAOTimelock: '0x1111111111111111111111111111111111111109', TrustGateway: '0x111111111111111111111111111111111111110a', GuardianRegistry: '0x111111111111111111111111111111111111110b', GuardianLock: '0x111111111111111111111111111111111111110c', PanicGuard: '0x111111111111111111111111111111111111110d', EmergencyBreaker: '0x111111111111111111111111111111111111110e' },
  CONTRACTS: {},
  getContractAddresses: jest.fn(() => ({ VFIDEToken: '0x1111111111111111111111111111111111111101', StablecoinRegistry: '0x1111111111111111111111111111111111111102', MerchantPortal: '0x1111111111111111111111111111111111111103', MerchantRegistry: '0x1111111111111111111111111111111111111104', VaultHub: '0x1111111111111111111111111111111111111105', Seer: '0x1111111111111111111111111111111111111106', SeerView: '0x1111111111111111111111111111111111111107', DAO: '0x1111111111111111111111111111111111111108', DAOTimelock: '0x1111111111111111111111111111111111111109', TrustGateway: '0x111111111111111111111111111111111111110a', GuardianRegistry: '0x111111111111111111111111111111111111110b', GuardianLock: '0x111111111111111111111111111111111111110c', PanicGuard: '0x111111111111111111111111111111111111110d', EmergencyBreaker: '0x111111111111111111111111111111111111110e' })),
  isConfiguredContractAddress: jest.fn(() => true),
  validateContractAddress: jest.fn((addr: any) => addr),
  ZERO_ADDRESS: '0x0000000000000000000000000000000000000000',
  CURRENT_CHAIN_ID: 84532,
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

jest.mock('lucide-react', () => (() => { /* LucideProxyFallback */
  const __orig = {
  const Icon = ({ className }: { className?: string }) => <span className={className}>icon</span>;
  return {
    Vault: Icon,
    Shield: Icon,
    Settings: Icon,
  };
};
  return new Proxy(__orig, {
    get: (t, prop) => {
      if (prop in t) return (t as any)[prop];
      if (prop === '__esModule') return true;
      if (typeof prop === 'symbol') return undefined;
      const name = String(prop);
      const Icon = ({ className, ...rest }: any) => {
        const React = require('react');
        return React.createElement('span', { 'data-testid': `${name.toLowerCase()}-icon`, className, ...rest });
      };
      Icon.displayName = `LucideMock(${name})`;
      return Icon;
    },
  });
})());

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
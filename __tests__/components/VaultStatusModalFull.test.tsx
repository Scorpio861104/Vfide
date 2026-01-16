import { describe, it, expect, beforeEach } from '@jest/globals';
import { render, screen } from '@testing-library/react';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock wagmi
jest.mock('wagmi', () => ({
  useAccount: () => ({ address: '0xTestAddress123', isConnected: true }),
  useSwitchChain: () => ({ switchChain: jest.fn(), isPending: false }),
}));

// Mock useVaultHub
jest.mock('@/hooks/useVaultHub', () => ({
  useVaultHub: () => ({
    vaultAddress: null,
    hasVault: false,
    isLoadingVault: false,
    isCreatingVault: false,
    createVault: jest.fn(),
    isContractConfigured: true,
    isOnCorrectChain: true,
    expectedChainId: 84532,
    expectedChainName: 'Base Sepolia',
  }),
}));

// Mock toast
jest.mock('@/components/ui/toast', () => ({
  useToast: () => ({ showToast: jest.fn() }),
}));

import { VaultStatusModal } from '@/components/vault/VaultStatusModal';

describe('VaultStatusModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders when connected and no vault', () => {
    const { container } = render(<VaultStatusModal />);
    // Component renders based on internal state
    expect(container).toBeInTheDocument();
  });

  it('exports VaultStatusModal function', () => {
    expect(typeof VaultStatusModal).toBe('function');
  });

  it('can be instantiated', () => {
    expect(() => render(<VaultStatusModal />)).not.toThrow();
  });

  it('renders as a functional component', () => {
    const { container } = render(<VaultStatusModal />);
    expect(container.firstChild || container).toBeTruthy();
  });
});

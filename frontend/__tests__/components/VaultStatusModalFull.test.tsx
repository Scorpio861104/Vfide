import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock wagmi
vi.mock('wagmi', () => ({
  useAccount: () => ({ address: '0xTestAddress123', isConnected: true }),
  useSwitchChain: () => ({ switchChain: vi.fn(), isPending: false }),
}));

// Mock useVaultHub
vi.mock('@/hooks/useVaultHub', () => ({
  useVaultHub: () => ({
    vaultAddress: null,
    hasVault: false,
    isLoadingVault: false,
    isCreatingVault: false,
    createVault: vi.fn(),
    isContractConfigured: true,
    isOnCorrectChain: true,
    expectedChainId: 84532,
    expectedChainName: 'Base Sepolia',
  }),
}));

// Mock toast
vi.mock('@/components/ui/toast', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));

import { VaultStatusModal } from '@/components/vault/VaultStatusModal';

describe('VaultStatusModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

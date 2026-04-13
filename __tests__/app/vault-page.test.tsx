import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type React from 'react';

const mockShowToast = jest.fn();
const mockCreateVault = jest.fn(async () => {});
const mockSetNextOfKinAddress = jest.fn(async (_address: `0x${string}`) => {});
const mockAddGuardian = jest.fn(async (_address: `0x${string}`) => {});
const mockRefetchAllowance = jest.fn(async () => ({ data: 0n }));

let mockAddress: `0x${string}` | undefined;
let mockRainbowMounted = true;

let mockVaultHubState: {
  vaultAddress?: `0x${string}`;
  hasVault: boolean;
  isLoadingVault: boolean;
  createVault: () => Promise<void>;
  isCreatingVault: boolean;
  isOnCorrectChain: boolean;
  expectedChainName: string;
  refetchVault: () => void;
};

let mockVaultRecoveryState: {
  vaultOwner: string | null;
  guardianCount: number;
  isUserGuardian: boolean;
  nextOfKin: string;
  inheritanceStatus: { isActive: boolean; daysRemaining: number };
  isWritePending: boolean;
  setNextOfKinAddress: (_address: `0x${string}`) => Promise<void>;
  addGuardian: (_address: `0x${string}`) => Promise<void>;
};

const renderVaultPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/vault/page');
  const VaultPage = pageModule.default as React.ComponentType;
  return render(<VaultPage />);
};

jest.mock('@/components/layout/Footer', () => ({
  Footer: () => <div data-testid="footer" />,
}));

jest.mock('@/components/vault/TransactionHistory', () => ({
  TransactionHistory: () => <div data-testid="transaction-history" />,
}));

jest.mock('@/components/ui/Skeleton', () => ({
  Skeleton: ({ className }: { className?: string }) => <div data-testid="skeleton" className={className} />,
}));

jest.mock('@/components/ui/toast', () => ({
  useToast: () => ({ showToast: mockShowToast }),
}));

jest.mock('@rainbow-me/rainbowkit', () => ({
  ConnectButton: {
    Custom: ({ children }: { children: (props: { openConnectModal: () => void; openChainModal: () => void; mounted: boolean }) => React.ReactNode }) =>
      children({ openConnectModal: jest.fn(), openChainModal: jest.fn(), mounted: mockRainbowMounted }),
  },
}));

jest.mock('@/hooks/useVaultHub', () => ({
  useVaultHub: () => mockVaultHubState,
}));

jest.mock('@/hooks/useVaultRecovery', () => ({
  useVaultRecovery: () => mockVaultRecoveryState,
}));

jest.mock('@/lib/vfide-hooks', () => ({
  useVaultBalance: () => ({ balance: '123.45', isLoading: false }),
  useSelfPanic: () => ({
    selfPanic: jest.fn(),
    isPanicking: false,
    isAvailable: true,
  }),
  useQuarantineStatus: () => ({ quarantineUntil: 0 }),
  useCanSelfPanic: () => ({ lastPanicTime: 0, cooldownSeconds: 0 }),
}));

jest.mock('@/lib/contracts', () => ({
  CONTRACT_ADDRESSES: {
    VFIDEToken: '0x1111111111111111111111111111111111111111',
    VaultHub: '0x2222222222222222222222222222222222222222',
  },
  isConfiguredContractAddress: () => true,
  VFIDETokenABI: [],
  VaultHubABI: [],
  UserVaultABI: [],
  CARD_BOUND_VAULT_ABI: [],
  isCardBoundVaultMode: () => false,
}));

jest.mock('wagmi', () => ({
  useAccount: () => ({ address: mockAddress }),
  useWriteContract: () => ({ writeContractAsync: jest.fn() }),
  useChainId: () => 1,
  useSignTypedData: () => ({ signTypedDataAsync: jest.fn() }),
  useReadContract: (args: { functionName?: string }) => {
    if (args?.functionName === 'balanceOf') {
      return { data: 1000000000000000000000n };
    }
    if (args?.functionName === 'allowance') {
      return { data: 0n, refetch: mockRefetchAllowance };
    }
    if (args?.functionName === 'nextNonce') {
      return { data: 0n };
    }
    if (args?.functionName === 'walletEpoch') {
      return { data: 0n };
    }
    return { data: undefined };
  },
}));

jest.mock('viem', () => ({
  isAddress: (value: string) => /^0x[a-fA-F0-9]{40}$/.test(value),
  parseUnits: (value: string) => BigInt(Math.floor(parseFloat(value || '0') * 1e18)),
  formatUnits: (value: bigint) => String(Number(value) / 1e18),
}));

jest.mock('framer-motion', () => {
  const motion = new Proxy(
    {},
    {
      get: (_target, prop: string) => {
        if (prop === 'button') {
          return ({ children, ...props }: any) => <button {...props}>{children}</button>;
        }
        return ({ children, ...props }: any) => <div {...props}>{children}</div>;
      },
    }
  );

  return {
    motion,
    AnimatePresence: ({ children }: any) => <>{children}</>,
  };
});

jest.mock('lucide-react', () => {
  const Icon = ({ className }: { className?: string }) => <span className={className}>icon</span>;
  return {
    Shield: Icon,
    AlertTriangle: Icon,
    Lock: Icon,
    Clock: Icon,
    Plus: Icon,
    UserPlus: Icon,
    Users: Icon,
    Key: Icon,
    Heart: Icon,
    ArrowDownToLine: Icon,
    ArrowUpFromLine: Icon,
    RefreshCw: Icon,
    CheckCircle2: Icon,
    Zap: Icon,
    DollarSign: Icon,
    TrendingUp: Icon,
    X: Icon,
    Loader2: Icon,
  };
});

describe('Vault page logic pathways', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockAddress = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
    mockRainbowMounted = true;
    mockVaultHubState = {
      vaultAddress: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      hasVault: true,
      isLoadingVault: false,
      createVault: mockCreateVault,
      isCreatingVault: false,
      isOnCorrectChain: true,
      expectedChainName: 'Base Sepolia',
      refetchVault: jest.fn(),
    };
    mockVaultRecoveryState = {
      vaultOwner: mockAddress,
      guardianCount: 2,
      isUserGuardian: false,
      nextOfKin: '0x0000000000000000000000000000000000000000',
      inheritanceStatus: {
        isActive: false,
        daysRemaining: 0,
      },
      isWritePending: false,
      setNextOfKinAddress: mockSetNextOfKinAddress,
      addGuardian: mockAddGuardian,
    };
  });

  it('shows wallet connection warning when no wallet is connected', async () => {
    mockAddress = undefined;
    mockVaultHubState = {
      ...mockVaultHubState,
      hasVault: false,
      vaultAddress: undefined,
    };

    renderVaultPage();

    expect(await screen.findByText(/Wallet Not Connected/i)).toBeTruthy();
    expect(screen.getByText(/Please connect your wallet/i)).toBeTruthy();
  });

  it('keeps wallet connect action disabled until the wallet UI is mounted', () => {
    mockAddress = undefined;
    mockRainbowMounted = false;
    mockVaultHubState = {
      ...mockVaultHubState,
      hasVault: false,
      vaultAddress: undefined,
    };

    renderVaultPage();

    expect(screen.getByRole('button', { name: /Connect your wallet/i })).toBeDisabled();
  });

  it('creates a vault from empty state and reports success toast', async () => {
    mockVaultHubState = {
      ...mockVaultHubState,
      hasVault: false,
      vaultAddress: undefined,
    };

    renderVaultPage();

    fireEvent.click(screen.getByRole('button', { name: /Create Vault/i }));

    await waitFor(() => {
      expect(mockCreateVault).toHaveBeenCalledTimes(1);
    });

    expect(mockShowToast).toHaveBeenCalledWith('Vault created successfully!', 'success');
  });

  it('blocks invalid next-of-kin address before contract call', async () => {
    renderVaultPage();

    const kinInput = screen.getAllByRole('textbox')[0] as HTMLInputElement;
    expect(kinInput).toBeTruthy();

    fireEvent.change(kinInput, {
      target: { value: 'invalid-address' },
    });
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Set Next of Kin/i })).not.toBeDisabled();
    });
    fireEvent.click(screen.getByRole('button', { name: /Set Next of Kin/i }));

    expect(mockSetNextOfKinAddress).not.toHaveBeenCalled();
    expect(mockShowToast).toHaveBeenCalledWith('Invalid address format', 'error');
  });

  it('blocks invalid guardian address before contract call', async () => {
    renderVaultPage();

    const guardianInput = screen.getAllByRole('textbox')[1] as HTMLInputElement;
    expect(guardianInput).toBeTruthy();

    fireEvent.change(guardianInput, {
      target: { value: 'bad-guardian' },
    });
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Add Guardian/i })).not.toBeDisabled();
    });
    fireEvent.click(screen.getByRole('button', { name: /Add Guardian/i }));

    expect(mockAddGuardian).not.toHaveBeenCalled();
    expect(mockShowToast).toHaveBeenCalledWith('Invalid address format', 'error');
  });

  it('shows a connect wallet button in the not-connected state', () => {
    mockAddress = undefined;
    mockVaultHubState = { ...mockVaultHubState, hasVault: false, vaultAddress: undefined };

    renderVaultPage();

    expect(screen.getByText(/Wallet Not Connected/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /Connect your wallet/i })).toBeTruthy();
  });

  it('shows wrong network banner when wallet is connected but on the wrong chain', () => {
    mockVaultHubState = { ...mockVaultHubState, isOnCorrectChain: false, expectedChainName: 'Base Sepolia' };

    renderVaultPage();

    expect(screen.getByText(/Wrong Network/i)).toBeTruthy();
    expect(screen.getByText(/Base Sepolia/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /Switch to Base Sepolia/i })).toBeTruthy();
  });

  it('calls refetchVault after successful vault creation', async () => {
    jest.useFakeTimers();
    const mockRefetchVault = jest.fn();
    mockVaultHubState = {
      ...mockVaultHubState,
      hasVault: false,
      vaultAddress: undefined,
      refetchVault: mockRefetchVault,
    };

    renderVaultPage();

    fireEvent.click(screen.getByRole('button', { name: /Create Vault/i }));

    await waitFor(() => {
      expect(mockCreateVault).toHaveBeenCalledTimes(1);
    });

    // The refetch is fired after a 2-second delay
    jest.advanceTimersByTime(2000);
    expect(mockRefetchVault).toHaveBeenCalledTimes(1);

    jest.useRealTimers();
  });
});
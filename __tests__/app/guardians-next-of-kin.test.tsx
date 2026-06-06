import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type React from 'react';

const mockCreateVault = jest.fn(async () => {});
const mockWriteContractAsync = jest.fn(async (_config?: Record<string, unknown>) => '0xhash');
const mockWaitForTransactionReceipt = jest.fn(async () => ({}));
const mockPublicClient = {
  waitForTransactionReceipt: mockWaitForTransactionReceipt,
};
const mockFetch: jest.MockedFunction<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>> = jest.fn();

let mockVaultHubState: {
  vaultAddress?: `0x${string}`;
  hasVault: boolean;
  isLoadingVault: boolean;
  createVault: () => Promise<void>;
  isCreatingVault: boolean;
};

let mockVaultRecoveryState: {
  vaultOwner?: `0x${string}`;
  nextOfKin?: `0x${string}`;
  inheritanceStatus: {
    isActive: boolean;
    approvals: number;
    threshold: number;
    denied: boolean;
    expiryTime: number | null;
    daysRemaining: number | null;
  };
  isUserGuardian: boolean;
  isUserGuardianMature: boolean;
  isWritePending: boolean;
  setNextOfKinAddress: (_next: `0x${string}`) => Promise<void>;
  requestInheritance: () => Promise<void>;
  approveInheritance: () => Promise<void>;
  denyInheritance: () => Promise<void>;
  finalizeInheritance: () => Promise<void>;
  cancelInheritance: () => Promise<void>;
  guardianCancelInheritance: () => Promise<void>;
};

let mockInboxVaultState: {
  owner: `0x${string}`;
  nextOfKin: `0x${string}`;
  isGuardian: boolean;
  isGuardianMature: boolean;
  inheritance: [boolean, bigint, bigint, bigint, boolean];
};

const renderGuardiansPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/guardians/page');
  const GuardiansPage = pageModule.default as React.ComponentType;
  return render(<GuardiansPage />);
};

const openInheritanceTab = async () => {
  fireEvent.click(screen.getByRole('tab', { name: /Inheritance/i }));
  return await screen.findByPlaceholderText(
    /Vault address/i,
    undefined,
    { timeout: 10000 }
  );
};

jest.mock('@/components/layout/Footer', () => ({
  Footer: () => <div data-testid="footer" />,
}));

jest.mock('@/lib/locale/LocaleProvider', () => ({
  useLocale: () => ({ locale: 'en' }),
}));

jest.mock('viem', () => ({
  isAddress: (value: string) => /^0x[a-fA-F0-9]{40}$/.test(value),
  toBytes: (value: string) => new TextEncoder().encode(value),
  keccak256: (_value: Uint8Array | string) => '0x' + '2'.repeat(64),
}));

jest.mock('@/hooks/useVaultHub', () => ({
  useVaultHub: () => mockVaultHubState,
}));

jest.mock('@/hooks/useVaultRecovery', () => ({
  useVaultRecovery: () => mockVaultRecoveryState,
}));

jest.mock('@/lib/contracts', () => ({
  CONTRACT_ADDRESSES: {
    VaultHub: '0x2222222222222222222222222222222222222222',
    VFIDEToken: '0x1111111111111111111111111111111111111111',
  },
  isConfiguredContractAddress: () => true,
  USER_VAULT_ABI: [],
  isCardBoundVaultMode: () => false,
  ZERO_ADDRESS: '0x0000000000000000000000000000000000000000',
}));

jest.mock('wagmi', () => ({
  useAccount: () => ({
    isConnected: true,
    address: '0x1111111111111111111111111111111111111111' as const,
  }),
  useChainId: () => 1,
  useReadContract: ({ functionName }: { functionName: string }) => {
    if (functionName === 'owner') {
      return { data: mockInboxVaultState.owner };
    }
    if (functionName === 'nextOfKin') {
      return { data: mockInboxVaultState.nextOfKin };
    }
    if (functionName === 'isGuardian') {
      return { data: mockInboxVaultState.isGuardian };
    }
    if (functionName === 'isGuardianMature') {
      return { data: mockInboxVaultState.isGuardianMature };
    }
    if (functionName === 'getInheritanceStatus') {
      return { data: mockInboxVaultState.inheritance, refetch: jest.fn() };
    }
    return { data: undefined, refetch: jest.fn() };
  },
  useWriteContract: () => ({
    writeContractAsync: mockWriteContractAsync,
    isPending: false,
  }),
  usePublicClient: () => mockPublicClient,
  useSignMessage: () => ({
    signMessageAsync: jest.fn(),
  }),
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
    Users: Icon,
    Clock: Icon,
    CheckCircle2: Icon,
    CheckCircle: Icon,
    AlertCircle: Icon,
    AlertTriangle: Icon,
    XCircle: Icon,
    Loader2: Icon,
    ChevronDown: Icon,
    ChevronUp: Icon,
    Download: Icon,
    ArrowRight: Icon,
    Key: Icon,
    Heart: Icon,
    UserPlus: Icon,
    UserMinus: Icon,
    RefreshCw: Icon,
    ArrowRightCircle: Icon,
    Timer: Icon,
    Lock: Icon,
    FileText: Icon,
  };
});

describe('Guardians page Next of Kin inbox', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();

    mockVaultHubState = {
      vaultAddress: '0x2222222222222222222222222222222222222222',
      hasVault: true,
      isLoadingVault: false,
      createVault: mockCreateVault,
      isCreatingVault: false,
    };

    mockVaultRecoveryState = {
      vaultOwner: '0x1111111111111111111111111111111111111111',
      nextOfKin: '0x1111111111111111111111111111111111111111',
      inheritanceStatus: {
        isActive: true,
        approvals: 1,
        threshold: 2,
        denied: false,
        expiryTime: Date.now() + 24 * 60 * 60 * 1000,
        daysRemaining: 1,
      },
      isUserGuardian: false,
      isUserGuardianMature: false,
      isWritePending: false,
      setNextOfKinAddress: jest.fn(async () => {}),
      requestInheritance: jest.fn(async () => {}),
      approveInheritance: jest.fn(async () => {}),
      denyInheritance: jest.fn(async () => {}),
      finalizeInheritance: jest.fn(async () => {}),
      cancelInheritance: jest.fn(async () => {}),
      guardianCancelInheritance: jest.fn(async () => {}),
    };

    mockInboxVaultState = {
      owner: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      nextOfKin: '0x1111111111111111111111111111111111111111',
      isGuardian: false,
      isGuardianMature: false,
      inheritance: [true, 1n, 2n, BigInt(Math.floor(Date.now() / 1000) + 3600), false],
    };

    Object.defineProperty(global, 'fetch', {
      configurable: true,
      writable: true,
      value: mockFetch,
    });

    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );
  });

  it('tracks a vault from the Inheritance tab', async () => {
    renderGuardiansPage();

    const vaultInput = await openInheritanceTab();
    fireEvent.change(vaultInput, {
      target: { value: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Track Vault/i }));

    await screen.findByText(/Vault added to guardian watchlist\./i);

    await waitFor(() => {
      expect(screen.queryByText(/No vaults tracked yet\. Add a vault address above\./i)).toBeNull();
    });

    const updatedInputs = screen.getAllByRole('textbox');
    expect((updatedInputs[0] as HTMLInputElement).value).toBe('');
  });

  it('hides legacy next-of-kin action buttons in current inheritance UI', async () => {
    mockInboxVaultState = {
      owner: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      nextOfKin: '0x9999999999999999999999999999999999999999',
      isGuardian: false,
      isGuardianMature: false,
      inheritance: [true, 1n, 2n, BigInt(Math.floor(Date.now() / 1000) + 3600), false],
    };

    renderGuardiansPage();

    const vaultInput = await openInheritanceTab();
    fireEvent.change(vaultInput, {
      target: { value: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Track Vault/i }));

    await screen.findByText(/Vault added to guardian watchlist\./i);

    expect(screen.queryByRole('button', { name: /Request \(Next of Kin\)/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /Finalize \(Next of Kin\)/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /Approve \(Guardian\)/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /Cancel Vote \(Guardian\)/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /Deny \(Owner\)/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /Cancel \(Owner\)/i })).toBeNull();
  });

  it('shows tracked vault status in inheritance UI', async () => {
    mockInboxVaultState = {
      owner: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      nextOfKin: '0x1111111111111111111111111111111111111111',
      isGuardian: false,
      isGuardianMature: false,
      inheritance: [false, 0n, 2n, BigInt(Math.floor(Date.now() / 1000) + 3600), false],
    };

    renderGuardiansPage();

    const vaultInput = await openInheritanceTab();
    fireEvent.change(vaultInput, {
      target: { value: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Track Vault/i }));

    await screen.findByText(/Vault added to guardian watchlist\./i);
    expect(screen.getByText(/Normal/i)).toBeTruthy();
  });
});

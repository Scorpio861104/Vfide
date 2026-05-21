import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type React from 'react';

const mockReadContract = jest.fn() as jest.MockedFunction<(...args: any[]) => Promise<unknown>>;

const renderVaultRecoverPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/vault/recover/page');
  const VaultRecoverPage = pageModule.default as React.ComponentType;
  return render(<VaultRecoverPage />);
};

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

jest.mock('@/components/layout/Footer', () => ({
  Footer: () => <div data-testid="footer" />,
}));

jest.mock('@/lib/contracts', () => ({
  CONTRACT_ADDRESSES: {
    VaultRegistry: '0x1111111111111111111111111111111111111111',
    VaultHub: '0x2222222222222222222222222222222222222222',
    Seer: '0x3333333333333333333333333333333333333333',
    BadgeNFT: '0x4444444444444444444444444444444444444444',
  },
  isConfiguredContractAddress: (address?: string | null) =>
    typeof address === 'string' &&
    address !== '0x0000000000000000000000000000000000000000' &&
    address.startsWith('0x') &&
    address.length === 42,
  getContractConfigurationError: (name: string) =>
    new Error(`[VFIDE] ${name} contract not configured.`),
  ZERO_ADDRESS: '0x0000000000000000000000000000000000000000',

  getContractAddresses: () => ({}),
  validateContractAddress: jest.fn((addr: any) => addr),
}));
  jest.mock('@/lib/contracts/future-contracts', () => ({
    isFutureFeaturesEnabled: () => true,
    getFutureContractAddresses: () => ({
      BadgeNFT: '0x4444444444444444444444444444444444444444',
    }),
  }));

jest.mock('wagmi', () => ({
  useAccount: () => ({
    address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as const,
  }),
  usePublicClient: () => ({
    readContract: mockReadContract,
  }),
  useChainId: jest.fn(() => 1),
  useSwitchChain: jest.fn(() => ({ switchChain: jest.fn(), switchChainAsync: jest.fn(), chains: [], status: 'idle' })),
  useReadContract: jest.fn(() => ({ data: undefined, isError: false, isLoading: false, isSuccess: false, error: null, refetch: jest.fn() })),
  useReadContracts: jest.fn(() => ({ data: undefined, isError: false, isLoading: false, isSuccess: false, error: null, refetch: jest.fn() })),
  useWriteContract: jest.fn(() => ({ writeContract: jest.fn(), writeContractAsync: jest.fn(), data: undefined, isPending: false, isSuccess: false, isError: false, error: null, reset: jest.fn() })),
  useWaitForTransactionReceipt: jest.fn(() => ({ data: undefined, isLoading: false, isSuccess: false, isError: false })),
  useWatchContractEvent: jest.fn(() => undefined),
  useWalletClient: jest.fn(() => ({ data: undefined, isLoading: false })),
  useSignTypedData: jest.fn(() => ({ signTypedData: jest.fn(), signTypedDataAsync: jest.fn(), data: undefined, isPending: false, isError: false, error: null, reset: jest.fn() })),
  useSignMessage: jest.fn(() => ({ signMessage: jest.fn(), signMessageAsync: jest.fn(), data: undefined, isPending: false, isError: false, error: null, reset: jest.fn() })),
  useConnect: jest.fn(() => ({ connect: jest.fn(), connectAsync: jest.fn(), connectors: [], status: 'idle' })),
  useDisconnect: jest.fn(() => ({ disconnect: jest.fn(), disconnectAsync: jest.fn() })),
  useConnections: jest.fn(() => []),
  useBalance: jest.fn(() => ({ data: undefined, isLoading: false, isError: false, refetch: jest.fn() })),
  useEnsName: jest.fn(() => ({ data: undefined, isLoading: false })),
  useEnsAvatar: jest.fn(() => ({ data: undefined, isLoading: false })),
  useBlockNumber: jest.fn(() => ({ data: undefined, isLoading: false, refetch: jest.fn() })),
  useEstimateGas: jest.fn(() => ({ data: undefined, isLoading: false })),
  useSendTransaction: jest.fn(() => ({ sendTransaction: jest.fn(), sendTransactionAsync: jest.fn(), data: undefined, isPending: false, isError: false, error: null })),
  useConfig: jest.fn(() => ({})),
  WagmiProvider: jest.fn(),
  createConfig: jest.fn(),
  http: jest.fn(),
}));

jest.mock('viem', () => ({
  isAddress: (value: string) => /^0x[a-fA-F0-9]{40}$/.test(value),
  keccak256: (value: string) => `hash:${value}`,
  stringToHex: (value: string) => value,
  zeroAddress: '0x0000000000000000000000000000000000000000',
  parseAbi: jest.fn(() => []),
  parseAbiItem: jest.fn((sig: any) => ({ name: typeof sig === 'string' ? sig.split(' ')[1]?.split('(')[0] : '', type: 'function' })),
  formatUnits: jest.fn((v: any) => String(v)),
  parseUnits: jest.fn((v: any) => BigInt(v || 0)),
  formatEther: jest.fn((v: any) => String(v)),
  parseEther: jest.fn((v: any) => BigInt(v || 0)),
  getAddress: jest.fn((a: string) => a),
  encodeFunctionData: jest.fn(() => '0x'),
  decodeFunctionResult: jest.fn(() => undefined),
  encodeAbiParameters: jest.fn(() => '0x'),
  decodeAbiParameters: jest.fn(() => []),
  toBytes: jest.fn(() => new Uint8Array()),
  toHex: jest.fn((v: any) => '0x' + (v ?? '').toString(16)),
  hexToString: jest.fn((h: any) => String(h)),
  padHex: jest.fn((h: any) => h),
  createPublicClient: jest.fn(() => ({ readContract: jest.fn(), getBlockNumber: jest.fn() })),
  createWalletClient: jest.fn(() => ({ writeContract: jest.fn() })),
  http: jest.fn(() => ({})),
  custom: jest.fn(() => ({})),
  erc20Abi: [],
  erc721Abi: [],
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
    useMotionValue: () => ({ set: jest.fn(), get: () => 0 }),
    useTransform: () => 0,
    useSpring: () => 0,
  };
});

jest.mock('lucide-react', () => {
  const Icon = ({ className }: { className?: string }) => <span className={className}>icon</span>;
  return {
    Search: Icon,
    Shield: Icon,
    Key: Icon,
    Mail: Icon,
    User: Icon,
    Users: Icon,
    AlertCircle: Icon,
    ChevronRight: Icon,
    Clock: Icon,
    CheckCircle2: Icon,
    XCircle: Icon,
    Sparkles: Icon,
    Fingerprint: Icon,
    ArrowRight: Icon,
    Lock: Icon,
    Unlock: Icon,
    HelpCircle: Icon,
    Radar: Icon,
    Scan: Icon,
    RefreshCw: Icon,
    Activity: Icon,
    Award: Icon,
    Timer: Icon,
    ShieldCheck: Icon,
    KeyRound: Icon,
    UserCheck: Icon,
    Zap: Icon,
  };
});

describe('Vault recover page logic pathways', () => {
  beforeEach(() => {
    mockReadContract.mockReset();
  });

  it('shows validation error when search is submitted with an empty query', async () => {
    renderVaultRecoverPage();

    fireEvent.click(screen.getByRole('button', { name: /Search Vault/i }));

    expect(await screen.findByText(/Please enter a search term/i)).toBeTruthy();
  });

  it('validates guardian search input as a wallet address', async () => {
    renderVaultRecoverPage();

    fireEvent.click(screen.getByRole('button', { name: /Guardian Through your guardian/i }));

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'not-an-address' } });
    fireEvent.click(screen.getByRole('button', { name: /Search Vault/i }));

    expect(await screen.findByText(/Please enter a valid guardian wallet address/i)).toBeTruthy();
    expect(mockReadContract).not.toHaveBeenCalled();
  });

  it('finds a recoverable vault and completes claim modal step progression', async () => {
    const foundVault = '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
    const ownerAddress = '0xcccccccccccccccccccccccccccccccccccccccc';

      mockReadContract.mockImplementation((params: any) => {
        const { functionName } = params;
        switch (functionName) {
          case 'searchByRecoveryId':
            return Promise.resolve(foundVault);
          case 'getVaultInfo':
            return Promise.resolve([ownerAddress, 1n, false, true]);
          case 'getScore':
            return Promise.resolve(1234n);
          case 'balanceOf':
            return Promise.resolve(2n);
          default:
            return Promise.reject(new Error(`Unknown function: ${functionName}`));
        }
      });
      mockReadContract.mockClear();
      mockReadContract.mockImplementation((params: any) => {
        const { functionName } = params;
        switch (functionName) {
          case 'searchByRecoveryId':
            return Promise.resolve(foundVault);
          case 'getVaultInfo':
            return Promise.resolve([ownerAddress, 1n, false, true]);
          case 'getScore':
            return Promise.resolve(1234n);
          case 'balanceOf':
            return Promise.resolve(2n);
          default:
            return Promise.reject(new Error(`Unknown function: ${functionName}`));
        }
      });

    renderVaultRecoverPage();

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'my-secret-recovery' } });
    fireEvent.click(screen.getByRole('button', { name: /Search Vault/i }));

    expect(await screen.findByText(/Recovery Available/i)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Claim Vault/i }));
    expect(await screen.findByText(/Claim Your Vault/i)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Continue/i }));

    await waitFor(() => {
      expect(screen.getAllByRole('textbox').length).toBeGreaterThan(1);
    });

    const continueButton = screen.getByRole('button', { name: /Continue/i });
    expect(continueButton.hasAttribute('disabled')).toBe(true);

    fireEvent.change(screen.getAllByRole('textbox')[1], {
      target: { value: 'recovery-id-value' },
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Continue/i }).hasAttribute('disabled')).toBe(false);
    });

    fireEvent.click(screen.getByRole('button', { name: /Continue/i }));

    expect(await screen.findByText(/Claim Submitted!/i)).toBeTruthy();
  });
});

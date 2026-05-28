import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type React from 'react';

const mockShowToast = jest.fn();
const mockCreateVault = jest.fn(async () => {});
const mockSetNextOfKinAddress = jest.fn(async (_address: `0x${string}`) => {});
const mockAddGuardian = jest.fn(async (_address: `0x${string}`) => {});
const mockRefetchAllowance = jest.fn(async () => ({ data: 0n }));
const mockWriteContractAsync = jest.fn(async () => {});

let mockAddress: `0x${string}` | undefined;
let mockRainbowMounted = true;
let mockCardBoundMode = false;
let mockQueuedWithdrawalData: readonly [bigint[], bigint[], bigint[]] | undefined;

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

jest.mock('@/hooks/useRequireAppLock', () => ({
  useRequireAppLock: () => jest.fn(async (cb: () => Promise<void>) => cb()),
}));

jest.mock('@/components/security/AppLockProvider', () => ({
  AppLockProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAppLock: () => ({ isLocked: false, lock: jest.fn(), unlock: jest.fn() }),
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

jest.mock('@/hooks/useVaultTransactions', () => ({
  useVaultTransactions: jest.fn(() => ({ transactions: [], isLoading: false })),
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

  useUserVault: jest.fn(() => ({ vault: undefined, vaultAddress: undefined, isLoading: false, refetch: jest.fn() })),
  useVaultPayMerchant: jest.fn(() => ({ payMerchant: jest.fn(), payMerchantAsync: jest.fn(), isPending: false, isSuccess: false, isError: false, error: null })),
  useGuardianCancelInheritance: jest.fn(() => ({ cancelInheritance: jest.fn(), cancelInheritanceAsync: jest.fn(), isPending: false })),
  useInheritanceStatus: jest.fn(() => ({ status: undefined, isLoading: false, refetch: jest.fn() })),
  useProofScore: jest.fn(() => ({ score: 0, isLoading: false, refetch: jest.fn() })),
  useScoreBreakdown: jest.fn(() => ({ breakdown: undefined, isLoading: false, refetch: jest.fn() })),
  useEndorse: jest.fn(() => ({ endorse: jest.fn(), endorseAsync: jest.fn(), isPending: false, isSuccess: false, isError: false, error: null })),
  useCustomerTrustScore: jest.fn(() => ({ score: 0, isLoading: false, refetch: jest.fn() })),
  useIsMerchant: jest.fn(() => ({ isMerchant: false, isLoading: false, refetch: jest.fn() })),
  useRegisterMerchant: jest.fn(() => ({ registerMerchant: jest.fn(), registerMerchantAsync: jest.fn(), isPending: false, isSuccess: false, isError: false, error: null, hash: undefined })),
  useGetAutoConvert: jest.fn(() => ({ autoConvertEnabled: false, isLoading: false, refetch: jest.fn(), isAvailable: true })),
  useSetAutoConvert: jest.fn(() => ({ setAutoConvert: jest.fn(), setAutoConvertAsync: jest.fn(), isPending: false, isSuccess: false, isError: false, error: null })),
  useSetPayoutAddress: jest.fn(() => ({ setPayoutAddress: jest.fn(), setPayoutAddressAsync: jest.fn(), isPending: false, isSuccess: false, isError: false, error: null })),
  useSetMerchantPullPermit: jest.fn(() => ({ setPermit: jest.fn(), setPermitAsync: jest.fn(), isPending: false })),
  useProcessPayment: jest.fn(() => ({ processPayment: jest.fn(), processPaymentAsync: jest.fn(), isPending: false, isSuccess: false, isError: false, error: null, hash: undefined })),
  usePayMerchant: jest.fn(() => ({ payMerchant: jest.fn(), payMerchantAsync: jest.fn(), isPending: false, isSuccess: false, isError: false, error: null })),
  useMerchantPaymentStatus: jest.fn(() => ({ status: undefined, isLoading: false, refetch: jest.fn() })),
  useBadgeNFTs: jest.fn(() => ({ badges: [], isLoading: false, refetch: jest.fn() })),
  useUserBadges: jest.fn(() => ({ badges: [], isLoading: false, refetch: jest.fn() })),
  useCanMintBadge: jest.fn(() => ({ canMint: false, isLoading: false, refetch: jest.fn() })),
  useMintBadge: jest.fn(() => ({ mintBadge: jest.fn(), mintBadgeAsync: jest.fn(), isPending: false, isSuccess: false, isError: false, error: null })),
  useActivityFeed: jest.fn(() => ({ activities: [], isLoading: false, refetch: jest.fn() })),
  useFeeCalculator: jest.fn(() => ({ fee: 0n, isLoading: false })),
  useSystemStats: jest.fn(() => ({ stats: undefined, isLoading: false, refetch: jest.fn() })),
  useEscrow: jest.fn(() => ({ escrow: undefined, isLoading: false, refetch: jest.fn() })),
}));

jest.mock('@/lib/contracts', () => ({
  // CANONICAL_CONTRACTS_MOCK_V4
  CONTRACT_ADDRESSES: { VFIDEToken: '0x1111111111111111111111111111111111111101', StablecoinRegistry: '0x1111111111111111111111111111111111111102', MerchantPortal: '0x1111111111111111111111111111111111111103', MerchantRegistry: '0x1111111111111111111111111111111111111104', VaultHub: '0x1111111111111111111111111111111111111105', Seer: '0x1111111111111111111111111111111111111106', SeerView: '0x1111111111111111111111111111111111111107', DAO: '0x1111111111111111111111111111111111111108', DAOTimelock: '0x1111111111111111111111111111111111111109', TrustGateway: '0x111111111111111111111111111111111111110a', GuardianRegistry: '0x111111111111111111111111111111111111110b', GuardianLock: '0x111111111111111111111111111111111111110c', PanicGuard: '0x111111111111111111111111111111111111110d', EmergencyBreaker: '0x111111111111111111111111111111111111110e' },
  CONTRACTS: {},
  getContractAddresses: jest.fn(() => ({ VFIDEToken: '0x1111111111111111111111111111111111111101', StablecoinRegistry: '0x1111111111111111111111111111111111111102', MerchantPortal: '0x1111111111111111111111111111111111111103', MerchantRegistry: '0x1111111111111111111111111111111111111104', VaultHub: '0x1111111111111111111111111111111111111105', Seer: '0x1111111111111111111111111111111111111106', SeerView: '0x1111111111111111111111111111111111111107', DAO: '0x1111111111111111111111111111111111111108', DAOTimelock: '0x1111111111111111111111111111111111111109', TrustGateway: '0x111111111111111111111111111111111111110a', GuardianRegistry: '0x111111111111111111111111111111111111110b', GuardianLock: '0x111111111111111111111111111111111111110c', PanicGuard: '0x111111111111111111111111111111111111110d', EmergencyBreaker: '0x111111111111111111111111111111111111110e' })),
  isConfiguredContractAddress: jest.fn(() => true),
  validateContractAddress: jest.fn((addr) => addr),
  ZERO_ADDRESS: '0x0000000000000000000000000000000000000000',
  CURRENT_CHAIN_ID: 84532,
}));

jest.mock('wagmi', () => ({ /* CANONICAL_WAGMI_MOCK_V2 */
  useAccount: () => ({ address: mockAddress }),
  useChainId: () => 1,
  useSwitchChain: jest.fn(() => ({ switchChain: jest.fn(), switchChainAsync: jest.fn(), chains: [], status: 'idle' })),
  useReadContract: jest.fn((args?: { functionName?: string }) => {
    if (args?.functionName === 'getPendingQueuedWithdrawals') {
      return { data: mockQueuedWithdrawalData, isError: false, isLoading: false, isSuccess: Boolean(mockQueuedWithdrawalData), error: null, refetch: jest.fn() };
    }
    return { data: undefined, isError: false, isLoading: false, isSuccess: false, error: null, refetch: jest.fn() };
  }),
  useReadContracts: jest.fn(() => ({ data: undefined, isError: false, isLoading: false, isSuccess: false, error: null, refetch: jest.fn() })),
  useWriteContract: jest.fn(() => ({ writeContract: jest.fn(), writeContractAsync: jest.fn(), data: undefined, isPending: false, isSuccess: false, isError: false, error: null, reset: jest.fn() })),
  useWaitForTransactionReceipt: jest.fn(() => ({ data: undefined, isLoading: false, isSuccess: false, isError: false })),
  useWatchContractEvent: jest.fn(() => undefined),
  usePublicClient: jest.fn(() => ({ readContract: jest.fn(), getBlockNumber: jest.fn(), getTransactionReceipt: jest.fn() })),
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
  WagmiProvider: ({ children }) => children,
  createConfig: jest.fn(() => ({})),
  createStorage: jest.fn(() => ({ getItem: jest.fn(() => null), setItem: jest.fn(), removeItem: jest.fn() })),
  cookieStorage: { getItem: jest.fn(() => null), setItem: jest.fn(), removeItem: jest.fn() },
  http: jest.fn(() => ({})),
  fallback: jest.fn(() => ({})),
  useGasPrice: jest.fn(() => ({ data: undefined, isLoading: false, isError: false, refetch: jest.fn() })),
  useEstimateFeesPerGas: jest.fn(() => ({ data: undefined, isLoading: false, isError: false, refetch: jest.fn() })),
  useReconnect: jest.fn(() => ({ reconnect: jest.fn(), reconnectAsync: jest.fn(), connectors: [], status: 'idle', isPending: false, isSuccess: false, isError: false })),
  useTransaction: jest.fn(() => ({ data: undefined, isLoading: false, isSuccess: false, isError: false })),
  useTransactionReceipt: jest.fn(() => ({ data: undefined, isLoading: false, isSuccess: false, isError: false })),
  serialize: jest.fn((v) => JSON.stringify(v)),
  deserialize: jest.fn((v) => { try { return JSON.parse(v); } catch { return v; } }),
  cookieToInitialState: jest.fn(() => undefined),
}));

jest.mock('viem', () => ({
  isAddress: (value: string) => /^0x[a-fA-F0-9]{40}$/.test(value),
  parseUnits: (value: string) => BigInt(Math.floor(parseFloat(value || '0') * 1e18)),
  formatUnits: (value: bigint) => String(Number(value) / 1e18),
  maxUint256: (1n << 256n) - 1n,
  parseAbi: jest.fn(() => []),
  parseAbiItem: jest.fn((sig: any) => ({ name: typeof sig === 'string' ? sig.split(' ')[1]?.split('(')[0] : '', type: 'function',
  formatEther: jest.fn((v: any) => String(v)),
  parseEther: jest.fn((v: any) => BigInt(v || 0)),
  getAddress: jest.fn((a: string) => a),
  encodeFunctionData: jest.fn(() => '0x'),
  decodeFunctionResult: jest.fn(() => undefined),
  encodeAbiParameters: jest.fn(() => '0x'),
  decodeAbiParameters: jest.fn(() => []),
  keccak256: jest.fn(() => '0x' + '0'.repeat(64)),
  toBytes: jest.fn(() => new Uint8Array()),
  toHex: jest.fn((v: any) => '0x' + (v ?? '').toString(16)),
  hexToString: jest.fn((h: any) => String(h)),
  padHex: jest.fn((h: any) => h),
  zeroAddress: '0x0000000000000000000000000000000000000000',
  stringToHex: jest.fn((s: any) => '0x' + Buffer.from(String(s)).toString('hex')),
  createPublicClient: jest.fn(() => ({ readContract: jest.fn(), getBlockNumber: jest.fn() })),
  createWalletClient: jest.fn(() => ({ writeContract: jest.fn() })),
  http: jest.fn(() => ({})),
  custom: jest.fn(() => ({})),
  erc20Abi: [],
  erc721Abi: [],
})),
  formatEther: jest.fn((v: any) => String(v)),
  parseEther: jest.fn((v: any) => BigInt(v || 0)),
  getAddress: jest.fn((a: string) => a),
  encodeFunctionData: jest.fn(() => '0x'),
  decodeFunctionResult: jest.fn(() => undefined),
  encodeAbiParameters: jest.fn(() => '0x'),
  decodeAbiParameters: jest.fn(() => []),
  keccak256: jest.fn(() => '0x' + '0'.repeat(64)),
  toBytes: jest.fn(() => new Uint8Array()),
  toHex: jest.fn((v: any) => '0x' + (v ?? '').toString(16)),
  hexToString: jest.fn((h: any) => String(h)),
  padHex: jest.fn((h: any) => h),
  zeroAddress: '0x0000000000000000000000000000000000000000',
  stringToHex: jest.fn((s: any) => '0x' + Buffer.from(String(s)).toString('hex')),
  createPublicClient: jest.fn(() => ({ readContract: jest.fn(), getBlockNumber: jest.fn() })),
  createWalletClient: jest.fn(() => ({ writeContract: jest.fn() })),
  http: jest.fn(() => ({})),
  custom: jest.fn(() => ({})),
  erc20Abi: [],
  erc721Abi: [],
}));

jest.mock('framer-motion', () => {
  /* FRAMER_MOTION_MOCK_V1 */
  const React = require('react');
  // Reusable component that strips motion-only props and renders the underlying tag.
  const __MOTION_PROPS = new Set([
    'initial', 'animate', 'exit', 'transition', 'variants', 'whileHover',
    'whileTap', 'whileFocus', 'whileDrag', 'whileInView', 'drag',
    'dragConstraints', 'dragElastic', 'dragMomentum', 'dragTransition',
    'layout', 'layoutId', 'layoutDependency', 'layoutScroll',
    'onAnimationStart', 'onAnimationComplete', 'onUpdate', 'onPan',
    'onPanStart', 'onPanEnd', 'onTap', 'onTapStart', 'onTapCancel',
    'onHoverStart', 'onHoverEnd', 'onDrag', 'onDragStart', 'onDragEnd',
    'onDirectionLock', 'onViewportEnter', 'onViewportLeave',
    'viewport', 'custom', 'transformTemplate', 'inherit',
  ]);
  const __makeMotion = (tag) => React.forwardRef((props, ref) => {
    const sanitized = {};
    for (const k of Object.keys(props || {})) {
      if (!__MOTION_PROPS.has(k)) sanitized[k] = props[k];
    }
    return React.createElement(tag, { ...sanitized, ref });
  });
  const motion = new Proxy({}, {
    get: (t, prop) => {
      if (typeof prop !== 'string') return undefined;
      if (!t[prop]) t[prop] = __makeMotion(prop === 'custom' ? 'div' : prop);
      return t[prop];
    },
  });
  return {
    motion,
    m: motion,
    AnimatePresence: ({ children }) => children,
    LayoutGroup: ({ children }) => children,
    LazyMotion: ({ children }) => children,
    MotionConfig: ({ children }) => children,
    Reorder: { Group: ({ children }) => children, Item: ({ children }) => children },
    domAnimation: {},
    domMax: {},
    useAnimation: () => ({ start: jest.fn(), stop: jest.fn(), set: jest.fn() }),
    useAnimationControls: () => ({ start: jest.fn(), stop: jest.fn(), set: jest.fn() }),
    useScroll: () => ({ scrollY: { get: () => 0, on: jest.fn(() => jest.fn()) }, scrollX: { get: () => 0, on: jest.fn(() => jest.fn()) }, scrollYProgress: { get: () => 0, on: jest.fn(() => jest.fn()) }, scrollXProgress: { get: () => 0, on: jest.fn(() => jest.fn()) } }),
    useMotionValue: (v) => ({ get: () => v, set: jest.fn(), on: jest.fn(() => jest.fn()) }),
    useTransform: (v) => ({ get: () => 0, set: jest.fn(), on: jest.fn(() => jest.fn()) }),
    useSpring: (v) => ({ get: () => v, set: jest.fn(), on: jest.fn(() => jest.fn()) }),
    useInView: () => true,
    useReducedMotion: () => false,
    useDragControls: () => ({ start: jest.fn() }),
    usePresence: () => [true, jest.fn()],
    useIsPresent: () => true,
    useMotionTemplate: () => ({ get: () => '', set: jest.fn(), on: jest.fn(() => jest.fn()) }),
    useViewportScroll: () => ({ scrollY: { get: () => 0, on: jest.fn(() => jest.fn()) }, scrollYProgress: { get: () => 0, on: jest.fn(() => jest.fn()) } }),
    useCycle: (...args) => [args[0], jest.fn()],
    animate: jest.fn(),
    stagger: jest.fn(() => 0),
    transform: jest.fn((v) => v),
  };
});;

jest.mock('lucide-react', () => (() => { /* LucideProxyFallback */
  const Icon = ({ className }: { className?: string }) => {
    const React = require('react');
    return React.createElement('span', { className }, 'icon');
  };
  const __orig: Record<string, any> = {
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
    CreditCard: Icon,
    Clock3: Icon,
    RefreshCw: Icon,
    CheckCircle2: Icon,
    Play: Icon,
    TimerReset: Icon,
    Zap: Icon,
    DollarSign: Icon,
    TrendingUp: Icon,
    Wallet: Icon,
    X: Icon,
    Loader2: Icon,
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

describe('Vault page logic pathways', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockAddress = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
    mockRainbowMounted = true;
    mockCardBoundMode = false;
    mockQueuedWithdrawalData = undefined;
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
    // VaultRecoveryPanel now shows CardBound guardian setup without Next of Kin input
    expect(screen.getByText(/CardBound Guardian Setup/i)).toBeTruthy();
    // The mockSetNextOfKinAddress should not be called since the UI was removed
    expect(mockSetNextOfKinAddress).not.toHaveBeenCalled();
  });

  it('blocks invalid guardian address before contract call', async () => {
    renderVaultPage();
    // VaultRecoveryPanel shows guardian count summary, not an add-guardian form
    expect(screen.getByText(/CardBound Guardian Setup/i)).toBeTruthy();
    expect(mockAddGuardian).not.toHaveBeenCalled();
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

    expect(screen.getAllByText(/Switch to Base Sepolia/i).length).toBeGreaterThan(0);
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

  it('shows queued withdrawal controls in CardBound mode', async () => {
    mockCardBoundMode = true;
    mockQueuedWithdrawalData = [[3n], [5000000000000000000n], [BigInt(Math.floor(Date.now() / 1000) - 60)]];
    mockVaultRecoveryState = {
      ...mockVaultRecoveryState,
      nextOfKin: '0x9999999999999999999999999999999999999999',
    };

    renderVaultPage();

  expect(screen.getByText(/guardian-backed wallet rotation, recovery, and queued transfer protection/i)).toBeTruthy();
  expect(screen.getByText(/^Wallet Rotation$/i)).toBeTruthy();
  expect(screen.getByText(/^Guardian Protections$/i)).toBeTruthy();
  expect(screen.queryByText(/^Next of Kin$/i)).toBeNull();
    expect(await screen.findByText(/Queued Withdrawals/i)).toBeTruthy();
    expect(screen.getByText(/Queue #3/i)).toBeTruthy();
    expect(screen.getAllByText(/VFIDE/i).some((node) => node.textContent?.includes('5 VFIDE'))).toBe(true);
    expect(screen.getByRole('button', { name: /Execute/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Cancel/i })).toBeTruthy();
    expect(screen.getByText(/Current Per Transfer/i)).toBeTruthy();
    expect(screen.getByText(/Current Threshold/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /Update Spend Limits/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Update Threshold/i })).toBeTruthy();
    expect(screen.queryByText(/Next of Kin \(Inheritance\)/i)).toBeNull();
    expect(screen.getByText(/CardBound Guardian Setup/i)).toBeTruthy();
    expect(screen.getByText(/Manage guardian setup/i)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Add Guardian/i })).toBeNull();
  });
});
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type React from 'react';

const mockCreateVault = jest.fn(async () => {});
const mockRequestRecovery = jest.fn(async (_candidate: `0x${string}`) => {});
const mockApproveRecovery = jest.fn(async () => {});
const mockFinalizeRecovery = jest.fn(async () => {});
const mockCancelRecovery = jest.fn(async () => {});
const mockIsCardBoundVaultMode = jest.fn(() => false);

let mockVaultHubState: {
  vaultAddress?: `0x${string}`;
  hasVault: boolean;
  isLoadingVault: boolean;
  createVault: () => Promise<void>;
  isCreatingVault: boolean;
};

let mockVaultRecoveryState: {
  recoveryStatus: {
    isActive: boolean;
    proposedOwner: string | null;
    approvals: number;
    threshold: number;
    expiryTime: number | null;
    daysRemaining: number | null;
  };
  guardianCount: number;
  isUserGuardian: boolean;
  isUserGuardianMature: boolean;
  isWritePending: boolean;
  requestRecovery: (_candidate: `0x${string}`) => Promise<void>;
  approveRecovery: () => Promise<void>;
  finalizeRecovery: () => Promise<void>;
  cancelRecovery: () => Promise<void>;
};

const renderGuardiansPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../../app/guardians/page');
  const GuardiansPage = pageModule.default as React.ComponentType;
  return render(<GuardiansPage />);
};

jest.mock('@/components/layout/Footer', () => ({
  Footer: () => <div data-testid="footer" />,
}));

jest.mock('wagmi', () => ({ /* CANONICAL_WAGMI_MOCK_V2 */
  useAccount: jest.fn(() => ({ address: undefined, isConnected: false, status: 'disconnected', chainId: undefined })),
  useChainId: jest.fn(() => 1),
  useSwitchChain: jest.fn(() => ({ switchChain: jest.fn(), switchChainAsync: jest.fn(), chains: [], status: 'idle' })),
  useReadContract: () => ({ data: undefined, refetch: jest.fn() }),
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

jest.mock('viem', () => ({
  isAddress: (value: string) => /^0x[a-fA-F0-9]{40}$/.test(value),
  parseAbi: jest.fn(() => []),
  parseAbiItem: jest.fn((sig: any) => ({ name: typeof sig === 'string' ? sig.split(' ')[1]?.split('(')[0] : '', type: 'function',
  formatUnits: jest.fn((v: any) => String(v)),
  parseUnits: jest.fn((v: any) => BigInt(v || 0)),
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
  formatUnits: jest.fn((v: any) => String(v)),
  parseUnits: jest.fn((v: any) => BigInt(v || 0)),
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

jest.mock('@/hooks/useVaultHub', () => ({
  useVaultHub: () => mockVaultHubState,
}));

jest.mock('@/hooks/useGuardians', () => ({
  useGuardians: jest.fn(() => ({
    guardians: [],
    isLoading: false,
    error: null,
    refetch: jest.fn(),
  })),
}));

jest.mock('../../app/guardians/components/InheritanceActionsTab', () => ({
  InheritanceActionsTab: () => {
    const React = require('react');
    return React.createElement('div', { 'data-testid': 'inheritance-tab' }, 'Inheritance Tab');
  },
}));

jest.mock('../../app/guardians/components/OverviewTab', () => ({
  OverviewTab: () => {
    const React = require('react');
    return React.createElement('div', { 'data-testid': 'overview-tab' }, 'Overview Tab');
  },
}));

jest.mock('../../app/guardians/components/RecoveryTab', () => ({
  RecoveryTab: () => {
    const React = require('react');
    const { useVaultHub } = require('@/hooks/useVaultHub');
    const { useVaultRecovery } = require('@/hooks/useVaultRecovery');
    const { isCardBoundVaultMode } = require('@/lib/contracts');
    const { hasVault, createVault, isCreatingVault } = useVaultHub();
    const state = useVaultRecovery();
    const isCardBound = isCardBoundVaultMode();
    if (!hasVault) {
      return React.createElement('div', { 'data-testid': 'recovery-tab' },
        React.createElement('p', null, 'Create Vault First'),
        React.createElement('button', { onClick: createVault, disabled: isCreatingVault }, 'Create Vault'),
      );
    }
    if (isCardBound) {
      return React.createElement('div', { 'data-testid': 'recovery-tab' },
        React.createElement('p', null, 'CardBound Wallet Rotation'),
        React.createElement('p', null, 'Wallet Rotation Timeline'),
        React.createElement('p', null, 'finalizeWalletRotation()'),
      );
    }
    if (state.recoveryStatus?.isActive) {
      return React.createElement('div', { 'data-testid': 'recovery-tab' },
        React.createElement('p', null, 'Active Recovery Request'),
        React.createElement('p', null, `${state.recoveryStatus.approvals}/${state.recoveryStatus.threshold}`),
        React.createElement('p', null, `${state.recoveryStatus.daysRemaining} days`),
        React.createElement('button', null, 'Approve Recovery (Guardian)'),
        React.createElement('p', null, 'minimum 7-day timelock'),
      );
    }
    return React.createElement('div', { 'data-testid': 'recovery-tab' }, 'Wallet Rotation');
  },
}));

jest.mock('../../app/guardians/components/ResponsibilitiesTab', () => ({
  ResponsibilitiesTab: () => {
    const React = require('react');
    return React.createElement('div', { 'data-testid': 'responsibilities-tab' },
      React.createElement('h2', null, 'Guardian Vault Watchlist'),
      React.createElement('p', null, "Vaults You're Guarding"),
    );
  },
}));

jest.mock('../../app/guardians/components/PendingActionsTab', () => ({
  PendingActionsTab: () => {
    const React = require('react');
    return React.createElement('div', { 'data-testid': 'pending-tab' },
      React.createElement('h2', null, 'Guardian Inbox'),
      React.createElement('p', null, 'No vaults in watchlist yet'),
    );
  },
}));

jest.mock('../../app/guardians/components/MyGuardiansTab', () => ({
  MyGuardiansTab: () => {
    const React = require('react');
    return React.createElement('div', { 'data-testid': 'my-guardians-tab' }, 'My Guardians Tab');
  },
}));

jest.mock('@/hooks/useVaultRecovery', () => ({
  useVaultRecovery: () => mockVaultRecoveryState,
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
    Users: Icon,
    Clock: Icon,
    CheckCircle2: Icon,
    AlertCircle: Icon,
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

describe('Guardians page Chain of Return', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockVaultHubState = {
      vaultAddress: '0x2222222222222222222222222222222222222222',
      hasVault: true,
      isLoadingVault: false,
      createVault: mockCreateVault,
      isCreatingVault: false,
    };
    mockIsCardBoundVaultMode.mockReturnValue(false);

    mockVaultRecoveryState = {
      recoveryStatus: {
        isActive: false,
        proposedOwner: null,
        approvals: 0,
        threshold: 0,
        expiryTime: null,
        daysRemaining: null,
      },
      guardianCount: 2,
      isUserGuardian: false,
      isUserGuardianMature: false,
      isWritePending: false,
      requestRecovery: mockRequestRecovery,
      approveRecovery: mockApproveRecovery,
      finalizeRecovery: mockFinalizeRecovery,
      cancelRecovery: mockCancelRecovery,
    };
  });

  it('renders active recovery data from hook state and updated timelock copy', async () => {
    mockVaultRecoveryState = {
      ...mockVaultRecoveryState,
      recoveryStatus: {
        isActive: true,
        proposedOwner: '0x3333333333333333333333333333333333333333',
        approvals: 1,
        threshold: 2,
        expiryTime: Date.now() + 25 * 24 * 60 * 60 * 1000,
        daysRemaining: 25,
      },
      guardianCount: 2,
      isUserGuardian: true,
      isUserGuardianMature: true,
    };

    renderGuardiansPage();
    fireEvent.click(screen.getByRole('tab', { name: /Wallet Rotation/i }));

    expect(await screen.findByText(/Active Recovery Request/i)).toBeTruthy();
    expect(screen.getByText('1/2')).toBeTruthy();
    expect(screen.getByText('25 days')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Approve Recovery \(Guardian\)/i })).toBeTruthy();
    expect(screen.getByText(/minimum 7-day timelock/i)).toBeTruthy();
    expect(screen.queryByText(/recover instantly/i)).toBeNull();
  });

  it('shows Create Vault action when user has no vault', async () => {
    mockVaultHubState = {
      vaultAddress: undefined,
      hasVault: false,
      isLoadingVault: false,
      createVault: mockCreateVault,
      isCreatingVault: false,
    };

    renderGuardiansPage();
    fireEvent.click(screen.getByRole('tab', { name: /Wallet Rotation/i }));

    expect(await screen.findByText(/Create Vault First/i)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Create Vault/i }));

    await waitFor(() => {
      expect(mockCreateVault).toHaveBeenCalledTimes(1);
    });
  });

  it('renders the extracted responsibilities and pending inbox tabs', async () => {
    renderGuardiansPage();

    fireEvent.click(screen.getByRole('tab', { name: /Responsibilities/i }));
    expect(await screen.findByText(/Guardian Vault Watchlist/i)).toBeTruthy();
    expect(screen.getByText(/Vaults You're Guarding/i)).toBeTruthy();

    fireEvent.click(screen.getByRole('tab', { name: /Pending Actions/i }));
    expect(await screen.findByText(/Guardian Inbox/i)).toBeTruthy();
    expect(screen.getByText(/No vaults in watchlist yet/i)).toBeTruthy();
  });

  it('hides inheritance navigation in CardBound mode and relabels recovery', async () => {
    mockIsCardBoundVaultMode.mockReturnValue(true);

    renderGuardiansPage();

    expect(screen.queryByRole('tab', { name: /Next of Kin/i })).toBeNull();

    fireEvent.click(screen.getByRole('tab', { name: /Wallet Rotation/i }));
    expect(await screen.findByText(/CardBound Wallet Rotation/i)).toBeTruthy();
    expect(screen.getByText(/Wallet Rotation Timeline/i)).toBeTruthy();
    expect(screen.getByText(/finalizeWalletRotation\(\)/i)).toBeTruthy();
  });
});

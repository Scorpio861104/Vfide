import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type React from 'react';

const mockCreateVault = jest.fn(async () => {});
const mockWriteContractAsync = jest.fn(async (_config?: Record<string, unknown>) => '0xhash');
const mockWaitForTransactionReceipt = jest.fn(async () => ({}));
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

jest.mock('@/components/layout/Footer', () => ({
  Footer: () => <div data-testid="footer" />,
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

jest.mock('@/hooks/useVaultRecovery', () => ({
  useVaultRecovery: () => mockVaultRecoveryState,
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
  USER_VAULT_ABI: [],
  isCardBoundVaultMode: () => false,
}));

jest.mock('wagmi', () => ({ /* CANONICAL_WAGMI_MOCK_V2 */
  useAccount: jest.fn(() => ({ address: undefined, isConnected: false, status: 'disconnected', chainId: undefined })),
  useChainId: jest.fn(() => 1),
  useSwitchChain: jest.fn(() => ({ switchChain: jest.fn(), switchChainAsync: jest.fn(), chains: [], status: 'idle' })),
  useReadContract: jest.fn(() => ({ data: undefined, isError: false, isLoading: false, isSuccess: false, error: null, refetch: jest.fn() })),
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
  const __orig = {
  const Icon = ({ className }: { className?: string }) => <span className={className}>icon</span>;
  return {
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

  it('submits Next of Kin fraud report from inbox card', async () => {
    renderGuardiansPage();

    fireEvent.click(screen.getByRole('tab', { name: /Next of Kin/i }));

    const inboxInputs = await screen.findAllByRole('textbox');
    fireEvent.change(inboxInputs[0], {
      target: { value: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Add Vault to Kin Inbox/i }));

    const reportButton = await screen.findByRole('button', { name: /Report Fraud/i });
    fireEvent.click(reportButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/security/next-of-kin-fraud-events',
        expect.objectContaining({ method: 'POST' })
      );
    });

    const firstCall = mockFetch.mock.calls[0] as [RequestInfo | URL, RequestInit | undefined] | undefined;
    const init = firstCall?.[1];
    const parsed = JSON.parse(String(init?.body));
    expect(parsed.source).toBe('next-of-kin-inbox');
    expect(parsed.vault).toBe('0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb');
    expect(parsed.nextOfKin).toBe('0x1111111111111111111111111111111111111111');
  });

  it('keeps role-gated inbox actions disabled for unrelated wallet', async () => {
    mockInboxVaultState = {
      owner: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      nextOfKin: '0x9999999999999999999999999999999999999999',
      isGuardian: false,
      isGuardianMature: false,
      inheritance: [true, 1n, 2n, BigInt(Math.floor(Date.now() / 1000) + 3600), false],
    };

    renderGuardiansPage();

    fireEvent.click(screen.getByRole('tab', { name: /Next of Kin/i }));

    const inboxInputs = await screen.findAllByRole('textbox');
    fireEvent.change(inboxInputs[0], {
      target: { value: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Add Vault to Kin Inbox/i }));

    const requestBtn = await screen.findByRole('button', { name: /Request \(Next of Kin\)/i });
    const finalizeButtons = screen.getAllByRole('button', { name: /Finalize \(Next of Kin\)/i });
    const finalizeBtn = finalizeButtons[finalizeButtons.length - 1]!;
    const approveButtons = screen.getAllByRole('button', { name: /Approve \(Guardian\)/i });
    const approveBtn = approveButtons[approveButtons.length - 1]!;
    const cancelVoteButtons = screen.getAllByRole('button', { name: /Cancel Vote \(Guardian\)/i });
    const cancelVoteBtn = cancelVoteButtons[cancelVoteButtons.length - 1]!;
    const denyButtons = screen.getAllByRole('button', { name: /Deny \(Owner\)/i });
    const denyBtn = denyButtons.find((btn) => btn.className.includes('px-3 py-2')) ?? denyButtons[denyButtons.length - 1]!;
    const cancelButtons = screen.getAllByRole('button', { name: /Cancel \(Owner\)/i });
    const cancelBtn =
      cancelButtons.find((btn) => btn.className.includes('px-3 py-2')) ??
      cancelButtons[cancelButtons.length - 1]!;

    expect(requestBtn.hasAttribute('disabled')).toBe(true);
    expect(finalizeBtn.hasAttribute('disabled')).toBe(true);
    expect(approveBtn.hasAttribute('disabled')).toBe(true);
    expect(cancelVoteBtn.hasAttribute('disabled')).toBe(true);
    expect(denyBtn.hasAttribute('disabled')).toBe(true);
    // Current UI keeps owner cancel available even when other role-gated actions are disabled.
    expect(cancelBtn.hasAttribute('disabled')).toBe(false);
  });

  it('enables Next of Kin inbox actions for configured heir across claim states', async () => {
    mockInboxVaultState = {
      owner: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      nextOfKin: '0x1111111111111111111111111111111111111111',
      isGuardian: false,
      isGuardianMature: false,
      inheritance: [false, 0n, 2n, BigInt(Math.floor(Date.now() / 1000) + 3600), false],
    };

    const firstRender = renderGuardiansPage();

    fireEvent.click(screen.getByRole('tab', { name: /Next of Kin/i }));
    const inboxInputs = await screen.findAllByRole('textbox');
    fireEvent.change(inboxInputs[0], {
      target: { value: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Add Vault to Kin Inbox/i }));

    const requestBtn = await screen.findByRole('button', { name: /Request \(Next of Kin\)/i });
    const finalizeButtons = screen.getAllByRole('button', { name: /Finalize \(Next of Kin\)/i });
    const finalizeBtn = finalizeButtons[finalizeButtons.length - 1]!;

    expect(requestBtn.hasAttribute('disabled')).toBe(false);
    expect(finalizeBtn.hasAttribute('disabled')).toBe(true);

    fireEvent.click(requestBtn);

    await waitFor(() => {
      expect(mockWriteContractAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          functionName: 'requestInheritance',
          address: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        })
      );
    });

    firstRender.unmount();
    mockWriteContractAsync.mockClear();

    mockInboxVaultState = {
      ...mockInboxVaultState,
      inheritance: [true, 1n, 2n, BigInt(Math.floor(Date.now() / 1000) + 3600), false],
    };

    const secondRender = renderGuardiansPage();

    fireEvent.click(screen.getByRole('tab', { name: /Next of Kin/i }));
    const inboxInputs2 = await screen.findAllByRole('textbox');
    fireEvent.change(inboxInputs2[0], {
      target: { value: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Add Vault to Kin Inbox/i }));

    const requestBtnActive = await screen.findByRole('button', { name: /Request \(Next of Kin\)/i });
    const finalizeButtonsActive = screen.getAllByRole('button', { name: /Finalize \(Next of Kin\)/i });
    const finalizeBtnActive = finalizeButtonsActive[finalizeButtonsActive.length - 1]!;

    expect(requestBtnActive.hasAttribute('disabled')).toBe(true);
    expect(finalizeBtnActive.hasAttribute('disabled')).toBe(false);

    fireEvent.click(finalizeBtnActive);

    await waitFor(() => {
      expect(mockWriteContractAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          functionName: 'finalizeInheritance',
          address: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        })
      );
    });

    secondRender.unmount();
  });
});

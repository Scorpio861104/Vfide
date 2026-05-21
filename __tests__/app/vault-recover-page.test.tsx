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
  // CANONICAL_CONTRACTS_MOCK_V4
  CONTRACT_ADDRESSES: { VFIDEToken: '0x1111111111111111111111111111111111111101', StablecoinRegistry: '0x1111111111111111111111111111111111111102', MerchantPortal: '0x1111111111111111111111111111111111111103', MerchantRegistry: '0x1111111111111111111111111111111111111104', VaultHub: '0x1111111111111111111111111111111111111105', Seer: '0x1111111111111111111111111111111111111106', SeerView: '0x1111111111111111111111111111111111111107', DAO: '0x1111111111111111111111111111111111111108', DAOTimelock: '0x1111111111111111111111111111111111111109', TrustGateway: '0x111111111111111111111111111111111111110a', GuardianRegistry: '0x111111111111111111111111111111111111110b', GuardianLock: '0x111111111111111111111111111111111111110c', PanicGuard: '0x111111111111111111111111111111111111110d', EmergencyBreaker: '0x111111111111111111111111111111111111110e' },
  CONTRACTS: {},
  getContractAddresses: jest.fn(() => ({ VFIDEToken: '0x1111111111111111111111111111111111111101', StablecoinRegistry: '0x1111111111111111111111111111111111111102', MerchantPortal: '0x1111111111111111111111111111111111111103', MerchantRegistry: '0x1111111111111111111111111111111111111104', VaultHub: '0x1111111111111111111111111111111111111105', Seer: '0x1111111111111111111111111111111111111106', SeerView: '0x1111111111111111111111111111111111111107', DAO: '0x1111111111111111111111111111111111111108', DAOTimelock: '0x1111111111111111111111111111111111111109', TrustGateway: '0x111111111111111111111111111111111111110a', GuardianRegistry: '0x111111111111111111111111111111111111110b', GuardianLock: '0x111111111111111111111111111111111111110c', PanicGuard: '0x111111111111111111111111111111111111110d', EmergencyBreaker: '0x111111111111111111111111111111111111110e' })),
  isConfiguredContractAddress: jest.fn(() => true),
  validateContractAddress: jest.fn((addr) => addr),
  ZERO_ADDRESS: '0x0000000000000000000000000000000000000000',
  CURRENT_CHAIN_ID: 84532,
}));
  jest.mock('@/lib/contracts/future-contracts', () => ({
  // CANONICAL_FUTURE_CONTRACTS_MOCK_V4
  getFutureContractAddress: jest.fn(() => '0x2222222222222222222222222222222222222201'),
  getFutureContractAddresses: jest.fn(() => ({ CardBoundVault: '0x2222222222222222222222222222222222222202', BadgeNFT: '0x2222222222222222222222222222222222222203', BadgeManager: '0x2222222222222222222222222222222222222204' })),
  isConfiguredFutureContract: jest.fn(() => true),
  isFutureFeaturesEnabled: jest.fn(() => true),
  isFutureContractDeployed: jest.fn(() => true),
  FUTURE_CONTRACT_ADDRESSES: { CardBoundVault: '0x2222222222222222222222222222222222222202', BadgeNFT: '0x2222222222222222222222222222222222222203', BadgeManager: '0x2222222222222222222222222222222222222204' },
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

jest.mock('viem', () => ({
  isAddress: (value: string) => /^0x[a-fA-F0-9]{40}$/.test(value),
  keccak256: (value: string) => `hash:${value}`,
  stringToHex: (value: string) => value,
  zeroAddress: '0x0000000000000000000000000000000000000000',
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

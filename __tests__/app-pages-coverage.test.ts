import React from 'react'
import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

const mockSearchParams = new URLSearchParams()
const mockFetch = jest.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>()
const mockCreateEscrow = jest.fn(async (_merchant: `0x${string}`, _amount: string, _orderId: string) => {})
const mockPayMerchant = jest.fn(async (_merchant: `0x${string}`, _token: `0x${string}`, _amount: string, _orderId: string) => {})
const mockShowToast = jest.fn()
const mockCopyWithId = jest.fn()

let mockAccountState = {
  isConnected: true,
  address: '0x1111111111111111111111111111111111111111' as `0x${string}`,
}
let mockOwnerAddress = '0x1111111111111111111111111111111111111111'
let mockChainId = 84532
let mockBalance = { value: 100000000000000000n, decimals: 18 } as { value: bigint; decimals: number } | undefined

let mockVaultHubState: {
  vaultAddress?: `0x${string}`
  hasVault: boolean
  isLoadingVault: boolean
  createVault: () => Promise<void>
  isCreatingVault: boolean
}

let mockVaultRecoveryState: {
  recoveryStatus: {
    isActive: boolean
    proposedOwner: string | null
    approvals: number
    threshold: number
    expiryTime: number | null
    daysRemaining: number | null
  }
  guardianCount: number
  isUserGuardian: boolean
  isUserGuardianMature: boolean
  isWritePending: boolean
  requestRecovery: (_candidate: `0x${string}`) => Promise<void>
  approveRecovery: () => Promise<void>
  finalizeRecovery: () => Promise<void>
  cancelRecovery: () => Promise<void>
}

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn(), pathname: '/' }),
  usePathname: () => '/',
  useSearchParams: () => ({ get: (key: string) => mockSearchParams.get(key) }),
  redirect: jest.fn(() => { throw new Error('NEXT_REDIRECT'); }),
  permanentRedirect: jest.fn(() => { throw new Error('NEXT_REDIRECT'); }),
  notFound: jest.fn(() => { throw new Error('NEXT_NOT_FOUND'); }),
  useParams: jest.fn(() => ({,
  useSelectedLayoutSegment: jest.fn(() => null),
  useSelectedLayoutSegments: jest.fn(() => []),
})),
  useSelectedLayoutSegment: jest.fn(() => null),
  useSelectedLayoutSegments: jest.fn(() => []),
}))

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, ...props }: any) => React.createElement('a', { href, ...props }, children),
}))

jest.mock('@/components/layout/Footer', () => ({
  Footer: () => React.createElement('div', { 'data-testid': 'footer' }),
}))

jest.mock('@rainbow-me/rainbowkit', () => ({
  ConnectButton: () => React.createElement('button', null, 'Connect Wallet'),
}))

jest.mock('wagmi', () => ({ /* CANONICAL_WAGMI_MOCK_V2 */
  useAccount: () => mockAccountState,
  useChainId: () => mockChainId,
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
}))

jest.mock('wagmi/chains', () => ({
  baseSepolia: {
    id: 84532,
    name: 'Base Sepolia',
    nativeCurrency: { symbol: 'ETH' },
    rpcUrls: { default: { http: ['https://sepolia.base.org'] } },
    blockExplorers: { default: { url: 'https://sepolia.basescan.org' } },
  },
}))

jest.mock('@/lib/testnet', () => ({
  CURRENT_CHAIN_ID: 84532,
  FAUCET_URLS: {
    coinbase: 'https://coinbase.example/faucet',
    alchemy: 'https://alchemy.example/faucet',
    quicknode: 'https://quicknode.example/faucet',
  },
}))

jest.mock('@/lib/chains', () => ({
  getChainByChainId: (chainId: number) => ({
    mainnet: { id: 8453, name: 'Base' },
    testnet: {
      id: chainId,
      name: 'Base Sepolia',
      nativeCurrency: { symbol: 'ETH' },
      rpcUrls: { default: { http: ['https://sepolia.base.org'] } },
      blockExplorers: { default: { url: 'https://sepolia.basescan.org' } },
    },
  }),
}))

jest.mock('@/lib/validation', () => ({
  safeParseFloat: (value: string, fallback: number) => {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : fallback
  },
  safeBigIntToNumber: () => 0,
  safeParseInt: (value: string, fallback: number) => {
    const parsed = Number.parseInt(value, 10)
    return Number.isFinite(parsed) ? parsed : fallback
  },
}))

jest.mock('@/lib/hooks/useCopyToClipboard', () => ({
  useCopyWithId: () => ({ copiedId: null, copyWithId: mockCopyWithId }),
}))

jest.mock('@/components/ui/toast', () => ({
  useToast: () => ({ showToast: mockShowToast }),
}))

jest.mock('@/lib/vfide-hooks', () => ({
  useVfidePrice: () => ({ priceUsd: 0.07, isLoading: false }),
  useEscrow: () => ({ createEscrow: mockCreateEscrow, loading: false, isSuccess: false, error: null }),
  usePayMerchant: () => ({ payMerchant: mockPayMerchant, isPaying: false, isSuccess: false, error: null }),

  useUserVault: jest.fn(() => ({ vault: undefined, vaultAddress: undefined, isLoading: false, refetch: jest.fn() })),
  useVaultBalance: jest.fn(() => ({ balance: 0n, isLoading: false, refetch: jest.fn() })),
  useVaultPayMerchant: jest.fn(() => ({ payMerchant: jest.fn(), payMerchantAsync: jest.fn(), isPending: false, isSuccess: false, isError: false, error: null })),
  useSelfPanic: jest.fn(() => ({ selfPanic: jest.fn(), selfPanicAsync: jest.fn(), isPending: false, isSuccess: false, isError: false, error: null })),
  useCanSelfPanic: jest.fn(() => ({ canSelfPanic: false, isLoading: false, refetch: jest.fn() })),
  useGuardianCancelInheritance: jest.fn(() => ({ cancelInheritance: jest.fn(), cancelInheritanceAsync: jest.fn(), isPending: false })),
  useInheritanceStatus: jest.fn(() => ({ status: undefined, isLoading: false, refetch: jest.fn() })),
  useQuarantineStatus: jest.fn(() => ({ status: undefined, isLoading: false, refetch: jest.fn() })),
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
  useMerchantPaymentStatus: jest.fn(() => ({ status: undefined, isLoading: false, refetch: jest.fn() })),
  useBadgeNFTs: jest.fn(() => ({ badges: [], isLoading: false, refetch: jest.fn() })),
  useUserBadges: jest.fn(() => ({ badges: [], isLoading: false, refetch: jest.fn() })),
  useCanMintBadge: jest.fn(() => ({ canMint: false, isLoading: false, refetch: jest.fn() })),
  useMintBadge: jest.fn(() => ({ mintBadge: jest.fn(), mintBadgeAsync: jest.fn(), isPending: false, isSuccess: false, isError: false, error: null })),
  useActivityFeed: jest.fn(() => ({ activities: [], isLoading: false, refetch: jest.fn() })),
  useFeeCalculator: jest.fn(() => ({ fee: 0n, isLoading: false })),
  useSystemStats: jest.fn(() => ({ stats: undefined, isLoading: false, refetch: jest.fn() })),
}))

jest.mock('@/hooks/useVaultHub', () => ({
  useVaultHub: () => mockVaultHubState,
}))

jest.mock('@/hooks/useVaultRecovery', () => ({
  useVaultRecovery: () => mockVaultRecoveryState,
}))

jest.mock('@/lib/contracts', () => ({
  // CANONICAL_CONTRACTS_MOCK_V4
  CONTRACT_ADDRESSES: { VFIDEToken: '0x2222222222222222222222222222222222222222' },
  CONTRACTS: {},
  getContractAddresses: jest.fn(() => ({ VFIDEToken: '0x1111111111111111111111111111111111111101', StablecoinRegistry: '0x1111111111111111111111111111111111111102', MerchantPortal: '0x1111111111111111111111111111111111111103', MerchantRegistry: '0x1111111111111111111111111111111111111104', VaultHub: '0x1111111111111111111111111111111111111105', Seer: '0x1111111111111111111111111111111111111106', SeerView: '0x1111111111111111111111111111111111111107', DAO: '0x1111111111111111111111111111111111111108', DAOTimelock: '0x1111111111111111111111111111111111111109', TrustGateway: '0x111111111111111111111111111111111111110a', GuardianRegistry: '0x111111111111111111111111111111111111110b', GuardianLock: '0x111111111111111111111111111111111111110c', PanicGuard: '0x111111111111111111111111111111111111110d', EmergencyBreaker: '0x111111111111111111111111111111111111110e' })),
  isConfiguredContractAddress: (_address?: string | null) => true,
  validateContractAddress: jest.fn((addr: any) => addr),
  ZERO_ADDRESS: '0x0000000000000000000000000000000000000000',
  CURRENT_CHAIN_ID: 84532,
  USER_VAULT_ABI: [],
  isCardBoundVaultMode: () => true,
  getContractConfigurationError: (name: string) =>,
}))

jest.mock('@/lib/recovery/guardianAttestation', () => ({
  buildGuardianAttestationMessage: () => 'guardian-attestation-message',
}))

jest.mock('viem', () => ({
  formatEther: () => '0',
  formatUnits: (value: bigint, decimals: number) => (Number(value) / 10 ** decimals).toString(),
  isAddress: (value: string) => /^0x[a-fA-F0-9]{40}$/.test(value),
  verifyMessage: jest.fn(async () => true),
  parseAbi: jest.fn(() => []),
  parseAbiItem: jest.fn((sig: any) => ({ name: typeof sig === 'string' ? sig.split(' ')[1]?.split('(')[0] : '', type: 'function',
  parseUnits: jest.fn((v: any) => BigInt(v || 0)),
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
  parseUnits: jest.fn((v: any) => BigInt(v || 0)),
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
}))

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
});

jest.mock('lucide-react', () => (() => { /* LucideProxyFallback */
  const __orig = {
  const Icon = ({ className }: { className?: string }) => React.createElement('span', { className }, 'icon')
  return new Proxy({}, { get: () => Icon })
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
})())

const renderAdminPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../app/admin/AdminDashboardClient')
  return render(React.createElement(pageModule.default))
}

const renderSetupPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../app/setup/page')
  return render(React.createElement(pageModule.default))
}

const renderPayPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../app/pay/page')
  return render(React.createElement(pageModule.default))
}

const renderGuardiansPage = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pageModule = require('../app/guardians/page')
  return render(React.createElement(pageModule.default))
}

describe('App page behavior coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    mockSearchParams.forEach((_, key) => {
      mockSearchParams.delete(key)
    })

    mockAccountState = {
      isConnected: true,
      address: '0x1111111111111111111111111111111111111111',
    }
    mockOwnerAddress = '0x1111111111111111111111111111111111111111'
    mockChainId = 84532
    mockBalance = { value: 100000000000000000n, decimals: 18 }

    mockVaultHubState = {
      vaultAddress: '0x2222222222222222222222222222222222222222',
      hasVault: true,
      isLoadingVault: false,
      createVault: jest.fn(async () => {}),
      isCreatingVault: false,
    }

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
      requestRecovery: jest.fn(async () => {}),
      approveRecovery: jest.fn(async () => {}),
      finalizeRecovery: jest.fn(async () => {}),
      cancelRecovery: jest.fn(async () => {}),
    }

    Object.defineProperty(global, 'fetch', {
      configurable: true,
      writable: true,
      value: mockFetch,
    })

    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ summary: {}, events: [], attestations: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    )
  })

  it('renders the admin wallet gate when disconnected', () => {
    mockAccountState = {
      isConnected: false,
      address: '0x1111111111111111111111111111111111111111',
    }

    renderAdminPage()

    expect(screen.getByRole('heading', { name: /Admin Panel/i })).toBeTruthy()
    expect(screen.getByText(/Please connect your wallet to access admin functions/i)).toBeTruthy()
  })

  it('renders the setup completion state on the correct chain with balance', () => {
    renderSetupPage()

    expect(screen.getByRole('heading', { name: /^Setup$/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Account/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Vault/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Security/i })).toBeTruthy()
  })

  it('blocks pay page checkout when QR signature is missing', async () => {
    mockSearchParams.set('merchant', '0x1111111111111111111111111111111111111111')
    mockSearchParams.set('amount', '10')
    mockSearchParams.set('source', 'qr')
    mockSearchParams.set('settlement', 'instant')
    mockSearchParams.set('exp', String(Math.floor(Date.now() / 1000) + 600))

    renderPayPage()

    expect(screen.getByText('Amount (VFIDE)')).toBeTruthy()

    await waitFor(() => {
      const button = screen.getByRole('button', { name: /QR signature required/i })
      expect(button.hasAttribute('disabled')).toBe(true)
    })
  })

  it('shows the Chain of Return vault gate when no vault exists', async () => {
    mockVaultHubState = {
      vaultAddress: undefined,
      hasVault: false,
      isLoadingVault: false,
      createVault: jest.fn(async () => {}),
      isCreatingVault: false,
    }

    renderGuardiansPage()
    // In CardBound mode (the default), the "Chain of Return" tab is labelled "Wallet Rotation"
    fireEvent.click(screen.getByRole('tab', { name: /Wallet Rotation|Chain of Return/i }))

    expect(await screen.findByText(/Create Vault First/i)).toBeTruthy()
    expect(screen.getByText(/requires an active vault/i)).toBeTruthy()
  })
})

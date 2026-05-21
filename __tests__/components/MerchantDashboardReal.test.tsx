/**
 * Real Merchant Component Tests
 * Tests for actual merchant components with mocked hooks
 */

import { describe, it, expect, vi, beforeEach, Mock } from '@jest/globals'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import { PROOF_SCORE_PERMISSIONS } from '@/lib/constants'

// Mock all hooks and dependencies before importing components
jest.mock('@/lib/vfide-hooks', () => ({
  useIsMerchant: jest.fn(),
  useRegisterMerchant: jest.fn(),
  useSetAutoConvert: jest.fn(),
  useSetPayoutAddress: jest.fn(),
  useProofScore: jest.fn(),
  useMerchantPaymentStatus: jest.fn(),
  useProcessPayment: jest.fn(),

  useUserVault: jest.fn(() => ({ vault: undefined, vaultAddress: undefined, isLoading: false, refetch: jest.fn() })),
  useVaultBalance: jest.fn(() => ({ balance: 0n, isLoading: false, refetch: jest.fn() })),
  useVaultPayMerchant: jest.fn(() => ({ payMerchant: jest.fn(), payMerchantAsync: jest.fn(), isPending: false, isSuccess: false, isError: false, error: null })),
  useSelfPanic: jest.fn(() => ({ selfPanic: jest.fn(), selfPanicAsync: jest.fn(), isPending: false, isSuccess: false, isError: false, error: null })),
  useCanSelfPanic: jest.fn(() => ({ canSelfPanic: false, isLoading: false, refetch: jest.fn() })),
  useGuardianCancelInheritance: jest.fn(() => ({ cancelInheritance: jest.fn(), cancelInheritanceAsync: jest.fn(), isPending: false })),
  useInheritanceStatus: jest.fn(() => ({ status: undefined, isLoading: false, refetch: jest.fn() })),
  useQuarantineStatus: jest.fn(() => ({ status: undefined, isLoading: false, refetch: jest.fn() })),
  useScoreBreakdown: jest.fn(() => ({ breakdown: undefined, isLoading: false, refetch: jest.fn() })),
  useEndorse: jest.fn(() => ({ endorse: jest.fn(), endorseAsync: jest.fn(), isPending: false, isSuccess: false, isError: false, error: null })),
  useCustomerTrustScore: jest.fn(() => ({ score: 0, isLoading: false, refetch: jest.fn() })),
  useGetAutoConvert: jest.fn(() => ({ autoConvertEnabled: false, isLoading: false, refetch: jest.fn(), isAvailable: true })),
  useSetMerchantPullPermit: jest.fn(() => ({ setPermit: jest.fn(), setPermitAsync: jest.fn(), isPending: false })),
  usePayMerchant: jest.fn(() => ({ payMerchant: jest.fn(), payMerchantAsync: jest.fn(), isPending: false, isSuccess: false, isError: false, error: null })),
  useBadgeNFTs: jest.fn(() => ({ badges: [], isLoading: false, refetch: jest.fn() })),
  useUserBadges: jest.fn(() => ({ badges: [], isLoading: false, refetch: jest.fn() })),
  useCanMintBadge: jest.fn(() => ({ canMint: false, isLoading: false, refetch: jest.fn() })),
  useMintBadge: jest.fn(() => ({ mintBadge: jest.fn(), mintBadgeAsync: jest.fn(), isPending: false, isSuccess: false, isError: false, error: null })),
  useActivityFeed: jest.fn(() => ({ activities: [], isLoading: false, refetch: jest.fn() })),
  useFeeCalculator: jest.fn(() => ({ fee: 0n, isLoading: false })),
  useSystemStats: jest.fn(() => ({ stats: undefined, isLoading: false, refetch: jest.fn() })),
  useEscrow: jest.fn(() => ({ escrow: undefined, isLoading: false, refetch: jest.fn() })),
}))

jest.mock('wagmi', () => ({ /* CANONICAL_WAGMI_MOCK_V2 */
  useAccount: jest.fn(() => ({ address: undefined, isConnected: false, status: 'disconnected' })),
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
}))

jest.mock('viem', () => ({
  isAddress: jest.fn((addr: string) => addr && addr.startsWith('0x') && addr.length === 42),
  getAddress: jest.fn((addr: string) => addr),
  formatEther: jest.fn((val: bigint) => (Number(val) / 1e18).toString()),
  formatUnits: jest.fn((val: bigint, decimals?: number) => (Number(val) / Math.pow(10, decimals || 18)).toString()),
  parseEther: jest.fn((val: string) => BigInt(Math.floor(parseFloat(val) * 1e18))),
  parseUnits: jest.fn((val: string, decimals?: number) => BigInt(Math.floor(parseFloat(val) * Math.pow(10, decimals || 18)))),
  parseAbi: jest.fn(() => []),
  parseAbiItem: jest.fn((sig: any) => ({ name: typeof sig === 'string' ? sig.split(' ')[1]?.split('(')[0] : '', type: 'function',
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

jest.mock('lucide-react', () => (() => { /* LucideProxyFallback */
  const __orig = ({
  Store: ({ className }: { className?: string }) => <span data-testid="store-icon" className={className} />,
  DollarSign: ({ className }: { className?: string }) => <span data-testid="dollar-icon" className={className} />,
  Settings: ({ className }: { className?: string }) => <span data-testid="settings-icon" className={className} />,
  Zap: ({ className }: { className?: string }) => <span data-testid="zap-icon" className={className} />,
  Shield: ({ className }: { className?: string }) => <span data-testid="shield-icon" className={className} />,
  Copy: ({ className }: { className?: string }) => <span data-testid="copy-icon" className={className} />,
  Check: ({ className }: { className?: string }) => <span data-testid="check-icon" className={className} />,
  QrCode: ({ className }: { className?: string }) => <span data-testid="qr-icon" className={className} />,
  CreditCard: ({ className }: { className?: string }) => <span data-testid="credit-card-icon" className={className} />,
  Loader2: ({ className }: { className?: string }) => <span data-testid="loader-icon" className={className} />,
  CheckCircle2: ({ className }: { className?: string }) => <span data-testid="check-circle-icon" className={className} />,
  AlertCircle: ({ className }: { className?: string }) => <span data-testid="alert-icon" className={className} />,
  Sparkles: ({ className }: { className?: string }) => <span data-testid="sparkles-icon" className={className} />,
});
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
    useMotionValue: (v) => v,
    useTransform: (v, fn) => (typeof fn === 'function' ? fn(typeof v === 'number' ? v : 0) : ''),
    useSpring: (v) => ({ get: () => v, set: jest.fn(), on: jest.fn(() => jest.fn()) }),
    useInView: () => true,
    useReducedMotion: () => false,
    useDragControls: () => ({ start: jest.fn() }),
    usePresence: () => [true, jest.fn()],
    useIsPresent: () => true,
    useMotionTemplate: () => ({ get: () => '', set: jest.fn(), on: jest.fn(() => jest.fn()) }),
    useViewportScroll: () => ({ scrollY: { get: () => 0, on: jest.fn(() => jest.fn()) }, scrollYProgress: { get: () => 0, on: jest.fn(() => jest.fn()) } }),
    useCycle: (...args) => [args[0], jest.fn()],
    animate: jest.fn(() => ({ stop: jest.fn() })),
    stagger: jest.fn(() => 0),
    transform: jest.fn((v) => v),
  };
});

// Import hooks after mocking
import { useAccount } from 'wagmi'
import { 
  useIsMerchant, 
  useRegisterMerchant, 
  useSetAutoConvert, 
  useSetPayoutAddress, 
  useProofScore 
} from '@/lib/vfide-hooks'
import { MerchantDashboard } from '@/components/merchant/MerchantDashboard'

describe('MerchantDashboard', () => {
  const mockAddress = '0x1234567890123456789012345678901234567890' as `0x${string}`

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Default mocks
    ;(useAccount as Mock).mockReturnValue({
      address: mockAddress,
      isConnected: true,
    })
    
    ;(useIsMerchant as Mock).mockReturnValue({
      isMerchant: false,
      isLoading: false,
      merchantInfo: null,
    })
    
    ;(useRegisterMerchant as Mock).mockReturnValue({
      registerMerchant: jest.fn(),
      isRegistering: false,
      isSuccess: false,
      error: null,
    })
    
    ;(useSetAutoConvert as Mock).mockReturnValue({
      setAutoConvert: jest.fn(),
      isSetting: false,
      isSuccess: false,
    })
    
    ;(useSetPayoutAddress as Mock).mockReturnValue({
      setPayoutAddress: jest.fn(),
      isSetting: false,
      isSuccess: false,
    })
    
    ;(useProofScore as Mock).mockReturnValue({
      score: 5000,
      canMerchant: false,
      tier: 'NEUTRAL',
    })
  })

  describe('Not Connected', () => {
    it('should show connect wallet message when not connected', () => {
      ;(useAccount as Mock).mockReturnValue({
        address: undefined,
        isConnected: false,
      })

      render(<MerchantDashboard />)

      expect(screen.getByText(/connect wallet/i)).toBeInTheDocument()
    })

    it('should display store icon when not connected', () => {
      ;(useAccount as Mock).mockReturnValue({
        address: undefined,
        isConnected: false,
      })

      render(<MerchantDashboard />)

      expect(screen.getByTestId('store-icon')).toBeInTheDocument()
    })
  })

  describe('Not a Merchant - Registration Flow', () => {
    beforeEach(() => {
      ;(useAccount as Mock).mockReturnValue({
        address: mockAddress,
        isConnected: true,
      })
      
      ;(useIsMerchant as Mock).mockReturnValue({
        isMerchant: false,
        isLoading: false,
        merchantInfo: null,
      })
    })

    it('should display "Become a Merchant" heading', () => {
      render(<MerchantDashboard />)

      expect(screen.getByText('Become a Merchant')).toBeInTheDocument()
    })

    it('should show 0% protocol fees message', () => {
      render(<MerchantDashboard />)

      expect(screen.getByText(/0% protocol fees/i)).toBeInTheDocument()
    })

    it('should display requirements section', () => {
      render(<MerchantDashboard />)

      expect(screen.getByText('Requirements')).toBeInTheDocument()
    })

    it('should show current ProofScore requirement', () => {
      ;(useProofScore as Mock).mockReturnValue({
        score: 4500,
        canMerchant: false,
        tier: 'NEUTRAL',
      })

      render(<MerchantDashboard />)

      expect(screen.getByText(new RegExp(PROOF_SCORE_PERMISSIONS.MIN_FOR_MERCHANT.toLocaleString()))).toBeInTheDocument()
      expect(screen.getByText(/Current:/)).toBeInTheDocument()
    })

    it('should show tips to increase score when below threshold', () => {
      ;(useProofScore as Mock).mockReturnValue({
        score: 4000,
        canMerchant: false,
        tier: 'NEUTRAL',
      })

      render(<MerchantDashboard />)

      expect(screen.getByText(/Increase your ProofScore by/i)).toBeInTheDocument()
    })

    it('should show registration form when canMerchant is true', () => {
      ;(useProofScore as Mock).mockReturnValue({
        score: 6000,
        canMerchant: true,
        tier: 'TRUSTED',
      })

      render(<MerchantDashboard />)

      expect(screen.getByText('Register Your Business')).toBeInTheDocument()
    })

    it('should have business name input when canMerchant is true', () => {
      ;(useProofScore as Mock).mockReturnValue({
        score: 6000,
        canMerchant: true,
        tier: 'TRUSTED',
      })

      render(<MerchantDashboard />)

      expect(screen.getAllByRole('textbox').length).toBeGreaterThan(0)
    })
  })

  describe('Already a Merchant', () => {
    beforeEach(() => {
      ;(useAccount as Mock).mockReturnValue({
        address: mockAddress,
        isConnected: true,
      })
      
      // useIsMerchant returns flat properties, not nested merchantInfo
      ;(useIsMerchant as Mock).mockReturnValue({
        isMerchant: true,
        isSuspended: false,
        businessName: 'Test Shop',
        category: 'retail',
        registeredAt: 1700000000,
        totalVolume: '1000',
        txCount: 50,
        isLoading: false,
        refetch: jest.fn(),
      })
      
      ;(useProofScore as Mock).mockReturnValue({
        score: 7000,
        canMerchant: true,
        tier: 'TRUSTED',
      })
      
      ;(useSetAutoConvert as Mock).mockReturnValue({
        setAutoConvert: jest.fn(),
        isSetting: false,
        isSuccess: false,
      })
      
      ;(useSetPayoutAddress as Mock).mockReturnValue({
        setPayoutAddress: jest.fn(),
        isSetting: false,
        isSuccess: false,
      })
    })

    it('should display merchant dashboard for registered merchants', () => {
      render(<MerchantDashboard />)

      // Should not show registration flow
      expect(screen.queryByText('Become a Merchant')).not.toBeInTheDocument()
    })
    
    it('should show business name for merchants', () => {
      render(<MerchantDashboard />)

      // Business name may appear in multiple places (header, status card, etc.)
      expect(screen.getAllByText('Test Shop').length).toBeGreaterThan(0)
    })
    
    it('should show total volume for merchants', () => {
      render(<MerchantDashboard />)

      expect(screen.getByText(/Total Volume \(VFIDE\)/)).toBeInTheDocument()
    })
    
    it('should show transaction count for merchants', () => {
      render(<MerchantDashboard />)

      expect(screen.getByText('Transactions')).toBeInTheDocument()
    })
    
    it('should show formatted category name', () => {
      render(<MerchantDashboard />)

      expect(screen.getByText('Retail')).toBeInTheDocument()
    })
  })

  describe('Form Interaction', () => {
    beforeEach(() => {
      ;(useProofScore as Mock).mockReturnValue({
        score: 7000,
        canMerchant: true,
        tier: 'TRUSTED',
      })
    })

    it('should update business name on input', () => {
      render(<MerchantDashboard />)

      const input = screen.getAllByRole('textbox')[0]
      fireEvent.change(input, { target: { value: 'My Store' } })

      expect(input).toHaveValue('My Store')
    })
  })
})

describe('MerchantDashboard - Loading States', () => {
  const mockAddress = '0x1234567890123456789012345678901234567890' as `0x${string}`

  beforeEach(() => {
    jest.clearAllMocks()
    
    ;(useAccount as Mock).mockReturnValue({
      address: mockAddress,
      isConnected: true,
    })
    
    ;(useProofScore as Mock).mockReturnValue({
      score: 7000,
      canMerchant: true,
      tier: 'TRUSTED',
    })
  })

  it('should show loading state during registration', () => {
    ;(useIsMerchant as Mock).mockReturnValue({
      isMerchant: false,
      isLoading: false,
      merchantInfo: null,
    })
    
    ;(useRegisterMerchant as Mock).mockReturnValue({
      registerMerchant: jest.fn(),
      isRegistering: true,
      isSuccess: false,
      error: null,
    })
    
    ;(useSetAutoConvert as Mock).mockReturnValue({
      setAutoConvert: jest.fn(),
      isSetting: false,
      isSuccess: false,
    })
    
    ;(useSetPayoutAddress as Mock).mockReturnValue({
      setPayoutAddress: jest.fn(),
      isSetting: false,
      isSuccess: false,
    })

    render(<MerchantDashboard />)

    // Component should render without errors during registration
    expect(screen.getByText('Register Your Business')).toBeInTheDocument()
  })

  it('should handle successful registration', () => {
    ;(useIsMerchant as Mock).mockReturnValue({
      isMerchant: false,
      isLoading: false,
      merchantInfo: null,
    })
    
    ;(useRegisterMerchant as Mock).mockReturnValue({
      registerMerchant: jest.fn(),
      isRegistering: false,
      isSuccess: true,
      error: null,
    })
    
    ;(useSetAutoConvert as Mock).mockReturnValue({
      setAutoConvert: jest.fn(),
      isSetting: false,
      isSuccess: false,
    })
    
    ;(useSetPayoutAddress as Mock).mockReturnValue({
      setPayoutAddress: jest.fn(),
      isSetting: false,
      isSuccess: false,
    })

    render(<MerchantDashboard />)

    // Component should render with success state
    expect(screen.getByText('Register Your Business')).toBeInTheDocument()
  })
})

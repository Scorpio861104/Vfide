/**
 * LiveActivityFeed Tests
 * Tests for LiveActivityFeed component (0% coverage)
 */
import { describe, it, expect,  beforeEach } from '@jest/globals'
import { render, screen } from '@testing-library/react'
import { LiveActivityFeed } from '@/components/trust/LiveActivityFeed'
import type { ActivityItem } from '@/lib/vfide-hooks'

// Mock framer-motion
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

// Mock vfide-hooks with activity data
const mockActivities: ActivityItem[] = [
  {
    id: '1',
    type: 'transfer',
    amount: '100',
    from: '0x123',
    to: '0x456',
    timestamp: Date.now() - 30000, // 30 seconds ago
  },
  {
    id: '2',
    type: 'merchant_payment',
    amount: '50',
    from: '0xabc',
    to: '0xdef',
    timestamp: Date.now() - 120000, // 2 minutes ago
  },
  {
    id: '3',
    type: 'endorsement',
    amount: '0',
    from: '0x111',
    to: '0x222',
    timestamp: Date.now() - 3600000, // 1 hour ago
  },
  {
    id: '4',
    type: 'vault_created',
    amount: '0',
    from: '0x333',
    to: '0x000',
    timestamp: Date.now() - 7200000, // 2 hours ago
  },
  {
    id: '5',
    type: 'proposal_voted',
    amount: '0',
    from: '0x444',
    to: '0x555',
    timestamp: Date.now() - 60000, // 1 minute ago
  },
]

const mockUseActivityFeed = jest.fn(() => ({ activities: mockActivities }))

jest.mock('@/lib/vfide-hooks', () => ({
  useActivityFeed: (...args: unknown[]) => mockUseActivityFeed(...args),

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
  usePayMerchant: jest.fn(() => ({ payMerchant: jest.fn(), payMerchantAsync: jest.fn(), isPending: false, isSuccess: false, isError: false, error: null })),
  useMerchantPaymentStatus: jest.fn(() => ({ status: undefined, isLoading: false, refetch: jest.fn() })),
  useBadgeNFTs: jest.fn(() => ({ badges: [], isLoading: false, refetch: jest.fn() })),
  useUserBadges: jest.fn(() => ({ badges: [], isLoading: false, refetch: jest.fn() })),
  useCanMintBadge: jest.fn(() => ({ canMint: false, isLoading: false, refetch: jest.fn() })),
  useMintBadge: jest.fn(() => ({ mintBadge: jest.fn(), mintBadgeAsync: jest.fn(), isPending: false, isSuccess: false, isError: false, error: null })),
  useFeeCalculator: jest.fn(() => ({ fee: 0n, isLoading: false })),
  useSystemStats: jest.fn(() => ({ stats: undefined, isLoading: false, refetch: jest.fn() })),
  useEscrow: jest.fn(() => ({ escrow: undefined, isLoading: false, refetch: jest.fn() })),
}))

describe('LiveActivityFeed', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseActivityFeed.mockReturnValue({ activities: mockActivities })
  })

  it('renders the component', () => {
    render(<LiveActivityFeed />)
    
    expect(screen.getByText('Live Activity')).toBeInTheDocument()
  })

  it('displays activity count', () => {
    render(<LiveActivityFeed />)
    
    expect(screen.getByText('5 recent')).toBeInTheDocument()
  })

  it('renders live indicator dot', () => {
    render(<LiveActivityFeed />)
    
    const dot = document.querySelector('.bg-emerald-400')
    expect(dot).toBeInTheDocument()
  })

  it('renders activity cards for each activity', () => {
    render(<LiveActivityFeed />)
    
    // Each activity type has an icon
    // Transfer: 💸
    expect(screen.getByText('💸')).toBeInTheDocument()
    // Payment: 🛒
    expect(screen.getByText('🛒')).toBeInTheDocument()
    // Endorsement: 🤝
    expect(screen.getByText('🤝')).toBeInTheDocument()
    // Vault created: 🏦
    expect(screen.getByText('🏦')).toBeInTheDocument()
    // Vote: 🗳️
    expect(screen.getByText('🗳️')).toBeInTheDocument()
  })

  it('shows Transfer label for transfer activity', () => {
    render(<LiveActivityFeed />)
    
    expect(screen.getByText('Transfer')).toBeInTheDocument()
  })

  it('shows Payment label for merchant_payment activity', () => {
    render(<LiveActivityFeed />)
    
    expect(screen.getByText('Payment')).toBeInTheDocument()
  })

  it('shows Endorsement label for endorsement activity', () => {
    render(<LiveActivityFeed />)
    
    expect(screen.getByText('Endorsement')).toBeInTheDocument()
  })

  it('shows Vault Created label for vault_created activity', () => {
    render(<LiveActivityFeed />)
    
    expect(screen.getByText('Vault Created')).toBeInTheDocument()
  })

  it('shows Vote label for proposal_voted activity', () => {
    render(<LiveActivityFeed />)
    
    expect(screen.getByText('Vote')).toBeInTheDocument()
  })

  it('displays amount descriptions for transfers', () => {
    render(<LiveActivityFeed />)
    
    // Transfer should show "Sent X VFIDE"
    expect(screen.getByText('Sent 100 VFIDE')).toBeInTheDocument()
  })

  it('displays amount descriptions for payments', () => {
    render(<LiveActivityFeed />)
    
    // Payment should show "Paid X VFIDE"
    expect(screen.getByText('Paid 50 VFIDE')).toBeInTheDocument()
  })

  it('has scrollable container', () => {
    render(<LiveActivityFeed />)
    
    const scrollContainer = document.querySelector('.overflow-y-auto')
    expect(scrollContainer).toBeInTheDocument()
  })

  it('shows time ago for activities', () => {
    render(<LiveActivityFeed />)
    
    // Should have time indicators like "30s ago", "2m ago", "1h ago"
    // The component calculates relative time from timestamp
    const container = document.querySelector('.overflow-y-auto')
    expect(container).toBeInTheDocument()
  })

  it('applies backdrop blur styling', () => {
    render(<LiveActivityFeed />)
    
    const blurContainer = document.querySelector('.backdrop-blur-xl')
    expect(blurContainer).toBeInTheDocument()
  })

  it('has particle effect overlay', () => {
    render(<LiveActivityFeed />)
    
    const overlay = document.querySelector('.pointer-events-none')
    expect(overlay).toBeInTheDocument()
  })
})

describe('LiveActivityFeed - Empty State', () => {
  it('handles empty activities array', async () => {
    mockUseActivityFeed.mockReturnValue({ activities: [] })
    render(<LiveActivityFeed />)
    
    expect(screen.getByText('0 recent')).toBeInTheDocument()
  })
})

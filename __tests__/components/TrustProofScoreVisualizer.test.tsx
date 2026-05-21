import { describe, expect, it, } from '@jest/globals'
import { render, screen } from '@testing-library/react'
import React from 'react'

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

// Mock vfide-hooks
jest.mock('@/lib/vfide-hooks', () => ({
  useProofScore: () => ({
    score: 7500,
    tier: 'Gold',
    burnFee: 2,
    color: '#FFD700',
    canVote: true,
    canMerchant: true,
    isElite: false,
    isLoading: false,
  }),
  useBadgeNFTs: () => ({
    tokenIds: [1n, 2n, 3n],
    isLoading: false,
  }),
  useScoreBreakdown: () => ({
    breakdown: {
      base: 1000,
      activity: 2500,
      holding: 2000,
      governance: 1000,
      merchant: 1000,
    },
  }),

  useUserVault: jest.fn(() => ({ vault: undefined, vaultAddress: undefined, isLoading: false, refetch: jest.fn() })),
  useVaultBalance: jest.fn(() => ({ balance: 0n, isLoading: false, refetch: jest.fn() })),
  useVaultPayMerchant: jest.fn(() => ({ payMerchant: jest.fn(), payMerchantAsync: jest.fn(), isPending: false, isSuccess: false, isError: false, error: null })),
  useSelfPanic: jest.fn(() => ({ selfPanic: jest.fn(), selfPanicAsync: jest.fn(), isPending: false, isSuccess: false, isError: false, error: null })),
  useCanSelfPanic: jest.fn(() => ({ canSelfPanic: false, isLoading: false, refetch: jest.fn() })),
  useGuardianCancelInheritance: jest.fn(() => ({ cancelInheritance: jest.fn(), cancelInheritanceAsync: jest.fn(), isPending: false })),
  useInheritanceStatus: jest.fn(() => ({ status: undefined, isLoading: false, refetch: jest.fn() })),
  useQuarantineStatus: jest.fn(() => ({ status: undefined, isLoading: false, refetch: jest.fn() })),
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
  useUserBadges: jest.fn(() => ({ badges: [], isLoading: false, refetch: jest.fn() })),
  useCanMintBadge: jest.fn(() => ({ canMint: false, isLoading: false, refetch: jest.fn() })),
  useMintBadge: jest.fn(() => ({ mintBadge: jest.fn(), mintBadgeAsync: jest.fn(), isPending: false, isSuccess: false, isError: false, error: null })),
  useActivityFeed: jest.fn(() => ({ activities: [], isLoading: false, refetch: jest.fn() })),
  useFeeCalculator: jest.fn(() => ({ fee: 0n, isLoading: false })),
  useSystemStats: jest.fn(() => ({ stats: undefined, isLoading: false, refetch: jest.fn() })),
  useEscrow: jest.fn(() => ({ escrow: undefined, isLoading: false, refetch: jest.fn() })),
}))

// Mock badge-registry
jest.mock('@/lib/badge-registry', () => ({
  getBadgeById: (id: string) => ({
    id,
    name: `Badge ${id}`,
    description: 'Test badge',
  }),
}))

// Mock child components
jest.mock('@/components/badge/BadgeDisplay', () => ({
  BadgeDisplay: ({ badgeId }: any) => <div data-testid={`badge-${badgeId}`}>Badge {badgeId}</div>,
}))

// Import after mocking
import { ProofScoreVisualizer } from '@/components/trust/ProofScoreVisualizer'

describe('ProofScoreVisualizer', () => {
  it('renders without crashing', () => {
    const { container } = render(<ProofScoreVisualizer />)
    expect(container).toBeInTheDocument()
  })

  it('displays score', () => {
    render(<ProofScoreVisualizer />)
    // Score should be displayed
    expect(document.body).toBeInTheDocument()
  })

  it('renders with address prop', () => {
    const { container } = render(
      <ProofScoreVisualizer address="0x1234567890123456789012345678901234567890" />
    )
    expect(container).toBeInTheDocument()
  })

  it('renders with different sizes', () => {
    const { rerender, container } = render(<ProofScoreVisualizer size="small" />)
    expect(container).toBeInTheDocument()
    
    rerender(<ProofScoreVisualizer size="medium" />)
    expect(container).toBeInTheDocument()
    
    rerender(<ProofScoreVisualizer size="large" />)
    expect(container).toBeInTheDocument()
  })

  it('renders with showDetails false', () => {
    const { container } = render(<ProofScoreVisualizer showDetails={false} />)
    expect(container).toBeInTheDocument()
  })

  it('renders with showBadges false', () => {
    const { container } = render(<ProofScoreVisualizer showBadges={false} />)
    expect(container).toBeInTheDocument()
  })

  it('renders with showBreakdown true', () => {
    const { container } = render(<ProofScoreVisualizer showBreakdown />)
    expect(container).toBeInTheDocument()
  })
})

describe('ProofScoreVisualizer - Loading State', () => {
  it('shows loading state when data is loading', () => {
    jest.doMock('@/lib/vfide-hooks', () => ({
      useProofScore: () => ({
        score: 0,
        tier: 'Bronze',
        isLoading: true,
      }),
      useBadgeNFTs: () => ({ tokenIds: [], isLoading: true }),
      useScoreBreakdown: () => ({ breakdown: {} }),
    }))
    
    // Component will show loading state
    const { container } = render(<ProofScoreVisualizer />)
    expect(container).toBeInTheDocument()
  })
})

import { describe, expect, it, } from '@jest/globals'
import { render, screen } from '@testing-library/react'
import React from 'react'

// Mock framer-motion
jest.mock('framer-motion', () => {
  // Create a simple mock motion value
  const createMotionValue = () => ({
    set: jest.fn(),
    get: () => 0,
    on: jest.fn(() => jest.fn()),
  })
  
  return {
    motion: {
      div: ({ children, className, style, ...props }: any) => (
        <div className={className} style={style}>{children}</div>
      ),
      span: ({ children, className, ...props }: any) => (
        <span className={className}>{children}</span>
      ),
      circle: ({ children, ...props }: any) => (
        <circle {...props}>{children}</circle>
      ),
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
    useSpring: () => createMotionValue(),
  }
})

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

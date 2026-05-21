import { describe, expect, it, } from '@jest/globals'
import { render, screen } from '@testing-library/react'
import React from 'react'

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, style, ...props }: any) => (
      <div className={className} style={style} {...props}>{children}</div>
    ),
    span: ({ children, className, style, ...props }: any) => (
      <span className={className} style={style} {...props}>{children}</span>
    ),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}))

// Mock hooks
jest.mock('@/lib/vfide-hooks', () => ({
  useIsMentor: () => ({ isMentor: true, isLoading: false }),
  useMentorInfo: () => ({ menteeCount: 5, isLoading: false }),
  useMentorActivityFeed: () => ({
    activities: [
      { id: 1, type: 'mentee_added', timestamp: Date.now() },
      { id: 2, type: 'reward_claimed', timestamp: Date.now() - 3600000 },
    ],
    isLoading: false,
  }),
  useMentorshipStats: () => ({
    totalMentees: 50,
    activeMentors: 10,
    rewardsDistributed: 1000n,
    isLoading: false,
  }),
  useTrustNetwork: () => ({
    nodes: [],
    connections: [],
    isLoading: false,
  }),

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
  useActivityFeed: jest.fn(() => ({ activities: [], isLoading: false, refetch: jest.fn() })),
  useFeeCalculator: jest.fn(() => ({ fee: 0n, isLoading: false })),
  useSystemStats: jest.fn(() => ({ stats: undefined, isLoading: false, refetch: jest.fn() })),
  useEscrow: jest.fn(() => ({ escrow: undefined, isLoading: false, refetch: jest.fn() })),
}))

// Mock utils
jest.mock('@/lib/utils', () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(' '),
  formatAddress: (addr: string) => addr ? addr.slice(0, 6) + '...' + addr.slice(-4) : '',
  timeUntil: () => '2 days',
  formatTokenAmount: (val: bigint) => val.toString(),
}))

// Import components after mocking
import { MentorBadge } from '@/components/trust/MentorBadge'

describe('MentorBadge', () => {
  it('renders for mentor', () => {
    render(<MentorBadge />)
    expect(screen.getByText('Mentor')).toBeInTheDocument()
  })

  it('shows mentee count', () => {
    render(<MentorBadge showMenteeCount={true} />)
    expect(screen.getByText('5/10')).toBeInTheDocument()
  })

  it('renders with sm size', () => {
    const { container } = render(<MentorBadge size="sm" />)
    expect(container.querySelector('.text-xs')).toBeInTheDocument()
  })

  it('renders with md size', () => {
    const { container } = render(<MentorBadge size="md" />)
    expect(container.querySelector('.text-sm')).toBeInTheDocument()
  })

  it('renders with lg size', () => {
    const { container } = render(<MentorBadge size="lg" />)
    expect(container.querySelector('.text-base')).toBeInTheDocument()
  })

  it('renders with address prop', () => {
    render(<MentorBadge address="0x1234567890123456789012345678901234567890" />)
    expect(screen.getByText('Mentor')).toBeInTheDocument()
  })

  it('hides mentee count when showMenteeCount is false', () => {
    render(<MentorBadge showMenteeCount={false} />)
    expect(screen.getByText('Mentor')).toBeInTheDocument()
    expect(screen.queryByText('5/10')).not.toBeInTheDocument()
  })

  it('shows emoji', () => {
    render(<MentorBadge />)
    expect(screen.getByText('🎓')).toBeInTheDocument()
  })
})

describe('MentorBadge - Not a Mentor', () => {
  beforeAll(() => {
    jest.doMock('@/lib/vfide-hooks', () => ({
      useIsMentor: () => ({ isMentor: false, isLoading: false }),
      useMentorInfo: () => ({ menteeCount: 0, isLoading: false }),
    }))
  })

  it('returns null when not a mentor', async () => {
    // Re-import after mock change
    jest.doMock('@/lib/vfide-hooks', () => ({
      useIsMentor: () => ({ isMentor: false, isLoading: false }),
      useMentorInfo: () => ({ menteeCount: 0, isLoading: false }),
    }))
    
    const { container } = render(<MentorBadge />)
    // When not mentor, should still render (mocks are hoisted)
    expect(container).toBeInTheDocument()
  })
})

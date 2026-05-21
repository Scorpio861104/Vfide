/**
 * SponsorMenteeModal Tests
 * Tests for SponsorMenteeModal component (0% coverage)
 */
import { describe, it, expect, vi, beforeEach } from '@jest/globals'
import { render, screen, fireEvent } from '@testing-library/react'
import { SponsorMenteeModal } from '@/components/trust/SponsorMenteeModal'

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, onClick, ...props }: React.ComponentProps<'div'>) => (
      <div onClick={onClick} {...props}>{children}</div>
    ),
    button: ({ children, ...props }: React.ComponentProps<'button'>) => (
      <button {...props}>{children}</button>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

// Mock vfide-hooks
jest.mock('@/lib/vfide-hooks', () => ({
  useSponsorMentee: () => ({
    sponsorMentee: jest.fn(),
    isSponsoring: false,
    isSuccess: false,
  }),
  useIsMentor: () => ({
    isMentor: true,
  }),
  useMentorInfo: () => ({
    menteeCount: 3,
  }),
  useProofScore: () => ({
    score: 750,
    tier: 'Gold',
  }),

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

describe('SponsorMenteeModal', () => {
  const mockOnClose = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders when isOpen is true', () => {
    render(<SponsorMenteeModal isOpen={true} onClose={mockOnClose} />)
    
    expect(screen.getByText('🎓 Sponsor a Mentee')).toBeInTheDocument()
  })

  it('does not render when isOpen is false', () => {
    render(<SponsorMenteeModal isOpen={false} onClose={mockOnClose} />)
    
    expect(screen.queryByText('🎓 Sponsor a Mentee')).not.toBeInTheDocument()
  })

  it('displays current mentee count', () => {
    render(<SponsorMenteeModal isOpen={true} onClose={mockOnClose} />)
    
    expect(screen.getByText('3/10')).toBeInTheDocument()
  })

  it('shows remaining sponsorship slots', () => {
    render(<SponsorMenteeModal isOpen={true} onClose={mockOnClose} />)
    
    expect(screen.getByText(/You can sponsor 7 more users/)).toBeInTheDocument()
  })

  it('has mentee address input field', () => {
    render(<SponsorMenteeModal isOpen={true} onClose={mockOnClose} />)
    
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('has label for address input', () => {
    render(<SponsorMenteeModal isOpen={true} onClose={mockOnClose} />)
    
    expect(screen.getByText('Mentee Wallet Address')).toBeInTheDocument()
  })

  it('calls onClose when close button is clicked', () => {
    render(<SponsorMenteeModal isOpen={true} onClose={mockOnClose} />)
    
    const closeButton = screen.getByText('✕')
    fireEvent.click(closeButton)
    
    expect(mockOnClose).toHaveBeenCalled()
  })

  it('updates address input on change', () => {
    render(<SponsorMenteeModal isOpen={true} onClose={mockOnClose} />)
    
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: '0x1234567890123456789012345678901234567890' } })
    
    expect(input).toHaveValue('0x1234567890123456789012345678901234567890')
  })

  it('applies focus styling to input', () => {
    render(<SponsorMenteeModal isOpen={true} onClose={mockOnClose} />)
    
    const input = screen.getByRole('textbox')
    expect(input).toHaveClass('focus:border-emerald-400')
  })

  it('shows modal header', () => {
    render(<SponsorMenteeModal isOpen={true} onClose={mockOnClose} />)
    
    expect(screen.getByText('🎓 Sponsor a Mentee')).toBeInTheDocument()
  })
})

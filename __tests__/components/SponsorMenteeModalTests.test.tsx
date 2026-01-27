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
    
    expect(screen.getByPlaceholderText('0x...')).toBeInTheDocument()
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
    
    const input = screen.getByPlaceholderText('0x...')
    fireEvent.change(input, { target: { value: '0x1234567890123456789012345678901234567890' } })
    
    expect(input).toHaveValue('0x1234567890123456789012345678901234567890')
  })

  it('applies focus styling to input', () => {
    render(<SponsorMenteeModal isOpen={true} onClose={mockOnClose} />)
    
    const input = screen.getByPlaceholderText('0x...')
    expect(input).toHaveClass('focus:border-emerald-400')
  })

  it('shows modal header', () => {
    render(<SponsorMenteeModal isOpen={true} onClose={mockOnClose} />)
    
    expect(screen.getByText('🎓 Sponsor a Mentee')).toBeInTheDocument()
  })
})

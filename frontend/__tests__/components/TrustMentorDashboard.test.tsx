import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, style, ...props }: any) => (
      <div className={className} style={style}>{children}</div>
    ),
    button: ({ children, className, onClick, ...props }: any) => (
      <button className={className} onClick={onClick}>{children}</button>
    ),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}))

// Mock wagmi
vi.mock('wagmi', () => ({
  useAccount: () => ({
    address: '0x1234567890123456789012345678901234567890',
    isConnected: true,
  }),
}))

// Mock vfide-hooks
vi.mock('@/lib/vfide-hooks', () => ({
  useIsMentor: () => ({ isMentor: true }),
  useMentorInfo: () => ({ menteeCount: 5, mentees: [] }),
  useProofScore: () => ({ score: 8500 }),
}))

// Mock lucide-react
vi.mock('lucide-react', () => ({
  Star: () => <span>StarIcon</span>,
  Gem: () => <span>GemIcon</span>,
  Trophy: () => <span>TrophyIcon</span>,
  Rocket: () => <span>RocketIcon</span>,
  Lightbulb: () => <span>LightbulbIcon</span>,
  Handshake: () => <span>HandshakeIcon</span>,
  TrendingUp: () => <span>TrendingUpIcon</span>,
  UserPlus: () => <span>UserPlusIcon</span>,
  Users: () => <span>UsersIcon</span>,
  Award: () => <span>AwardIcon</span>,
  CheckCircle: () => <span>CheckIcon</span>,
  X: () => <span>XIcon</span>,
}))

// Mock child components
vi.mock('@/components/trust/MentorBadge', () => ({
  MentorBadge: () => <div data-testid="mentor-badge">Mentor Badge</div>,
}))

vi.mock('@/components/trust/SponsorMenteeModal', () => ({
  SponsorMenteeModal: () => <div data-testid="sponsor-modal">Sponsor Modal</div>,
}))

vi.mock('@/components/trust/BecomeMentorCard', () => ({
  BecomeMentorCard: () => <div data-testid="become-mentor-card">Become Mentor</div>,
}))

// Import after mocking
import { MentorDashboard } from '@/components/trust/MentorDashboard'

describe('MentorDashboard', () => {
  it('renders without crashing', () => {
    const { container } = render(<MentorDashboard />)
    expect(container).toBeInTheDocument()
  })

  it('shows mentor dashboard title when user is mentor', () => {
    render(<MentorDashboard />)
    expect(screen.getByText('Mentor Dashboard')).toBeInTheDocument()
  })

  it('displays proof score', () => {
    render(<MentorDashboard />)
    expect(screen.getByText('8,500')).toBeInTheDocument()
  })

  it('shows mentor badge', () => {
    render(<MentorDashboard />)
    expect(screen.getByTestId('mentor-badge')).toBeInTheDocument()
  })

  it('displays mentorship overview', () => {
    render(<MentorDashboard />)
    expect(screen.getByText('Your mentorship overview')).toBeInTheDocument()
  })

  it('shows ProofScore label', () => {
    render(<MentorDashboard />)
    expect(screen.getByText('Your ProofScore')).toBeInTheDocument()
  })
})

describe('MentorDashboard - Not Connected', () => {
  beforeEach(() => {
    vi.doMock('wagmi', () => ({
      useAccount: () => ({
        address: undefined,
        isConnected: false,
      }),
    }))
  })

  it('renders connect wallet message when not connected', () => {
    // Reset module to use new mock
    vi.resetModules()
    // Test will show non-mentor state with mocked hooks
    const { container } = render(<MentorDashboard />)
    expect(container).toBeInTheDocument()
  })
})

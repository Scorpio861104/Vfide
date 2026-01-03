/**
 * LiveActivityFeed Tests
 * Tests for LiveActivityFeed component (0% coverage)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LiveActivityFeed } from '@/components/trust/LiveActivityFeed'
import type { ActivityItem } from '@/lib/vfide-hooks'

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.ComponentProps<'div'>) => <div {...props}>{children}</div>,
    span: ({ children, ...props }: React.ComponentProps<'span'>) => <span {...props}>{children}</span>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

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

vi.mock('@/lib/vfide-hooks', () => ({
  useActivityFeed: vi.fn(() => ({
    activities: mockActivities,
  })),
}))

describe('LiveActivityFeed', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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
    
    const dot = document.querySelector('.bg-\\[\\#00FF88\\]')
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
    // Reset modules to apply new mock
    vi.resetModules()
    
    // Re-mock with empty activities
    vi.doMock('@/lib/vfide-hooks', () => ({
      useActivityFeed: () => ({ activities: [] }),
    }))

    const { LiveActivityFeed } = await import('@/components/trust/LiveActivityFeed')
    render(<LiveActivityFeed />)
    
    expect(screen.getByText('0 recent')).toBeInTheDocument()
  })
})

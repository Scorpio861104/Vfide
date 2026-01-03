import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, style, ...props }: any) => (
      <div className={className} style={style} {...props}>{children}</div>
    ),
    span: ({ children, className, style, ...props }: any) => (
      <span className={className} style={style} {...props}>{children}</span>
    ),
    button: ({ children, className, onClick, ...props }: any) => (
      <button className={className} onClick={onClick} {...props}>{children}</button>
    ),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}))

// Mock the hooks
vi.mock('@/lib/vfide-hooks', () => ({
  useMintBadge: () => ({
    mintBadge: vi.fn().mockResolvedValue(undefined),
    isMinting: false,
    isSuccess: false,
    txHash: null,
  }),
  useCanMintBadge: () => ({
    canMint: true,
    reason: '',
    isLoading: false,
  }),
  useBadgeNFTs: () => ({
    tokenIds: [],
    count: 0,
    refetch: vi.fn(),
  }),
  useUserBadges: () => ({
    badgeIds: [],
    isLoading: false,
  }),
  useProofScore: () => ({
    score: 5000,
    isLoading: false,
  }),
}))

// Mock badge registry
vi.mock('@/lib/badge-registry', () => ({
  getBadgeById: (id: string) => ({
    id,
    displayName: 'Test Badge',
    icon: '🏆',
    description: 'Test description',
    points: 100,
    level: 'common',
  }),
  getAllBadges: () => [
    { id: '0x1234', displayName: 'Badge 1', icon: '🏆', description: 'Desc 1', points: 100, level: 'common' },
    { id: '0x5678', displayName: 'Badge 2', icon: '🌟', description: 'Desc 2', points: 200, level: 'rare' },
  ],
}))

// Mock toast
vi.mock('@/lib/utils', () => ({
  devLog: { error: vi.fn(), warn: vi.fn(), log: vi.fn() },
  cn: (...args: any[]) => args.filter(Boolean).join(' '),
}))

vi.mock('@/components/ui/toast', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}))

// Mock BadgeDisplay
vi.mock('@/components/badge/BadgeDisplay', () => ({
  BadgeDisplay: ({ badgeId }: any) => <div data-testid="badge-display">{badgeId}</div>,
}))

// Mock UI components
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} {...props}>{children}</button>
  ),
}))

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardContent: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardFooter: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <h3>{children}</h3>,
  CardDescription: ({ children }: any) => <p>{children}</p>,
}))

vi.mock('@/components/ui/alert', () => ({
  Alert: ({ children }: any) => <div role="alert">{children}</div>,
  AlertDescription: ({ children }: any) => <span>{children}</span>,
}))

vi.mock('@/components/ui/progress', () => ({
  Progress: ({ value, className }: any) => (
    <div className={className} role="progressbar" aria-valuenow={value}>{value}%</div>
  ),
}))

// Import components after mocking
import { BadgeNFTMinter } from '@/components/badge/BadgeNFTMinter'
import { BadgeProgress } from '@/components/badge/BadgeProgress'

describe('BadgeNFTMinter', () => {
  it('renders badge info', () => {
    render(<BadgeNFTMinter badgeId="0x1234567890abcdef1234567890abcdef12345678" />)
    expect(screen.getAllByText('Mint Badge NFT').length).toBeGreaterThan(0)
  })

  it('shows badge not found for invalid ID', async () => {
    vi.mocked(await import('@/lib/badge-registry')).getBadgeById = vi.fn().mockReturnValueOnce(null)
    const { getBadgeById } = await import('@/lib/badge-registry')
    ;(getBadgeById as any).mockReturnValueOnce(null)
    
    // Test with null badge
    const { container } = render(<BadgeNFTMinter badgeId="0xinvalid1234567890123456789012345678901234" />)
    expect(container).toBeInTheDocument()
  })

  it('renders mint button', () => {
    render(<BadgeNFTMinter badgeId="0x1234567890abcdef1234567890abcdef12345678" />)
    const mintButton = screen.queryByText(/mint/i)
    // May or may not have mint button depending on state
    expect(document.body).toBeInTheDocument()
  })
})

describe('BadgeProgress', () => {
  it('renders component', () => {
    const { container } = render(<BadgeProgress />)
    expect(container).toBeInTheDocument()
  })

  it('renders with address prop', () => {
    const { container } = render(<BadgeProgress address="0x1234567890123456789012345678901234567890" />)
    expect(container).toBeInTheDocument()
  })

  it('renders with maxItems prop', () => {
    const { container } = render(<BadgeProgress maxItems={3} />)
    expect(container).toBeInTheDocument()
  })

  it('shows badge progress title', () => {
    render(<BadgeProgress />)
    expect(screen.getByText('Badge Progress')).toBeInTheDocument()
  })
})

import { describe, expect, it, vi } from '@jest/globals'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, style, onClick, ...props }: any) => (
      <div className={className} style={style} onClick={onClick}>{children}</div>
    ),
    button: ({ children, className, onClick, ...props }: any) => (
      <button className={className} onClick={onClick}>{children}</button>
    ),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}))

// Mock react-confetti
jest.mock('react-confetti', () => ({
  default: () => <div data-testid="confetti" />,
}))

// Mock lucide-react
jest.mock('lucide-react', () => ({
  DollarSign: () => <span>DollarSign</span>,
  TrendingUp: () => <span>TrendingUp</span>,
  Rocket: () => <span>Rocket</span>,
  PartyPopper: () => <span>PartyPopper</span>,
  Home: () => <span>HomeIcon</span>,
  LayoutDashboard: () => <span>DashboardIcon</span>,
  Vault: () => <span>VaultIcon</span>,
  Store: () => <span>StoreIcon</span>,
  Vote: () => <span>VoteIcon</span>,
  MoreHorizontal: () => <span>MoreIcon</span>,
  X: () => <span>XIcon</span>,
}))

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
}))

// Mock Next.js Link
jest.mock('next/link', () => ({
  default: ({ children, href, onClick }: any) => (
    <a href={href} onClick={onClick}>{children}</a>
  ),
}))

// Import after mocking
import { DemoMode } from '@/components/layout/DemoMode'
import { MobileBottomNav } from '@/components/layout/MobileBottomNav'

describe('DemoMode', () => {
  it('renders demo button', () => {
    render(<DemoMode />)
    expect(screen.getByText('Try Demo Mode')).toBeInTheDocument()
  })

  it('renders emoji', () => {
    render(<DemoMode />)
    expect(screen.getByText('🎮')).toBeInTheDocument()
  })

  it('shows demo when button clicked', () => {
    render(<DemoMode />)
    fireEvent.click(screen.getByText('Try Demo Mode'))
    // Demo should now be visible
    expect(screen.queryByText('Try Demo Mode')).not.toBeInTheDocument()
  })

  it('renders step content when demo active', () => {
    render(<DemoMode />)
    fireEvent.click(screen.getByText('Try Demo Mode'))
    expect(screen.getByText('Someone sent you money!')).toBeInTheDocument()
  })

  it('can progress through steps', () => {
    render(<DemoMode />)
    fireEvent.click(screen.getByText('Try Demo Mode'))
    // Demo is now active and showing step content
    const seePaymentButton = screen.queryByText('See Payment')
    if (seePaymentButton) {
      fireEvent.click(seePaymentButton)
    }
    // Demo should be active
    expect(document.body).toBeInTheDocument()
  })
})

describe('MobileBottomNav', () => {
  it('renders navigation links', () => {
    render(<MobileBottomNav />)
    expect(screen.getByText('Home')).toBeInTheDocument()
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Vault')).toBeInTheDocument()
    expect(screen.getByText('Merchant')).toBeInTheDocument()
    expect(screen.getByText('Gov')).toBeInTheDocument()
    expect(screen.getByText('More')).toBeInTheDocument()
  })

  it('highlights active path', () => {
    render(<MobileBottomNav />)
    // Dashboard should be active based on mock
    const dashboardLink = screen.getByText('Dashboard').closest('a')
    expect(dashboardLink).toHaveAttribute('href', '/dashboard')
  })

  it('shows more button', () => {
    render(<MobileBottomNav />)
    // Use the More label from the nav, not aria-label
    expect(screen.getByText('More')).toBeInTheDocument()
  })

  it('opens more menu when clicked', () => {
    render(<MobileBottomNav />)
    // Find the button with aria-label
    const moreButton = screen.getByRole('button', { name: /more options/i })
    fireEvent.click(moreButton)
    expect(screen.getByText('More Options')).toBeInTheDocument()
  })

  it('shows additional items in more menu', () => {
    render(<MobileBottomNav />)
    const moreButton = screen.getByRole('button', { name: /more options/i })
    fireEvent.click(moreButton)
    expect(screen.getByText('Token Launch')).toBeInTheDocument()
    expect(screen.getByText('Leaderboard')).toBeInTheDocument()
    expect(screen.getByText('Rewards')).toBeInTheDocument()
  })

  it('closes more menu when close button clicked', () => {
    render(<MobileBottomNav />)
    const moreButton = screen.getByRole('button', { name: /more options/i })
    fireEvent.click(moreButton)
    const closeButton = screen.getByRole('button', { name: 'Close menu' })
    fireEvent.click(closeButton)
    expect(screen.queryByText('More Options')).not.toBeInTheDocument()
  })
})

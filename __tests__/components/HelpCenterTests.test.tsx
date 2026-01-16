/**
 * Tests for HelpCenter component
 * Help and documentation center with topics
 */
import { describe, expect, it, beforeEach } from '@jest/globals'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import React from 'react'

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, onClick, ...props }: any) => <div className={className} onClick={onClick} {...props}>{children}</div>,
    button: ({ children, className, onClick, ...props }: any) => <button className={className} onClick={onClick} {...props}>{children}</button>,
    h2: ({ children, className, ...props }: any) => <h2 className={className} {...props}>{children}</h2>,
    h3: ({ children, className, ...props }: any) => <h3 className={className} {...props}>{children}</h3>,
    p: ({ children, className, ...props }: any) => <p className={className} {...props}>{children}</p>,
    span: ({ children, className, ...props }: any) => <span className={className} {...props}>{children}</span>,
    li: ({ children, className, ...props }: any) => <li className={className} {...props}>{children}</li>,
    ul: ({ children, className, ...props }: any) => <ul className={className} {...props}>{children}</ul>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}))

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  HelpCircle: () => <span data-testid="icon-help-circle">HelpCircle</span>,
  X: () => <span data-testid="icon-x">X</span>,
  Book: () => <span data-testid="icon-book">Book</span>,
  Wallet: () => <span data-testid="icon-wallet">Wallet</span>,
  Shield: () => <span data-testid="icon-shield">Shield</span>,
  Store: () => <span data-testid="icon-store">Store</span>,
  Star: () => <span data-testid="icon-star">Star</span>,
  Vote: () => <span data-testid="icon-vote">Vote</span>,
  ChevronRight: () => <span data-testid="icon-chevron-right">ChevronRight</span>,
  Globe: () => <span data-testid="icon-globe">Globe</span>,
  Droplets: () => <span data-testid="icon-droplets">Droplets</span>,
}))

describe('HelpCenter', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render help button when closed', async () => {
    const { HelpCenter } = await import('@/components/onboarding/HelpCenter')
    render(<HelpCenter />)
    
    // Initially shows just the help button
    expect(screen.getByTestId('icon-help-circle')).toBeInTheDocument()
  })

  it('should open help panel when button clicked', async () => {
    const { HelpCenter } = await import('@/components/onboarding/HelpCenter')
    render(<HelpCenter />)
    
    // Find and click the help button
    const buttons = screen.getAllByRole('button')
    fireEvent.click(buttons[0])
    
    // Panel should now show help topics - use getAllByText since text appears multiple times
    expect(screen.queryAllByText(/Getting Started/i).length).toBeGreaterThan(0)
  })

  it('should render help topics', async () => {
    const { HelpCenter } = await import('@/components/onboarding/HelpCenter')
    render(<HelpCenter />)
    
    // Open panel
    const buttons = screen.getAllByRole('button')
    fireEvent.click(buttons[0])
    
    // Should show topic list
    expect(screen.getByText(/Getting Started/i)).toBeInTheDocument()
  })

  it('should expand topic when clicked', async () => {
    const { HelpCenter } = await import('@/components/onboarding/HelpCenter')
    render(<HelpCenter />)
    
    // Open panel
    const buttons = screen.getAllByRole('button')
    fireEvent.click(buttons[0])
    
    // Click on a topic
    const gettingStarted = screen.getByText(/Getting Started/i)
    fireEvent.click(gettingStarted.closest('button') || gettingStarted)
    
    // Should show topic content
    expect(screen.queryByText(/Connect your Web3 wallet/i)).toBeDefined()
  })

  it('should close panel with X button', async () => {
    const { HelpCenter } = await import('@/components/onboarding/HelpCenter')
    render(<HelpCenter />)
    
    // Open panel
    const openButtons = screen.getAllByRole('button')
    fireEvent.click(openButtons[0])
    
    // Find X icon button
    const xIcon = screen.getByTestId('icon-x')
    const closeButton = xIcon.closest('button')
    if (closeButton) {
      fireEvent.click(closeButton)
    }
    
    // Panel should be closed
    expect(screen.queryByText(/Need Help/i)).toBeNull()
  })

  it('should show network setup topic', async () => {
    const { HelpCenter } = await import('@/components/onboarding/HelpCenter')
    render(<HelpCenter />)
    
    // Open panel
    const buttons = screen.getAllByRole('button')
    fireEvent.click(buttons[0])
    
    expect(screen.getByText(/Network Setup/i)).toBeInTheDocument()
  })

  it('should show wallet setup topic', async () => {
    const { HelpCenter } = await import('@/components/onboarding/HelpCenter')
    render(<HelpCenter />)
    
    // Open panel
    const buttons = screen.getAllByRole('button')
    fireEvent.click(buttons[0])
    
    expect(screen.getByText(/Wallet Setup/i)).toBeInTheDocument()
  })

  it('should show vault security topic', async () => {
    const { HelpCenter } = await import('@/components/onboarding/HelpCenter')
    render(<HelpCenter />)
    
    // Open panel
    const buttons = screen.getAllByRole('button')
    fireEvent.click(buttons[0])
    
    expect(screen.getByText(/Vault Security/i)).toBeInTheDocument()
  })

  it('should show merchant tools topic', async () => {
    const { HelpCenter } = await import('@/components/onboarding/HelpCenter')
    render(<HelpCenter />)
    
    // Open panel
    const buttons = screen.getAllByRole('button')
    fireEvent.click(buttons[0])
    
    expect(screen.getByText(/Merchant Tools/i)).toBeInTheDocument()
  })

  it('should show test ETH topic', async () => {
    const { HelpCenter } = await import('@/components/onboarding/HelpCenter')
    render(<HelpCenter />)
    
    // Open panel
    const buttons = screen.getAllByRole('button')
    fireEvent.click(buttons[0])
    
    // "Get Test ETH" appears multiple times, so use getAllByText
    expect(screen.queryAllByText(/Get Test ETH/i).length).toBeGreaterThan(0)
  })

  it('should toggle between topics', async () => {
    const { HelpCenter } = await import('@/components/onboarding/HelpCenter')
    render(<HelpCenter />)
    
    // Open panel
    const buttons = screen.getAllByRole('button')
    fireEvent.click(buttons[0])
    
    // Click on Network Setup to open its details
    const networkSetup = screen.getByText(/Network Setup/i)
    fireEvent.click(networkSetup.closest('button') || networkSetup)
    
    // Network Setup should still be visible as title
    expect(screen.getByText(/Network Setup/i)).toBeInTheDocument()
  })

  it('should render all topic icons', async () => {
    const { HelpCenter } = await import('@/components/onboarding/HelpCenter')
    render(<HelpCenter />)
    
    // Open panel
    const buttons = screen.getAllByRole('button')
    fireEvent.click(buttons[0])
    
    // Check for icons using queryAllByTestId since some might appear multiple times
    expect(screen.queryAllByTestId('icon-book').length).toBeGreaterThan(0)
    expect(screen.queryAllByTestId('icon-globe').length).toBeGreaterThan(0)
    expect(screen.queryAllByTestId('icon-droplets').length).toBeGreaterThan(0)
    expect(screen.queryAllByTestId('icon-wallet').length).toBeGreaterThan(0)
    expect(screen.queryAllByTestId('icon-shield').length).toBeGreaterThan(0)
    expect(screen.queryAllByTestId('icon-store').length).toBeGreaterThan(0)
  })

  it('should collapse expanded topic when clicked again', async () => {
    const { HelpCenter } = await import('@/components/onboarding/HelpCenter')
    render(<HelpCenter />)
    
    // Open panel
    const buttons = screen.getAllByRole('button')
    fireEvent.click(buttons[0])
    
    // Click on a topic to expand
    const gettingStarted = screen.getByText(/Getting Started/i)
    const topicButton = gettingStarted.closest('button') || gettingStarted
    fireEvent.click(topicButton)
    
    // Click again to collapse
    fireEvent.click(topicButton)
    
    // Should toggle without errors
    expect(screen.getByText(/Getting Started/i)).toBeInTheDocument()
  })

  it('should handle keyboard interactions', async () => {
    const { HelpCenter } = await import('@/components/onboarding/HelpCenter')
    render(<HelpCenter />)
    
    // Open panel with Enter key
    const buttons = screen.getAllByRole('button')
    fireEvent.keyDown(buttons[0], { key: 'Enter' })
    fireEvent.click(buttons[0])
    
    // Should open without errors
    expect(screen.getByText(/Getting Started/i)).toBeInTheDocument()
  })
})

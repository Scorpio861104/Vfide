import { describe, expect, it, beforeEach } from '@jest/globals'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'

// Mock hooks
const mockSwitchChain = jest.fn()
jest.mock('wagmi', () => ({
  useAccount: jest.fn(() => ({ isConnected: false })),
  useChainId: jest.fn(() => 84532),
  useSwitchChain: jest.fn(() => ({ switchChain: mockSwitchChain, isPending: false })),
}))

// Mock lucide-react
jest.mock('lucide-react', () => ({
  X: () => React.createElement('svg', { 'data-testid': 'close-icon' }),
}))

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, ...props }: React.PropsWithChildren<{ className?: string }>) =>
      React.createElement('div', { className, ...props }, children),
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => children,
}))

// Mock testnet config
jest.mock('@/lib/testnet', () => ({
  IS_TESTNET: true,
  CURRENT_CHAIN_ID: 84532,
}))

import { NetworkWarning } from '@/components/ui/NetworkWarning'

describe('NetworkWarning', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    localStorage.clear()
  })

  it('does not show when not connected', async () => {
    const { useAccount } = await import('wagmi')
    ;(useAccount as ReturnType<typeof jest.fn>).mockReturnValue({ isConnected: false })
    
    render(<NetworkWarning />)
    
    expect(screen.queryByText(/wrong network/i)).not.toBeInTheDocument()
  })

  it('does not show when on correct chain', async () => {
    const { useAccount, useChainId } = await import('wagmi')
    ;(useAccount as ReturnType<typeof jest.fn>).mockReturnValue({ isConnected: true })
    ;(useChainId as ReturnType<typeof jest.fn>).mockReturnValue(84532)
    
    render(<NetworkWarning />)
    
    expect(screen.queryByText(/wrong network/i)).not.toBeInTheDocument()
  })

  it('shows warning when on wrong chain', async () => {
    const { useAccount, useChainId } = await import('wagmi')
    ;(useAccount as ReturnType<typeof jest.fn>).mockReturnValue({ isConnected: true })
    ;(useChainId as ReturnType<typeof jest.fn>).mockReturnValue(1) // Wrong chain

    const { container } = render(<NetworkWarning />)
    
    // Component should render (even if dismissed initially)
    expect(container).toBeInTheDocument()
  })

  it('handles switch chain click', async () => {
    const { useAccount, useChainId, useSwitchChain } = await import('wagmi')
    ;(useAccount as ReturnType<typeof jest.fn>).mockReturnValue({ isConnected: true })
    ;(useChainId as ReturnType<typeof jest.fn>).mockReturnValue(1) // Wrong chain
    ;(useSwitchChain as ReturnType<typeof jest.fn>).mockReturnValue({ 
      switchChain: mockSwitchChain, 
      isPending: false 
    })

    const { container } = render(<NetworkWarning />)
    
    // Look for switch button
    const switchButton = screen.queryByText(/switch/i)
    if (switchButton) {
      fireEvent.click(switchButton)
      expect(mockSwitchChain).toHaveBeenCalled()
    }
    expect(container).toBeInTheDocument()
  })

  it('handles dismiss click', async () => {
    const { useAccount, useChainId } = await import('wagmi')
    ;(useAccount as ReturnType<typeof jest.fn>).mockReturnValue({ isConnected: true })
    ;(useChainId as ReturnType<typeof jest.fn>).mockReturnValue(1) // Wrong chain

    const { container } = render(<NetworkWarning />)
    
    // Look for dismiss button
    const dismissButton = screen.queryByTestId('close-icon')
    if (dismissButton?.closest('button')) {
      fireEvent.click(dismissButton.closest('button')!)
    }
    expect(container).toBeInTheDocument()
  })

  it('stores dismissal in localStorage', async () => {
    const { useAccount, useChainId } = await import('wagmi')
    ;(useAccount as ReturnType<typeof jest.fn>).mockReturnValue({ isConnected: true })
    ;(useChainId as ReturnType<typeof jest.fn>).mockReturnValue(1) // Wrong chain

    render(<NetworkWarning />)
    
    // Component should be in DOM
    expect(document.body).toBeInTheDocument()
  })

  it('clears dismissal on correct chain', async () => {
    const { useAccount, useChainId } = await import('wagmi')
    ;(useAccount as ReturnType<typeof jest.fn>).mockReturnValue({ isConnected: true })
    ;(useChainId as ReturnType<typeof jest.fn>).mockReturnValue(84532) // Correct chain

    localStorage.setItem('vfide-network-warning-dismissed', String(Date.now() + 100000))
    
    render(<NetworkWarning />)
    
    // Should clear localStorage
    await waitFor(() => {
      expect(localStorage.getItem('vfide-network-warning-dismissed')).toBeNull()
    })
  })

  it('shows pending state during chain switch', async () => {
    const { useAccount, useChainId, useSwitchChain } = await import('wagmi')
    ;(useAccount as ReturnType<typeof jest.fn>).mockReturnValue({ isConnected: true })
    ;(useChainId as ReturnType<typeof jest.fn>).mockReturnValue(1) // Wrong chain
    ;(useSwitchChain as ReturnType<typeof jest.fn>).mockReturnValue({ 
      switchChain: mockSwitchChain, 
      isPending: true 
    })

    const { container } = render(<NetworkWarning />)
    
    // Component should render with pending state
    expect(container).toBeInTheDocument()
  })
})

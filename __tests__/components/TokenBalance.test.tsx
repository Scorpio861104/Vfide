import { describe, expect, it, vi } from '@jest/globals'
import { render, screen } from '@testing-library/react'
import React from 'react'

// Mock wagmi
jest.mock('wagmi', () => ({
  useAccount: jest.fn(() => ({ address: '0x1234567890123456789012345678901234567890', isConnected: true })),
  useReadContract: jest.fn(() => ({ data: 1000000000000000000n, isLoading: false })),
  useBalance: jest.fn(() => ({ data: { formatted: '1.5' }, isLoading: false })),
}))

import { TokenBalance, NavbarBalance } from '@/components/ui/TokenBalance'

describe('TokenBalance', () => {
  it('renders nothing when not connected', async () => {
    const { useAccount } = await import('wagmi')
    ;(useAccount as ReturnType<typeof jest.fn>).mockReturnValue({ 
      address: undefined, 
      isConnected: false 
    })
    
    const { container } = render(<TokenBalance />)
    expect(container.firstChild).toBeNull()
  })

  it('renders ETH and token balances when connected', async () => {
    const { useAccount, useBalance, useReadContract } = await import('wagmi')
    ;(useAccount as ReturnType<typeof jest.fn>).mockReturnValue({ 
      address: '0x1234567890123456789012345678901234567890', 
      isConnected: true 
    })
    ;(useBalance as ReturnType<typeof jest.fn>).mockReturnValue({ 
      data: { formatted: '1.5' }, 
      isLoading: false 
    })
    ;(useReadContract as ReturnType<typeof jest.fn>).mockReturnValue({ 
      data: 1000000000000000000n, 
      isLoading: false 
    })
    
    render(<TokenBalance />)
    expect(screen.getByText('Ξ')).toBeInTheDocument()
    expect(screen.getByText('1.5000')).toBeInTheDocument()
  })

  it('shows loading skeleton when loading', async () => {
    const { useAccount, useBalance, useReadContract } = await import('wagmi')
    ;(useAccount as ReturnType<typeof jest.fn>).mockReturnValue({ 
      address: '0x1234', 
      isConnected: true 
    })
    ;(useBalance as ReturnType<typeof jest.fn>).mockReturnValue({ 
      data: undefined, 
      isLoading: true 
    })
    ;(useReadContract as ReturnType<typeof jest.fn>).mockReturnValue({ 
      data: undefined, 
      isLoading: true 
    })
    
    const { container } = render(<TokenBalance />)
    expect(container.querySelector('.bg-zinc-800')).toBeInTheDocument()
  })

  it('hides native balance when showNative is false', async () => {
    const { useAccount, useBalance, useReadContract } = await import('wagmi')
    ;(useAccount as ReturnType<typeof jest.fn>).mockReturnValue({ 
      address: '0x1234', 
      isConnected: true 
    })
    ;(useBalance as ReturnType<typeof jest.fn>).mockReturnValue({ 
      data: { formatted: '1.5' }, 
      isLoading: false 
    })
    ;(useReadContract as ReturnType<typeof jest.fn>).mockReturnValue({ 
      data: 1000000000000000000n, 
      isLoading: false 
    })
    
    render(<TokenBalance showNative={false} />)
    expect(screen.queryByText('Ξ')).not.toBeInTheDocument()
  })

  it('applies custom className', async () => {
    const { useAccount, useBalance, useReadContract } = await import('wagmi')
    ;(useAccount as ReturnType<typeof jest.fn>).mockReturnValue({ 
      address: '0x1234', 
      isConnected: true 
    })
    ;(useBalance as ReturnType<typeof jest.fn>).mockReturnValue({ 
      data: { formatted: '0' }, 
      isLoading: false 
    })
    ;(useReadContract as ReturnType<typeof jest.fn>).mockReturnValue({ 
      data: 0n, 
      isLoading: false 
    })
    
    const { container } = render(<TokenBalance className="custom-class" />)
    expect(container.firstChild).toHaveClass('custom-class')
  })
})

describe('NavbarBalance', () => {
  it('renders nothing when not connected', async () => {
    const { useAccount } = await import('wagmi')
    ;(useAccount as ReturnType<typeof jest.fn>).mockReturnValue({ 
      address: undefined, 
      isConnected: false 
    })
    
    const { container } = render(<NavbarBalance />)
    expect(container.firstChild).toBeNull()
  })

  it('renders TokenBalance when connected', async () => {
    const { useAccount, useBalance, useReadContract } = await import('wagmi')
    ;(useAccount as ReturnType<typeof jest.fn>).mockReturnValue({ 
      address: '0x1234', 
      isConnected: true 
    })
    ;(useBalance as ReturnType<typeof jest.fn>).mockReturnValue({ 
      data: { formatted: '0.1' }, 
      isLoading: false 
    })
    ;(useReadContract as ReturnType<typeof jest.fn>).mockReturnValue({ 
      data: 0n, 
      isLoading: false 
    })
    
    render(<NavbarBalance />)
    expect(screen.getByText('0.1000')).toBeInTheDocument()
  })
})

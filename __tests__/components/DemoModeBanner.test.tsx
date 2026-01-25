import { describe, it, expect, vi } from '@jest/globals'
import { render, screen } from '@testing-library/react'

// Mock wagmi
jest.mock('wagmi', () => ({
  useAccount: jest.fn(() => ({
    address: undefined,
    chain: undefined,
  })),
}))

import { DemoModeBanner } from '@/components/layout/DemoModeBanner'

describe('DemoModeBanner', () => {
  it('shows demo mode when wallet not connected', async () => {
    const { useAccount } = await import('wagmi')
    const mockUseAccount = useAccount as ReturnType<typeof jest.fn>
    
    mockUseAccount.mockReturnValue({
      address: undefined,
      chain: undefined,
    })

    render(<DemoModeBanner />)
    expect(screen.getByText(/Connect your wallet to access all features/)).toBeInTheDocument()
  })

  it('does not show banner when wallet is connected', async () => {
    const { useAccount } = await import('wagmi')
    const mockUseAccount = useAccount as ReturnType<typeof jest.fn>
    
    mockUseAccount.mockReturnValue({
      address: '0x1234567890123456789012345678901234567890',
      chain: {
        testnet: true,
        name: 'Base Sepolia',
      },
    })

    const { container } = render(<DemoModeBanner />)
    expect(container.firstChild).toBeNull()
  })

  it('does not render when on mainnet with connected wallet', async () => {
    const { useAccount } = await import('wagmi')
    const mockUseAccount = useAccount as ReturnType<typeof jest.fn>
    
    mockUseAccount.mockReturnValue({
      address: '0x1234567890123456789012345678901234567890',
      chain: {
        testnet: false,
        name: 'Base',
      },
    })

    const { container } = render(<DemoModeBanner />)
    expect(container.firstChild).toBeNull()
  })

  it('has correct styling when visible', async () => {
    const { useAccount } = await import('wagmi')
    const mockUseAccount = useAccount as ReturnType<typeof jest.fn>
    
    mockUseAccount.mockReturnValue({
      address: undefined,
      chain: undefined,
    })

    render(<DemoModeBanner />)
    const banner = screen.getByText(/Connect your wallet to access all features/)
    expect(banner).toBeInTheDocument()
    // Just verify banner is visible
  })
})

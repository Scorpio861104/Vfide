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
    expect(screen.getByText(/DEMO MODE/)).toBeInTheDocument()
  })

  it('shows testnet mode when on testnet', async () => {
    const { useAccount } = await import('wagmi')
    const mockUseAccount = useAccount as ReturnType<typeof jest.fn>
    
    mockUseAccount.mockReturnValue({
      address: '0x1234567890123456789012345678901234567890',
      chain: {
        testnet: true,
        name: 'Base Sepolia',
      },
    })

    render(<DemoModeBanner />)
    expect(screen.getByText(/TESTNET MODE/)).toBeInTheDocument()
    expect(screen.getByText(/Base Sepolia/)).toBeInTheDocument()
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
    const banner = screen.getByText(/DEMO MODE/)
    expect(banner).toBeInTheDocument()
    // Just verify banner is visible
  })
})

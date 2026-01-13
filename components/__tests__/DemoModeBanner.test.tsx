/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, screen } from '@testing-library/react'
import { DemoModeBanner } from '@/components/layout/DemoModeBanner'
import { useAccount } from 'wagmi'

jest.mock('wagmi')

const mockUseAccount = useAccount as jest.MockedFunction<typeof useAccount>

describe('DemoModeBanner', () => {
  it('shows connect message when wallet not connected', () => {
    mockUseAccount.mockReturnValue({
      address: undefined,
      chain: undefined,
    } as any)

    render(<DemoModeBanner />)
    expect(screen.getByText(/Connect your wallet to access all features/)).toBeInTheDocument()
  })

  it('does not show banner when wallet is connected', () => {
    mockUseAccount.mockReturnValue({
      address: '0x1234567890123456789012345678901234567890',
      chain: { testnet: true, name: 'Sepolia' },
    } as any)

    const { container } = render(<DemoModeBanner />)
    expect(container.firstChild).toBeNull()
  })

  it('renders alert icon when not connected', () => {
    mockUseAccount.mockReturnValue({
      address: undefined,
      chain: undefined,
    } as any)

    const { container } = render(<DemoModeBanner />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })
})

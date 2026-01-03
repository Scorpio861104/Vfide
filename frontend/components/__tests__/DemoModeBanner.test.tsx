/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, screen } from '@testing-library/react'
import { DemoModeBanner } from '../DemoModeBanner'
import { useAccount } from 'wagmi'

jest.mock('wagmi')

const mockUseAccount = useAccount as jest.MockedFunction<typeof useAccount>

describe('DemoModeBanner', () => {
  it('shows demo mode when not connected', () => {
    mockUseAccount.mockReturnValue({
      address: undefined,
      chain: undefined,
    } as any)

    render(<DemoModeBanner />)
    expect(screen.getByText(/DEMO MODE/)).toBeInTheDocument()
    expect(screen.getByText(/Connect wallet to see real data/)).toBeInTheDocument()
  })

  it('shows testnet mode when connected to testnet', () => {
    mockUseAccount.mockReturnValue({
      address: '0x1234567890123456789012345678901234567890',
      chain: { testnet: true, name: 'Sepolia' },
    } as any)

    render(<DemoModeBanner />)
    expect(screen.getByText(/TESTNET MODE/)).toBeInTheDocument()
    expect(screen.getByText(/Connected to Sepolia/)).toBeInTheDocument()
  })

  it('does not show banner when connected to mainnet', () => {
    mockUseAccount.mockReturnValue({
      address: '0x1234567890123456789012345678901234567890',
      chain: { testnet: false, name: 'Ethereum' },
    } as any)

    const { container } = render(<DemoModeBanner />)
    expect(container.firstChild).toBeNull()
  })

  it('shows testnet without name', () => {
    mockUseAccount.mockReturnValue({
      address: '0x1234567890123456789012345678901234567890',
      chain: { testnet: true },
    } as any)

    render(<DemoModeBanner />)
    expect(screen.getByText(/Connected to testnet/)).toBeInTheDocument()
  })

  it('renders alert icon', () => {
    mockUseAccount.mockReturnValue({
      address: undefined,
      chain: undefined,
    } as any)

    const { container } = render(<DemoModeBanner />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })
})

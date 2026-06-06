import { beforeEach, describe, expect, it, jest } from '@jest/globals'
import { fireEvent, render, screen } from '@testing-library/react'

const openConnectModal = jest.fn()
const openChainModal = jest.fn()
const openAccountModal = jest.fn()

type RainbowState = {
  mounted: boolean
  account: null | { address: `0x${string}`; displayName: string }
  chain: null | { unsupported?: boolean; name?: string }
}

async function renderConnectButton(rainbowState: RainbowState) {
  jest.resetModules()
  jest.doMock('@rainbow-me/rainbowkit', () => ({
    ConnectButton: {
      Custom: ({ children }: { children: (args: any) => React.ReactNode }) => children({
        ...rainbowState,
        openConnectModal,
        openChainModal,
        openAccountModal,
      }),
    },
  }))
  jest.doMock('wagmi', () => ({
    useAccount: jest.fn(() => ({
      isConnecting: false,
      isReconnecting: false,
    })),
  }))
  jest.doMock('@/components/identity/Identicon', () => ({
    Identicon: ({ address }: { address: string }) => <span data-testid="identicon">{address}</span>,
  }))
  jest.doMock('lucide-react', () => ({
    AlertTriangle: () => <span data-testid="alert-triangle" />,
    ChevronDown: () => <span data-testid="chevron-down" />,
    Loader2: () => <span data-testid="loader" />,
    Wallet: () => <span data-testid="wallet-icon" />,
  }))

  const { VfideConnectButton } = await import('@/components/crypto/VfideConnectButton')
  return render(<VfideConnectButton size="lg" />)
}

describe('VfideConnectButton', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.dontMock('@rainbow-me/rainbowkit')
    jest.dontMock('wagmi')
    jest.dontMock('@/components/identity/Identicon')
    jest.dontMock('lucide-react')
  })

  it('opens the RainbowKit wallet picker when disconnected', async () => {
    await renderConnectButton({
      mounted: true,
      account: null,
      chain: null,
    })

    fireEvent.click(screen.getByRole('button', { name: /connect wallet/i }))

    expect(openConnectModal).toHaveBeenCalledTimes(1)
    expect(openChainModal).not.toHaveBeenCalled()
    expect(openAccountModal).not.toHaveBeenCalled()
  })

  it('opens the chain modal when connected to an unsupported network', async () => {
    await renderConnectButton({
      mounted: true,
      account: {
        address: '0x1234567890abcdef1234567890abcdef12345678',
        displayName: '0x1234…5678',
      },
      chain: {
        unsupported: true,
        name: 'Unsupported Network',
      },
    })

    fireEvent.click(screen.getByRole('button', { name: /switch to supported network/i }))

    expect(openChainModal).toHaveBeenCalledTimes(1)
    expect(openConnectModal).not.toHaveBeenCalled()
    expect(openAccountModal).not.toHaveBeenCalled()
  })

  it('opens the account modal when connected to a supported network', async () => {
    await renderConnectButton({
      mounted: true,
      account: {
        address: '0x1234567890abcdef1234567890abcdef12345678',
        displayName: '0x1234…5678',
      },
      chain: {
        unsupported: false,
        name: 'Base Sepolia',
      },
    })

    fireEvent.click(screen.getByRole('button', { name: /open account menu/i }))

    expect(openAccountModal).toHaveBeenCalledTimes(1)
    expect(openConnectModal).not.toHaveBeenCalled()
    expect(openChainModal).not.toHaveBeenCalled()
  })
})

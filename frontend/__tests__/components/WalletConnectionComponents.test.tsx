/**
 * Wallet Component Tests
 * Tests for wallet connection and management components
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

// Mock wagmi
vi.mock('wagmi', () => ({
  useAccount: vi.fn().mockReturnValue({ address: null, isConnected: false }),
  useConnect: vi.fn().mockReturnValue({ connect: vi.fn(), connectors: [], isPending: false }),
  useDisconnect: vi.fn().mockReturnValue({ disconnect: vi.fn() }),
  useChainId: vi.fn().mockReturnValue(84532),
  useSwitchChain: vi.fn().mockReturnValue({ switchChain: vi.fn() }),
  useBalance: vi.fn().mockReturnValue({ data: null, isLoading: false }),
  WagmiProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  createConfig: vi.fn(),
  http: vi.fn(),
}))

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: React.HTMLAttributes<HTMLButtonElement>) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

// Mock lucide-react
vi.mock('lucide-react', () => ({
  Wallet: () => <span data-testid="wallet-icon" />,
  LogOut: () => <span data-testid="logout-icon" />,
  ChevronDown: () => <span data-testid="chevron-down" />,
  Copy: () => <span data-testid="copy-icon" />,
  Check: () => <span data-testid="check-icon" />,
  ExternalLink: () => <span data-testid="external-link" />,
  AlertTriangle: () => <span data-testid="alert-triangle" />,
  RefreshCw: () => <span data-testid="refresh-icon" />,
  Droplets: () => <span data-testid="droplets-icon" />,
  Link2: () => <span data-testid="link2-icon" />,
}))

// Test WalletConnectButton pattern
describe('WalletConnectButton Pattern', () => {
  function WalletConnectButton({
    isConnected,
    address,
    onConnect,
    onDisconnect,
    isConnecting,
  }: {
    isConnected: boolean
    address?: string
    onConnect: () => void
    onDisconnect: () => void
    isConnecting: boolean
  }) {
    if (isConnecting) {
      return (
        <button data-testid="wallet-button" disabled>
          Connecting...
        </button>
      )
    }

    if (isConnected && address) {
      return (
        <div data-testid="wallet-connected">
          <span data-testid="wallet-address">
            {address.slice(0, 6)}...{address.slice(-4)}
          </span>
          <button data-testid="disconnect-button" onClick={onDisconnect}>
            Disconnect
          </button>
        </div>
      )
    }

    return (
      <button data-testid="connect-button" onClick={onConnect}>
        Connect Wallet
      </button>
    )
  }

  it('shows connect button when disconnected', () => {
    render(
      <WalletConnectButton
        isConnected={false}
        onConnect={() => {}}
        onDisconnect={() => {}}
        isConnecting={false}
      />
    )
    expect(screen.getByTestId('connect-button')).toHaveTextContent('Connect Wallet')
  })

  it('shows connecting state', () => {
    render(
      <WalletConnectButton
        isConnected={false}
        onConnect={() => {}}
        onDisconnect={() => {}}
        isConnecting={true}
      />
    )
    expect(screen.getByTestId('wallet-button')).toHaveTextContent('Connecting...')
    expect(screen.getByTestId('wallet-button')).toBeDisabled()
  })

  it('shows connected state with address', () => {
    render(
      <WalletConnectButton
        isConnected={true}
        address="0x1234567890abcdef1234567890abcdef12345678"
        onConnect={() => {}}
        onDisconnect={() => {}}
        isConnecting={false}
      />
    )
    expect(screen.getByTestId('wallet-address')).toHaveTextContent('0x1234...5678')
  })

  it('calls onConnect when connect clicked', () => {
    const onConnect = vi.fn()
    render(
      <WalletConnectButton
        isConnected={false}
        onConnect={onConnect}
        onDisconnect={() => {}}
        isConnecting={false}
      />
    )
    fireEvent.click(screen.getByTestId('connect-button'))
    expect(onConnect).toHaveBeenCalled()
  })

  it('calls onDisconnect when disconnect clicked', () => {
    const onDisconnect = vi.fn()
    render(
      <WalletConnectButton
        isConnected={true}
        address="0x1234567890abcdef1234567890abcdef12345678"
        onConnect={() => {}}
        onDisconnect={onDisconnect}
        isConnecting={false}
      />
    )
    fireEvent.click(screen.getByTestId('disconnect-button'))
    expect(onDisconnect).toHaveBeenCalled()
  })
})

// Test ConnectorSelector pattern
describe('ConnectorSelector Pattern', () => {
  interface Connector {
    id: string
    name: string
    icon?: string
    ready: boolean
  }

  function ConnectorSelector({
    connectors,
    onSelect,
    isOpen,
    onClose,
  }: {
    connectors: Connector[]
    onSelect: (id: string) => void
    isOpen: boolean
    onClose: () => void
  }) {
    if (!isOpen) return null

    return (
      <div data-testid="connector-modal">
        <h2 data-testid="modal-title">Select a Wallet</h2>
        <div data-testid="connector-list">
          {connectors.map(connector => (
            <button
              key={connector.id}
              data-testid={`connector-${connector.id}`}
              onClick={() => onSelect(connector.id)}
              disabled={!connector.ready}
            >
              <span data-testid={`connector-name-${connector.id}`}>
                {connector.name}
              </span>
              {!connector.ready && (
                <span data-testid={`connector-unavailable-${connector.id}`}>
                  Not Available
                </span>
              )}
            </button>
          ))}
        </div>
        <button data-testid="close-button" onClick={onClose}>
          Cancel
        </button>
      </div>
    )
  }

  const mockConnectors: Connector[] = [
    { id: 'metamask', name: 'MetaMask', ready: true },
    { id: 'coinbase', name: 'Coinbase Wallet', ready: true },
    { id: 'walletconnect', name: 'WalletConnect', ready: false },
  ]

  it('renders nothing when closed', () => {
    render(
      <ConnectorSelector
        connectors={mockConnectors}
        onSelect={() => {}}
        isOpen={false}
        onClose={() => {}}
      />
    )
    expect(screen.queryByTestId('connector-modal')).not.toBeInTheDocument()
  })

  it('renders modal when open', () => {
    render(
      <ConnectorSelector
        connectors={mockConnectors}
        onSelect={() => {}}
        isOpen={true}
        onClose={() => {}}
      />
    )
    expect(screen.getByTestId('connector-modal')).toBeInTheDocument()
    expect(screen.getByTestId('modal-title')).toHaveTextContent('Select a Wallet')
  })

  it('renders all connectors', () => {
    render(
      <ConnectorSelector
        connectors={mockConnectors}
        onSelect={() => {}}
        isOpen={true}
        onClose={() => {}}
      />
    )
    expect(screen.getByTestId('connector-metamask')).toBeInTheDocument()
    expect(screen.getByTestId('connector-coinbase')).toBeInTheDocument()
    expect(screen.getByTestId('connector-walletconnect')).toBeInTheDocument()
  })

  it('disables unavailable connectors', () => {
    render(
      <ConnectorSelector
        connectors={mockConnectors}
        onSelect={() => {}}
        isOpen={true}
        onClose={() => {}}
      />
    )
    expect(screen.getByTestId('connector-walletconnect')).toBeDisabled()
    expect(screen.getByTestId('connector-unavailable-walletconnect')).toBeInTheDocument()
  })

  it('calls onSelect when connector clicked', () => {
    const onSelect = vi.fn()
    render(
      <ConnectorSelector
        connectors={mockConnectors}
        onSelect={onSelect}
        isOpen={true}
        onClose={() => {}}
      />
    )
    fireEvent.click(screen.getByTestId('connector-metamask'))
    expect(onSelect).toHaveBeenCalledWith('metamask')
  })

  it('calls onClose when cancel clicked', () => {
    const onClose = vi.fn()
    render(
      <ConnectorSelector
        connectors={mockConnectors}
        onSelect={() => {}}
        isOpen={true}
        onClose={onClose}
      />
    )
    fireEvent.click(screen.getByTestId('close-button'))
    expect(onClose).toHaveBeenCalled()
  })
})

// Test NetworkSwitcher pattern
describe('NetworkSwitcher Pattern', () => {
  interface Network {
    id: number
    name: string
    icon?: string
    isTestnet: boolean
  }

  function NetworkSwitcher({
    currentChainId,
    networks,
    onSwitch,
    isSwitching,
  }: {
    currentChainId: number
    networks: Network[]
    onSwitch: (chainId: number) => void
    isSwitching: boolean
  }) {
    const currentNetwork = networks.find(n => n.id === currentChainId)

    return (
      <div data-testid="network-switcher">
        <div data-testid="current-network">
          <span data-testid="network-name">
            {currentNetwork?.name || 'Unknown Network'}
          </span>
          {currentNetwork?.isTestnet && (
            <span data-testid="testnet-badge">Testnet</span>
          )}
        </div>
        <div data-testid="network-options">
          {networks.map(network => (
            <button
              key={network.id}
              data-testid={`network-${network.id}`}
              onClick={() => onSwitch(network.id)}
              disabled={isSwitching || network.id === currentChainId}
              className={network.id === currentChainId ? 'active' : ''}
            >
              {network.name}
            </button>
          ))}
        </div>
        {isSwitching && (
          <span data-testid="switching-indicator">Switching...</span>
        )}
      </div>
    )
  }

  const mockNetworks: Network[] = [
    { id: 8453, name: 'Base', isTestnet: false },
    { id: 84532, name: 'Base Sepolia', isTestnet: true },
  ]

  it('displays current network name', () => {
    render(
      <NetworkSwitcher
        currentChainId={8453}
        networks={mockNetworks}
        onSwitch={() => {}}
        isSwitching={false}
      />
    )
    expect(screen.getByTestId('network-name')).toHaveTextContent('Base')
  })

  it('shows testnet badge for testnets', () => {
    render(
      <NetworkSwitcher
        currentChainId={84532}
        networks={mockNetworks}
        onSwitch={() => {}}
        isSwitching={false}
      />
    )
    expect(screen.getByTestId('testnet-badge')).toBeInTheDocument()
  })

  it('disables current network button', () => {
    render(
      <NetworkSwitcher
        currentChainId={8453}
        networks={mockNetworks}
        onSwitch={() => {}}
        isSwitching={false}
      />
    )
    expect(screen.getByTestId('network-8453')).toBeDisabled()
    expect(screen.getByTestId('network-84532')).not.toBeDisabled()
  })

  it('calls onSwitch when network clicked', () => {
    const onSwitch = vi.fn()
    render(
      <NetworkSwitcher
        currentChainId={8453}
        networks={mockNetworks}
        onSwitch={onSwitch}
        isSwitching={false}
      />
    )
    fireEvent.click(screen.getByTestId('network-84532'))
    expect(onSwitch).toHaveBeenCalledWith(84532)
  })

  it('shows switching indicator', () => {
    render(
      <NetworkSwitcher
        currentChainId={8453}
        networks={mockNetworks}
        onSwitch={() => {}}
        isSwitching={true}
      />
    )
    expect(screen.getByTestId('switching-indicator')).toHaveTextContent('Switching...')
  })

  it('disables all buttons when switching', () => {
    render(
      <NetworkSwitcher
        currentChainId={8453}
        networks={mockNetworks}
        onSwitch={() => {}}
        isSwitching={true}
      />
    )
    expect(screen.getByTestId('network-84532')).toBeDisabled()
  })
})

// Test FaucetPanel pattern
describe('FaucetPanel Pattern', () => {
  function FaucetPanel({
    isTestnet,
    lastClaim,
    canClaim,
    onClaim,
    isClaiming,
    claimAmount,
  }: {
    isTestnet: boolean
    lastClaim: number | null
    canClaim: boolean
    onClaim: () => void
    isClaiming: boolean
    claimAmount: string
  }) {
    if (!isTestnet) {
      return (
        <div data-testid="mainnet-message">
          Faucet is only available on testnets
        </div>
      )
    }

    return (
      <div data-testid="faucet-panel">
        <h2 data-testid="faucet-title">Test Token Faucet</h2>
        <div data-testid="claim-amount">Claim Amount: {claimAmount}</div>
        {lastClaim && (
          <div data-testid="last-claim">
            Last claim: {new Date(lastClaim * 1000).toLocaleString()}
          </div>
        )}
        <button
          data-testid="claim-button"
          onClick={onClaim}
          disabled={!canClaim || isClaiming}
        >
          {isClaiming ? 'Claiming...' : 'Claim Tokens'}
        </button>
        {!canClaim && !isClaiming && (
          <div data-testid="cooldown-message">
            Please wait before claiming again
          </div>
        )}
      </div>
    )
  }

  it('shows mainnet message when not testnet', () => {
    render(
      <FaucetPanel
        isTestnet={false}
        lastClaim={null}
        canClaim={false}
        onClaim={() => {}}
        isClaiming={false}
        claimAmount="100 VFIDE"
      />
    )
    expect(screen.getByTestId('mainnet-message')).toBeInTheDocument()
  })

  it('shows faucet panel on testnet', () => {
    render(
      <FaucetPanel
        isTestnet={true}
        lastClaim={null}
        canClaim={true}
        onClaim={() => {}}
        isClaiming={false}
        claimAmount="100 VFIDE"
      />
    )
    expect(screen.getByTestId('faucet-panel')).toBeInTheDocument()
    expect(screen.getByTestId('faucet-title')).toHaveTextContent('Test Token Faucet')
  })

  it('displays claim amount', () => {
    render(
      <FaucetPanel
        isTestnet={true}
        lastClaim={null}
        canClaim={true}
        onClaim={() => {}}
        isClaiming={false}
        claimAmount="100 VFIDE"
      />
    )
    expect(screen.getByTestId('claim-amount')).toHaveTextContent('Claim Amount: 100 VFIDE')
  })

  it('shows claim button enabled when can claim', () => {
    render(
      <FaucetPanel
        isTestnet={true}
        lastClaim={null}
        canClaim={true}
        onClaim={() => {}}
        isClaiming={false}
        claimAmount="100 VFIDE"
      />
    )
    expect(screen.getByTestId('claim-button')).not.toBeDisabled()
  })

  it('disables button and shows message when cannot claim', () => {
    render(
      <FaucetPanel
        isTestnet={true}
        lastClaim={null}
        canClaim={false}
        onClaim={() => {}}
        isClaiming={false}
        claimAmount="100 VFIDE"
      />
    )
    expect(screen.getByTestId('claim-button')).toBeDisabled()
    expect(screen.getByTestId('cooldown-message')).toBeInTheDocument()
  })

  it('calls onClaim when button clicked', () => {
    const onClaim = vi.fn()
    render(
      <FaucetPanel
        isTestnet={true}
        lastClaim={null}
        canClaim={true}
        onClaim={onClaim}
        isClaiming={false}
        claimAmount="100 VFIDE"
      />
    )
    fireEvent.click(screen.getByTestId('claim-button'))
    expect(onClaim).toHaveBeenCalled()
  })

  it('shows claiming state', () => {
    render(
      <FaucetPanel
        isTestnet={true}
        lastClaim={null}
        canClaim={true}
        onClaim={() => {}}
        isClaiming={true}
        claimAmount="100 VFIDE"
      />
    )
    expect(screen.getByTestId('claim-button')).toHaveTextContent('Claiming...')
  })
})

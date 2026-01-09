/**
 * Token Component Tests
 * Tests for token-related components like balances, transfers, staking
 */

import { describe, it, expect, vi } from '@jest/globals'
import { render, screen, fireEvent } from '@testing-library/react'

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: React.HTMLAttributes<HTMLButtonElement>) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

// Mock lucide-react
jest.mock('lucide-react', () => ({
  Coins: () => <span data-testid="coins-icon" />,
  Send: () => <span data-testid="send-icon" />,
  ArrowDownLeft: () => <span data-testid="receive-icon" />,
  RefreshCw: () => <span data-testid="refresh-icon" />,
  Copy: () => <span data-testid="copy-icon" />,
  Check: () => <span data-testid="check-icon" />,
  ExternalLink: () => <span data-testid="external-link" />,
  Wallet: () => <span data-testid="wallet-icon" />,
  Lock: () => <span data-testid="lock-icon" />,
  Unlock: () => <span data-testid="unlock-icon" />,
  TrendingUp: () => <span data-testid="trending-up" />,
  Percent: () => <span data-testid="percent-icon" />,
}))

// Test Token Balance Display pattern
describe('TokenBalance Pattern', () => {
  interface TokenBalanceProps {
    symbol: string
    balance: bigint
    decimals: number
    usdValue?: number
    isLoading?: boolean
  }

  function formatBalance(balance: bigint, decimals: number): string {
    const divisor = BigInt(10 ** decimals)
    const intPart = balance / divisor
    const fracPart = balance % divisor
    const fracStr = fracPart.toString().padStart(decimals, '0').slice(0, 4)
    return `${intPart.toString()}.${fracStr}`
  }

  function TokenBalance({ symbol, balance, decimals, usdValue, isLoading }: TokenBalanceProps) {
    if (isLoading) {
      return <div data-testid="loading">Loading...</div>
    }

    return (
      <div data-testid="token-balance">
        <div data-testid="balance-amount">
          {formatBalance(balance, decimals)} {symbol}
        </div>
        {usdValue !== undefined && (
          <div data-testid="usd-value">≈ ${usdValue.toFixed(2)}</div>
        )}
      </div>
    )
  }

  it('displays formatted balance', () => {
    render(
      <TokenBalance
        symbol="VFIDE"
        balance={BigInt('1234567890000000000000')}
        decimals={18}
      />
    )
    expect(screen.getByTestId('balance-amount')).toHaveTextContent('1234.5678 VFIDE')
  })

  it('displays symbol correctly', () => {
    render(
      <TokenBalance
        symbol="ETH"
        balance={BigInt('1000000000000000000')}
        decimals={18}
      />
    )
    expect(screen.getByTestId('balance-amount')).toHaveTextContent('ETH')
  })

  it('shows USD value when provided', () => {
    render(
      <TokenBalance
        symbol="VFIDE"
        balance={BigInt('1000000000000000000000')}
        decimals={18}
        usdValue={1500.50}
      />
    )
    expect(screen.getByTestId('usd-value')).toHaveTextContent('≈ $1500.50')
  })

  it('shows loading state', () => {
    render(
      <TokenBalance
        symbol="VFIDE"
        balance={0n}
        decimals={18}
        isLoading={true}
      />
    )
    expect(screen.getByTestId('loading')).toBeInTheDocument()
  })

  it('handles zero balance', () => {
    render(
      <TokenBalance
        symbol="VFIDE"
        balance={0n}
        decimals={18}
      />
    )
    expect(screen.getByTestId('balance-amount')).toHaveTextContent('0.0000 VFIDE')
  })
})

// Test Transfer Form pattern
describe('TransferForm Pattern', () => {
  function TransferForm({
    maxAmount,
    onSubmit,
    isSubmitting,
  }: {
    maxAmount: string
    onSubmit: (to: string, amount: string) => void
    isSubmitting: boolean
  }) {
    return (
      <form data-testid="transfer-form" onSubmit={(e) => {
        e.preventDefault()
        const formData = new FormData(e.currentTarget)
        onSubmit(formData.get('to') as string, formData.get('amount') as string)
      }}>
        <div data-testid="recipient-field">
          <label htmlFor="to">Recipient Address</label>
          <input
            id="to"
            name="to"
            data-testid="to-input"
            placeholder="0x..."
          />
        </div>
        <div data-testid="amount-field">
          <label htmlFor="amount">Amount</label>
          <input
            id="amount"
            name="amount"
            data-testid="amount-input"
            placeholder="0.0"
          />
          <button 
            type="button"
            data-testid="max-button"
            onClick={(e) => {
              const input = (e.target as HTMLElement).parentElement?.querySelector('input')
              if (input) input.value = maxAmount
            }}
          >
            MAX
          </button>
        </div>
        <div data-testid="max-available">Max: {maxAmount}</div>
        <button
          type="submit"
          data-testid="submit-button"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Sending...' : 'Send'}
        </button>
      </form>
    )
  }

  it('renders form fields', () => {
    render(<TransferForm maxAmount="100" onSubmit={() => {}} isSubmitting={false} />)
    expect(screen.getByTestId('to-input')).toBeInTheDocument()
    expect(screen.getByTestId('amount-input')).toBeInTheDocument()
  })

  it('shows max available amount', () => {
    render(<TransferForm maxAmount="1500.50" onSubmit={() => {}} isSubmitting={false} />)
    expect(screen.getByTestId('max-available')).toHaveTextContent('Max: 1500.50')
  })

  it('shows submit button', () => {
    render(<TransferForm maxAmount="100" onSubmit={() => {}} isSubmitting={false} />)
    expect(screen.getByTestId('submit-button')).toHaveTextContent('Send')
  })

  it('disables button when submitting', () => {
    render(<TransferForm maxAmount="100" onSubmit={() => {}} isSubmitting={true} />)
    expect(screen.getByTestId('submit-button')).toBeDisabled()
    expect(screen.getByTestId('submit-button')).toHaveTextContent('Sending...')
  })

  it('calls onSubmit with form values', () => {
    const onSubmit = jest.fn()
    render(<TransferForm maxAmount="100" onSubmit={onSubmit} isSubmitting={false} />)
    
    fireEvent.change(screen.getByTestId('to-input'), { target: { value: '0x1234' } })
    fireEvent.change(screen.getByTestId('amount-input'), { target: { value: '50' } })
    fireEvent.submit(screen.getByTestId('transfer-form'))
    
    expect(onSubmit).toHaveBeenCalledWith('0x1234', '50')
  })
})

// Test Staking Panel pattern
describe('StakingPanel Pattern', () => {
  interface StakingData {
    stakedAmount: bigint
    availableToStake: bigint
    rewards: bigint
    apy: number
    lockPeriod: number // days
  }

  function StakingPanel({
    data,
    onStake,
    onUnstake,
    onClaimRewards,
    isProcessing,
  }: {
    data: StakingData
    onStake: (amount: string) => void
    onUnstake: (amount: string) => void
    onClaimRewards: () => void
    isProcessing: boolean
  }) {
    const formatAmount = (amount: bigint) => (Number(amount) / 1e18).toFixed(2)

    return (
      <div data-testid="staking-panel">
        <div data-testid="staking-stats">
          <div data-testid="staked-amount">
            <span>Staked</span>
            <span>{formatAmount(data.stakedAmount)} VFIDE</span>
          </div>
          <div data-testid="available-amount">
            <span>Available</span>
            <span>{formatAmount(data.availableToStake)} VFIDE</span>
          </div>
          <div data-testid="rewards-amount">
            <span>Rewards</span>
            <span>{formatAmount(data.rewards)} VFIDE</span>
          </div>
          <div data-testid="apy-display">
            <span>APY</span>
            <span>{data.apy}%</span>
          </div>
          <div data-testid="lock-period">
            <span>Lock Period</span>
            <span>{data.lockPeriod} days</span>
          </div>
        </div>
        <div data-testid="staking-actions">
          <button 
            data-testid="stake-button"
            onClick={() => onStake('100')}
            disabled={isProcessing}
          >
            Stake
          </button>
          <button 
            data-testid="unstake-button"
            onClick={() => onUnstake('100')}
            disabled={isProcessing || data.stakedAmount === 0n}
          >
            Unstake
          </button>
          <button 
            data-testid="claim-button"
            onClick={onClaimRewards}
            disabled={isProcessing || data.rewards === 0n}
          >
            Claim Rewards
          </button>
        </div>
      </div>
    )
  }

  const mockData: StakingData = {
    stakedAmount: BigInt('1000000000000000000000'),
    availableToStake: BigInt('500000000000000000000'),
    rewards: BigInt('50000000000000000000'),
    apy: 12.5,
    lockPeriod: 30,
  }

  it('displays staked amount', () => {
    render(
      <StakingPanel data={mockData} onStake={() => {}} onUnstake={() => {}} onClaimRewards={() => {}} isProcessing={false} />
    )
    expect(screen.getByTestId('staked-amount')).toHaveTextContent('1000.00 VFIDE')
  })

  it('displays available amount', () => {
    render(
      <StakingPanel data={mockData} onStake={() => {}} onUnstake={() => {}} onClaimRewards={() => {}} isProcessing={false} />
    )
    expect(screen.getByTestId('available-amount')).toHaveTextContent('500.00 VFIDE')
  })

  it('displays rewards', () => {
    render(
      <StakingPanel data={mockData} onStake={() => {}} onUnstake={() => {}} onClaimRewards={() => {}} isProcessing={false} />
    )
    expect(screen.getByTestId('rewards-amount')).toHaveTextContent('50.00 VFIDE')
  })

  it('displays APY', () => {
    render(
      <StakingPanel data={mockData} onStake={() => {}} onUnstake={() => {}} onClaimRewards={() => {}} isProcessing={false} />
    )
    expect(screen.getByTestId('apy-display')).toHaveTextContent('12.5%')
  })

  it('displays lock period', () => {
    render(
      <StakingPanel data={mockData} onStake={() => {}} onUnstake={() => {}} onClaimRewards={() => {}} isProcessing={false} />
    )
    expect(screen.getByTestId('lock-period')).toHaveTextContent('30 days')
  })

  it('calls onStake when stake clicked', () => {
    const onStake = jest.fn()
    render(
      <StakingPanel data={mockData} onStake={onStake} onUnstake={() => {}} onClaimRewards={() => {}} isProcessing={false} />
    )
    fireEvent.click(screen.getByTestId('stake-button'))
    expect(onStake).toHaveBeenCalled()
  })

  it('calls onClaimRewards when claim clicked', () => {
    const onClaimRewards = jest.fn()
    render(
      <StakingPanel data={mockData} onStake={() => {}} onUnstake={() => {}} onClaimRewards={onClaimRewards} isProcessing={false} />
    )
    fireEvent.click(screen.getByTestId('claim-button'))
    expect(onClaimRewards).toHaveBeenCalled()
  })

  it('disables claim when no rewards', () => {
    const noRewardsData = { ...mockData, rewards: 0n }
    render(
      <StakingPanel data={noRewardsData} onStake={() => {}} onUnstake={() => {}} onClaimRewards={() => {}} isProcessing={false} />
    )
    expect(screen.getByTestId('claim-button')).toBeDisabled()
  })

  it('disables all actions when processing', () => {
    render(
      <StakingPanel data={mockData} onStake={() => {}} onUnstake={() => {}} onClaimRewards={() => {}} isProcessing={true} />
    )
    expect(screen.getByTestId('stake-button')).toBeDisabled()
    expect(screen.getByTestId('claim-button')).toBeDisabled()
  })
})

// Test Token Selector pattern
describe('TokenSelector Pattern', () => {
  interface Token {
    address: string
    symbol: string
    name: string
    balance: bigint
  }

  function TokenSelector({
    tokens,
    selectedToken,
    onSelect,
  }: {
    tokens: Token[]
    selectedToken: string | null
    onSelect: (address: string) => void
  }) {
    return (
      <div data-testid="token-selector">
        {tokens.map(token => (
          <button
            key={token.address}
            data-testid={`token-${token.symbol}`}
            className={selectedToken === token.address ? 'selected' : ''}
            onClick={() => onSelect(token.address)}
          >
            <span data-testid={`symbol-${token.symbol}`}>{token.symbol}</span>
            <span data-testid={`name-${token.symbol}`}>{token.name}</span>
            <span data-testid={`balance-${token.symbol}`}>
              {(Number(token.balance) / 1e18).toFixed(2)}
            </span>
          </button>
        ))}
      </div>
    )
  }

  const mockTokens: Token[] = [
    { address: '0x1', symbol: 'VFIDE', name: 'VFIDE Token', balance: BigInt('1000000000000000000000') },
    { address: '0x2', symbol: 'USDC', name: 'USD Coin', balance: BigInt('500000000000000000000') },
  ]

  it('renders all tokens', () => {
    render(<TokenSelector tokens={mockTokens} selectedToken={null} onSelect={() => {}} />)
    expect(screen.getByTestId('token-VFIDE')).toBeInTheDocument()
    expect(screen.getByTestId('token-USDC')).toBeInTheDocument()
  })

  it('displays token symbols', () => {
    render(<TokenSelector tokens={mockTokens} selectedToken={null} onSelect={() => {}} />)
    expect(screen.getByTestId('symbol-VFIDE')).toHaveTextContent('VFIDE')
    expect(screen.getByTestId('symbol-USDC')).toHaveTextContent('USDC')
  })

  it('displays token names', () => {
    render(<TokenSelector tokens={mockTokens} selectedToken={null} onSelect={() => {}} />)
    expect(screen.getByTestId('name-VFIDE')).toHaveTextContent('VFIDE Token')
  })

  it('displays token balances', () => {
    render(<TokenSelector tokens={mockTokens} selectedToken={null} onSelect={() => {}} />)
    expect(screen.getByTestId('balance-VFIDE')).toHaveTextContent('1000.00')
  })

  it('calls onSelect when token clicked', () => {
    const onSelect = jest.fn()
    render(<TokenSelector tokens={mockTokens} selectedToken={null} onSelect={onSelect} />)
    fireEvent.click(screen.getByTestId('token-USDC'))
    expect(onSelect).toHaveBeenCalledWith('0x2')
  })
})

// Test Price Display pattern
describe('PriceDisplay Pattern', () => {
  function PriceDisplay({
    price,
    change24h,
    high24h,
    low24h,
    isLoading,
  }: {
    price: number
    change24h: number
    high24h?: number
    low24h?: number
    isLoading?: boolean
  }) {
    if (isLoading) {
      return <div data-testid="loading">Loading price...</div>
    }

    const isPositive = change24h >= 0

    return (
      <div data-testid="price-display">
        <div data-testid="current-price">${price.toFixed(4)}</div>
        <div 
          data-testid="price-change"
          className={isPositive ? 'positive' : 'negative'}
        >
          {isPositive ? '+' : ''}{change24h.toFixed(2)}%
        </div>
        {high24h !== undefined && low24h !== undefined && (
          <div data-testid="price-range">
            <span data-testid="high-24h">H: ${high24h.toFixed(4)}</span>
            <span data-testid="low-24h">L: ${low24h.toFixed(4)}</span>
          </div>
        )}
      </div>
    )
  }

  it('displays current price', () => {
    render(<PriceDisplay price={1.2345} change24h={5.5} />)
    expect(screen.getByTestId('current-price')).toHaveTextContent('$1.2345')
  })

  it('displays positive change with plus sign', () => {
    render(<PriceDisplay price={1.00} change24h={10.5} />)
    expect(screen.getByTestId('price-change')).toHaveTextContent('+10.50%')
  })

  it('displays negative change', () => {
    render(<PriceDisplay price={1.00} change24h={-5.25} />)
    expect(screen.getByTestId('price-change')).toHaveTextContent('-5.25%')
  })

  it('displays high and low prices', () => {
    render(<PriceDisplay price={1.00} change24h={0} high24h={1.25} low24h={0.95} />)
    expect(screen.getByTestId('high-24h')).toHaveTextContent('H: $1.2500')
    expect(screen.getByTestId('low-24h')).toHaveTextContent('L: $0.9500')
  })

  it('shows loading state', () => {
    render(<PriceDisplay price={0} change24h={0} isLoading={true} />)
    expect(screen.getByTestId('loading')).toBeInTheDocument()
  })
})

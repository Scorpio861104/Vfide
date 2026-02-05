/**
 * Merchant Component Tests
 * Tests for merchant-related components
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
  Store: () => <span data-testid="store-icon" />,
  DollarSign: () => <span data-testid="dollar-icon" />,
  TrendingUp: () => <span data-testid="trending-up" />,
  ShoppingCart: () => <span data-testid="cart-icon" />,
  CreditCard: () => <span data-testid="credit-card" />,
  QrCode: () => <span data-testid="qr-code" />,
  Copy: () => <span data-testid="copy-icon" />,
  Check: () => <span data-testid="check-icon" />,
  Clock: () => <span data-testid="clock-icon" />,
  ArrowUpRight: () => <span data-testid="arrow-up-right" />,
  ArrowDownRight: () => <span data-testid="arrow-down-right" />,
  Settings: () => <span data-testid="settings-icon" />,
  Users: () => <span data-testid="users-icon" />,
  ExternalLink: () => <span data-testid="external-link" />,
  Download: () => <span data-testid="download-icon" />,
}))

// Test Merchant Dashboard pattern
describe('MerchantDashboard Pattern', () => {
  interface MerchantStats {
    totalRevenue: string
    transactionsToday: number
    averageTransaction: string
    customersToday: number
    revenueChange: number
  }

  function MerchantDashboard({ stats }: { stats: MerchantStats }) {
    const isPositiveChange = stats.revenueChange >= 0

    return (
      <div data-testid="merchant-dashboard">
        <div data-testid="stat-revenue">
          <span data-testid="revenue-label">Total Revenue</span>
          <span data-testid="revenue-value">{stats.totalRevenue}</span>
          <span data-testid="revenue-change" className={isPositiveChange ? 'positive' : 'negative'}>
            {isPositiveChange ? '+' : ''}{stats.revenueChange}%
          </span>
        </div>
        <div data-testid="stat-transactions">
          <span data-testid="transactions-label">Transactions Today</span>
          <span data-testid="transactions-value">{stats.transactionsToday}</span>
        </div>
        <div data-testid="stat-average">
          <span data-testid="average-label">Average Transaction</span>
          <span data-testid="average-value">{stats.averageTransaction}</span>
        </div>
        <div data-testid="stat-customers">
          <span data-testid="customers-label">Customers Today</span>
          <span data-testid="customers-value">{stats.customersToday}</span>
        </div>
      </div>
    )
  }

  const mockStats: MerchantStats = {
    totalRevenue: '$12,543.00',
    transactionsToday: 47,
    averageTransaction: '$85.50',
    customersToday: 35,
    revenueChange: 12.5,
  }

  it('displays total revenue', () => {
    render(<MerchantDashboard stats={mockStats} />)
    expect(screen.getByTestId('revenue-value')).toHaveTextContent('$12,543.00')
  })

  it('displays transactions today', () => {
    render(<MerchantDashboard stats={mockStats} />)
    expect(screen.getByTestId('transactions-value')).toHaveTextContent('47')
  })

  it('displays average transaction', () => {
    render(<MerchantDashboard stats={mockStats} />)
    expect(screen.getByTestId('average-value')).toHaveTextContent('$85.50')
  })

  it('displays customers today', () => {
    render(<MerchantDashboard stats={mockStats} />)
    expect(screen.getByTestId('customers-value')).toHaveTextContent('35')
  })

  it('shows positive revenue change', () => {
    render(<MerchantDashboard stats={mockStats} />)
    expect(screen.getByTestId('revenue-change')).toHaveTextContent('+12.5%')
  })

  it('shows negative revenue change', () => {
    const negativeStats = { ...mockStats, revenueChange: -5.2 }
    render(<MerchantDashboard stats={negativeStats} />)
    expect(screen.getByTestId('revenue-change')).toHaveTextContent('-5.2%')
  })
})

// Test Payment Interface pattern
describe('PaymentInterface Pattern', () => {
  function PaymentInterface({ 
    amount,
    onAmountChange,
    onSubmit,
    isProcessing = false,
    merchantName = 'Merchant'
  }: { 
    amount: string
    onAmountChange: (amount: string) => void
    onSubmit: () => void
    isProcessing?: boolean
    merchantName?: string
  }) {
    return (
      <div data-testid="payment-interface">
        <h2 data-testid="merchant-name">Pay {merchantName}</h2>
        <div data-testid="amount-input-container">
          <label data-testid="amount-label">Amount (VFIDE)</label>
          <input 
            data-testid="amount-input"
            type="number"
            value={amount}
            onChange={(e) => onAmountChange(e.target.value)}
            disabled={isProcessing}
          />
        </div>
        <button 
          data-testid="pay-button"
          onClick={onSubmit}
          disabled={isProcessing || !amount}
        >
          {isProcessing ? 'Processing...' : 'Pay Now'}
        </button>
      </div>
    )
  }

  it('displays merchant name', () => {
    render(
      <PaymentInterface 
        amount="100" 
        onAmountChange={() => {}} 
        onSubmit={() => {}} 
        merchantName="Coffee Shop"
      />
    )
    expect(screen.getByTestId('merchant-name')).toHaveTextContent('Pay Coffee Shop')
  })

  it('displays amount input', () => {
    render(
      <PaymentInterface 
        amount="50" 
        onAmountChange={() => {}} 
        onSubmit={() => {}} 
      />
    )
    expect(screen.getByTestId('amount-input')).toHaveValue(50)
  })

  it('calls onAmountChange when input changes', () => {
    const onAmountChange = jest.fn()
    render(
      <PaymentInterface 
        amount="0" 
        onAmountChange={onAmountChange} 
        onSubmit={() => {}} 
      />
    )
    fireEvent.change(screen.getByTestId('amount-input'), { target: { value: '100' } })
    expect(onAmountChange).toHaveBeenCalledWith('100')
  })

  it('shows Pay Now button when not processing', () => {
    render(
      <PaymentInterface 
        amount="100" 
        onAmountChange={() => {}} 
        onSubmit={() => {}} 
      />
    )
    expect(screen.getByTestId('pay-button')).toHaveTextContent('Pay Now')
  })

  it('shows Processing when processing', () => {
    render(
      <PaymentInterface 
        amount="100" 
        onAmountChange={() => {}} 
        onSubmit={() => {}} 
        isProcessing={true}
      />
    )
    expect(screen.getByTestId('pay-button')).toHaveTextContent('Processing...')
  })

  it('disables button when processing', () => {
    render(
      <PaymentInterface 
        amount="100" 
        onAmountChange={() => {}} 
        onSubmit={() => {}} 
        isProcessing={true}
      />
    )
    expect(screen.getByTestId('pay-button')).toBeDisabled()
  })

  it('disables button when no amount', () => {
    render(
      <PaymentInterface 
        amount="" 
        onAmountChange={() => {}} 
        onSubmit={() => {}} 
      />
    )
    expect(screen.getByTestId('pay-button')).toBeDisabled()
  })
})

// Test Payment QR pattern
describe('PaymentQR Pattern', () => {
  function PaymentQR({ 
    merchantAddress, 
    amount,
    onCopy,
    copied = false 
  }: { 
    merchantAddress: string
    amount?: string
    onCopy: () => void
    copied?: boolean
  }) {
    const paymentUrl = amount 
      ? `vfide://pay?merchant=${merchantAddress}&amount=${amount}`
      : `vfide://pay?merchant=${merchantAddress}`

    return (
      <div data-testid="payment-qr">
        <div data-testid="qr-code-container">
          <div data-testid="qr-placeholder">[QR Code]</div>
        </div>
        <div data-testid="payment-details">
          <div data-testid="address-display">
            {merchantAddress.slice(0, 6)}...{merchantAddress.slice(-4)}
          </div>
          {amount && <div data-testid="amount-display">{amount} VFIDE</div>}
          <button data-testid="copy-button" onClick={onCopy}>
            {copied ? 'Copied!' : 'Copy Link'}
          </button>
        </div>
      </div>
    )
  }

  it('displays QR placeholder', () => {
    render(
      <PaymentQR 
        merchantAddress="0x1234567890123456789012345678901234567890"
        onCopy={() => {}}
      />
    )
    expect(screen.getByTestId('qr-placeholder')).toBeInTheDocument()
  })

  it('displays truncated address', () => {
    render(
      <PaymentQR 
        merchantAddress="0x1234567890123456789012345678901234567890"
        onCopy={() => {}}
      />
    )
    expect(screen.getByTestId('address-display')).toHaveTextContent('0x1234...7890')
  })

  it('displays amount when provided', () => {
    render(
      <PaymentQR 
        merchantAddress="0x1234567890123456789012345678901234567890"
        amount="50"
        onCopy={() => {}}
      />
    )
    expect(screen.getByTestId('amount-display')).toHaveTextContent('50 VFIDE')
  })

  it('shows Copy Link button', () => {
    render(
      <PaymentQR 
        merchantAddress="0x1234567890123456789012345678901234567890"
        onCopy={() => {}}
      />
    )
    expect(screen.getByTestId('copy-button')).toHaveTextContent('Copy Link')
  })

  it('shows Copied! after copy', () => {
    render(
      <PaymentQR 
        merchantAddress="0x1234567890123456789012345678901234567890"
        onCopy={() => {}}
        copied={true}
      />
    )
    expect(screen.getByTestId('copy-button')).toHaveTextContent('Copied!')
  })

  it('calls onCopy when copy button clicked', () => {
    const onCopy = jest.fn()
    render(
      <PaymentQR 
        merchantAddress="0x1234567890123456789012345678901234567890"
        onCopy={onCopy}
      />
    )
    fireEvent.click(screen.getByTestId('copy-button'))
    expect(onCopy).toHaveBeenCalled()
  })
})

// Test Transaction List pattern
describe('TransactionList Pattern', () => {
  interface Transaction {
    id: string
    customer: string
    amount: string
    timestamp: string
    status: 'completed' | 'pending' | 'failed'
  }

  function TransactionList({ 
    transactions, 
    onTransactionClick 
  }: { 
    transactions: Transaction[]
    onTransactionClick: (id: string) => void
  }) {
    if (transactions.length === 0) {
      return <div data-testid="empty-state">No transactions yet</div>
    }

    return (
      <div data-testid="transaction-list">
        {transactions.map(tx => (
          <div 
            key={tx.id} 
            data-testid={`transaction-${tx.id}`}
            onClick={() => onTransactionClick(tx.id)}
          >
            <span data-testid="customer">{tx.customer}</span>
            <span data-testid="amount">{tx.amount}</span>
            <span data-testid="timestamp">{tx.timestamp}</span>
            <span data-testid="status" className={tx.status}>{tx.status}</span>
          </div>
        ))}
      </div>
    )
  }

  it('shows empty state when no transactions', () => {
    render(<TransactionList transactions={[]} onTransactionClick={() => {}} />)
    expect(screen.getByTestId('empty-state')).toHaveTextContent('No transactions yet')
  })

  it('renders transactions', () => {
    const transactions = [
      { id: '1', customer: '0x1234...5678', amount: '100 VFIDE', timestamp: '5 min ago', status: 'completed' as const },
      { id: '2', customer: '0xabcd...efgh', amount: '50 VFIDE', timestamp: '10 min ago', status: 'pending' as const },
    ]
    render(<TransactionList transactions={transactions} onTransactionClick={() => {}} />)
    expect(screen.getByTestId('transaction-1')).toBeInTheDocument()
    expect(screen.getByTestId('transaction-2')).toBeInTheDocument()
  })

  it('calls onTransactionClick when transaction clicked', () => {
    const onTransactionClick = jest.fn()
    const transactions = [
      { id: '1', customer: '0x1234...5678', amount: '100 VFIDE', timestamp: '5 min ago', status: 'completed' as const },
    ]
    render(<TransactionList transactions={transactions} onTransactionClick={onTransactionClick} />)
    fireEvent.click(screen.getByTestId('transaction-1'))
    expect(onTransactionClick).toHaveBeenCalledWith('1')
  })
})

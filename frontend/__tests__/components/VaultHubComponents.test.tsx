/**
 * Vault Hub Component Tests
 * Tests for vault hub and vault management components
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

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
  Vault: () => <span data-testid="vault-icon" />,
  Lock: () => <span data-testid="lock-icon" />,
  Unlock: () => <span data-testid="unlock-icon" />,
  Shield: () => <span data-testid="shield-icon" />,
  Clock: () => <span data-testid="clock-icon" />,
  History: () => <span data-testid="history-icon" />,
  Settings: () => <span data-testid="settings-icon" />,
  ArrowUpRight: () => <span data-testid="arrow-up-right" />,
  ArrowDownLeft: () => <span data-testid="arrow-down-left" />,
  Plus: () => <span data-testid="plus-icon" />,
  AlertTriangle: () => <span data-testid="alert-triangle" />,
}))

// Test VaultDashboard pattern
describe('VaultDashboard Pattern', () => {
  interface VaultSummary {
    totalBalance: bigint
    lockedBalance: bigint
    availableBalance: bigint
    lastActivity: string
    securityLevel: 'low' | 'medium' | 'high'
  }

  function VaultDashboard({
    vault,
    onDeposit,
    onWithdraw,
    onSettings,
  }: {
    vault: VaultSummary
    onDeposit: () => void
    onWithdraw: () => void
    onSettings: () => void
  }) {
    const formatBalance = (balance: bigint) => (Number(balance) / 1e18).toFixed(2)

    return (
      <div data-testid="vault-dashboard">
        <h2 data-testid="dashboard-title">Your Vault</h2>
        <div data-testid="vault-stats">
          <div data-testid="total-balance">
            <span>Total Balance</span>
            <span>{formatBalance(vault.totalBalance)} VFIDE</span>
          </div>
          <div data-testid="locked-balance">
            <span>Locked</span>
            <span>{formatBalance(vault.lockedBalance)} VFIDE</span>
          </div>
          <div data-testid="available-balance">
            <span>Available</span>
            <span>{formatBalance(vault.availableBalance)} VFIDE</span>
          </div>
        </div>
        <div data-testid="security-info">
          <span data-testid="security-level">Security: {vault.securityLevel}</span>
          <span data-testid="last-activity">Last Activity: {vault.lastActivity}</span>
        </div>
        <div data-testid="vault-actions">
          <button data-testid="deposit-button" onClick={onDeposit}>Deposit</button>
          <button data-testid="withdraw-button" onClick={onWithdraw}>Withdraw</button>
          <button data-testid="settings-button" onClick={onSettings}>Settings</button>
        </div>
      </div>
    )
  }

  const mockVault: VaultSummary = {
    totalBalance: BigInt('5000000000000000000000'),
    lockedBalance: BigInt('2000000000000000000000'),
    availableBalance: BigInt('3000000000000000000000'),
    lastActivity: '2 hours ago',
    securityLevel: 'high',
  }

  it('displays total balance', () => {
    render(<VaultDashboard vault={mockVault} onDeposit={() => {}} onWithdraw={() => {}} onSettings={() => {}} />)
    expect(screen.getByTestId('total-balance')).toHaveTextContent('5000.00 VFIDE')
  })

  it('displays locked balance', () => {
    render(<VaultDashboard vault={mockVault} onDeposit={() => {}} onWithdraw={() => {}} onSettings={() => {}} />)
    expect(screen.getByTestId('locked-balance')).toHaveTextContent('2000.00 VFIDE')
  })

  it('displays available balance', () => {
    render(<VaultDashboard vault={mockVault} onDeposit={() => {}} onWithdraw={() => {}} onSettings={() => {}} />)
    expect(screen.getByTestId('available-balance')).toHaveTextContent('3000.00 VFIDE')
  })

  it('displays security level', () => {
    render(<VaultDashboard vault={mockVault} onDeposit={() => {}} onWithdraw={() => {}} onSettings={() => {}} />)
    expect(screen.getByTestId('security-level')).toHaveTextContent('Security: high')
  })

  it('displays last activity', () => {
    render(<VaultDashboard vault={mockVault} onDeposit={() => {}} onWithdraw={() => {}} onSettings={() => {}} />)
    expect(screen.getByTestId('last-activity')).toHaveTextContent('Last Activity: 2 hours ago')
  })

  it('calls onDeposit when deposit clicked', () => {
    const onDeposit = vi.fn()
    render(<VaultDashboard vault={mockVault} onDeposit={onDeposit} onWithdraw={() => {}} onSettings={() => {}} />)
    fireEvent.click(screen.getByTestId('deposit-button'))
    expect(onDeposit).toHaveBeenCalled()
  })

  it('calls onWithdraw when withdraw clicked', () => {
    const onWithdraw = vi.fn()
    render(<VaultDashboard vault={mockVault} onDeposit={() => {}} onWithdraw={onWithdraw} onSettings={() => {}} />)
    fireEvent.click(screen.getByTestId('withdraw-button'))
    expect(onWithdraw).toHaveBeenCalled()
  })

  it('calls onSettings when settings clicked', () => {
    const onSettings = vi.fn()
    render(<VaultDashboard vault={mockVault} onDeposit={() => {}} onWithdraw={() => {}} onSettings={onSettings} />)
    fireEvent.click(screen.getByTestId('settings-button'))
    expect(onSettings).toHaveBeenCalled()
  })
})

// Test VaultTransactionHistory pattern
describe('VaultTransactionHistory Pattern', () => {
  interface Transaction {
    id: string
    type: 'deposit' | 'withdraw' | 'lock' | 'unlock'
    amount: bigint
    timestamp: number
    txHash: string
  }

  function VaultTransactionHistory({
    transactions,
    isLoading,
    onLoadMore,
    hasMore,
  }: {
    transactions: Transaction[]
    isLoading: boolean
    onLoadMore: () => void
    hasMore: boolean
  }) {
    const formatAmount = (amount: bigint) => (Number(amount) / 1e18).toFixed(2)
    const formatDate = (timestamp: number) => new Date(timestamp * 1000).toLocaleDateString()

    if (isLoading && transactions.length === 0) {
      return <div data-testid="loading">Loading transactions...</div>
    }

    if (transactions.length === 0) {
      return <div data-testid="no-transactions">No transactions yet</div>
    }

    return (
      <div data-testid="transaction-history">
        <h3 data-testid="history-title">Transaction History</h3>
        <div data-testid="transaction-list">
          {transactions.map(tx => (
            <div key={tx.id} data-testid={`tx-${tx.id}`}>
              <span data-testid={`tx-type-${tx.id}`}>{tx.type.toUpperCase()}</span>
              <span data-testid={`tx-amount-${tx.id}`}>{formatAmount(tx.amount)} VFIDE</span>
              <span data-testid={`tx-date-${tx.id}`}>{formatDate(tx.timestamp)}</span>
              <a 
                data-testid={`tx-link-${tx.id}`}
                href={`https://basescan.org/tx/${tx.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                View
              </a>
            </div>
          ))}
        </div>
        {hasMore && (
          <button 
            data-testid="load-more-button"
            onClick={onLoadMore}
            disabled={isLoading}
          >
            {isLoading ? 'Loading...' : 'Load More'}
          </button>
        )}
      </div>
    )
  }

  const mockTransactions: Transaction[] = [
    { id: '1', type: 'deposit', amount: BigInt('1000000000000000000000'), timestamp: 1704067200, txHash: '0xabc123' },
    { id: '2', type: 'withdraw', amount: BigInt('500000000000000000000'), timestamp: 1704153600, txHash: '0xdef456' },
  ]

  it('shows loading state', () => {
    render(
      <VaultTransactionHistory
        transactions={[]}
        isLoading={true}
        onLoadMore={() => {}}
        hasMore={false}
      />
    )
    expect(screen.getByTestId('loading')).toBeInTheDocument()
  })

  it('shows empty state', () => {
    render(
      <VaultTransactionHistory
        transactions={[]}
        isLoading={false}
        onLoadMore={() => {}}
        hasMore={false}
      />
    )
    expect(screen.getByTestId('no-transactions')).toBeInTheDocument()
  })

  it('renders transaction list', () => {
    render(
      <VaultTransactionHistory
        transactions={mockTransactions}
        isLoading={false}
        onLoadMore={() => {}}
        hasMore={false}
      />
    )
    expect(screen.getByTestId('tx-1')).toBeInTheDocument()
    expect(screen.getByTestId('tx-2')).toBeInTheDocument()
  })

  it('displays transaction types', () => {
    render(
      <VaultTransactionHistory
        transactions={mockTransactions}
        isLoading={false}
        onLoadMore={() => {}}
        hasMore={false}
      />
    )
    expect(screen.getByTestId('tx-type-1')).toHaveTextContent('DEPOSIT')
    expect(screen.getByTestId('tx-type-2')).toHaveTextContent('WITHDRAW')
  })

  it('displays transaction amounts', () => {
    render(
      <VaultTransactionHistory
        transactions={mockTransactions}
        isLoading={false}
        onLoadMore={() => {}}
        hasMore={false}
      />
    )
    expect(screen.getByTestId('tx-amount-1')).toHaveTextContent('1000.00 VFIDE')
    expect(screen.getByTestId('tx-amount-2')).toHaveTextContent('500.00 VFIDE')
  })

  it('shows load more button when hasMore', () => {
    render(
      <VaultTransactionHistory
        transactions={mockTransactions}
        isLoading={false}
        onLoadMore={() => {}}
        hasMore={true}
      />
    )
    expect(screen.getByTestId('load-more-button')).toBeInTheDocument()
  })

  it('hides load more button when no more', () => {
    render(
      <VaultTransactionHistory
        transactions={mockTransactions}
        isLoading={false}
        onLoadMore={() => {}}
        hasMore={false}
      />
    )
    expect(screen.queryByTestId('load-more-button')).not.toBeInTheDocument()
  })

  it('calls onLoadMore when load more clicked', () => {
    const onLoadMore = vi.fn()
    render(
      <VaultTransactionHistory
        transactions={mockTransactions}
        isLoading={false}
        onLoadMore={onLoadMore}
        hasMore={true}
      />
    )
    fireEvent.click(screen.getByTestId('load-more-button'))
    expect(onLoadMore).toHaveBeenCalled()
  })
})

// Test VaultSettings pattern
describe('VaultSettings Pattern', () => {
  interface VaultConfig {
    withdrawalDelay: number // hours
    dailyLimit: bigint
    requiresGuardian: boolean
    guardianApprovals: number
  }

  function VaultSettings({
    config,
    onSave,
    isSaving,
  }: {
    config: VaultConfig
    onSave: (config: VaultConfig) => void
    isSaving: boolean
  }) {
    return (
      <div data-testid="vault-settings">
        <h3 data-testid="settings-title">Vault Settings</h3>
        <div data-testid="setting-withdrawal-delay">
          <label>Withdrawal Delay</label>
          <span data-testid="delay-value">{config.withdrawalDelay} hours</span>
        </div>
        <div data-testid="setting-daily-limit">
          <label>Daily Limit</label>
          <span data-testid="limit-value">{(Number(config.dailyLimit) / 1e18).toFixed(0)} VFIDE</span>
        </div>
        <div data-testid="setting-guardian">
          <label>Guardian Required</label>
          <span data-testid="guardian-value">{config.requiresGuardian ? 'Yes' : 'No'}</span>
        </div>
        {config.requiresGuardian && (
          <div data-testid="setting-approvals">
            <label>Required Approvals</label>
            <span data-testid="approvals-value">{config.guardianApprovals}</span>
          </div>
        )}
        <button 
          data-testid="save-button"
          onClick={() => onSave(config)}
          disabled={isSaving}
        >
          {isSaving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    )
  }

  const mockConfig: VaultConfig = {
    withdrawalDelay: 24,
    dailyLimit: BigInt('10000000000000000000000'),
    requiresGuardian: true,
    guardianApprovals: 2,
  }

  it('displays withdrawal delay', () => {
    render(<VaultSettings config={mockConfig} onSave={() => {}} isSaving={false} />)
    expect(screen.getByTestId('delay-value')).toHaveTextContent('24 hours')
  })

  it('displays daily limit', () => {
    render(<VaultSettings config={mockConfig} onSave={() => {}} isSaving={false} />)
    expect(screen.getByTestId('limit-value')).toHaveTextContent('10000 VFIDE')
  })

  it('displays guardian requirement', () => {
    render(<VaultSettings config={mockConfig} onSave={() => {}} isSaving={false} />)
    expect(screen.getByTestId('guardian-value')).toHaveTextContent('Yes')
  })

  it('displays approvals when guardian required', () => {
    render(<VaultSettings config={mockConfig} onSave={() => {}} isSaving={false} />)
    expect(screen.getByTestId('approvals-value')).toHaveTextContent('2')
  })

  it('hides approvals when guardian not required', () => {
    const noGuardianConfig = { ...mockConfig, requiresGuardian: false }
    render(<VaultSettings config={noGuardianConfig} onSave={() => {}} isSaving={false} />)
    expect(screen.queryByTestId('setting-approvals')).not.toBeInTheDocument()
  })

  it('calls onSave when save clicked', () => {
    const onSave = vi.fn()
    render(<VaultSettings config={mockConfig} onSave={onSave} isSaving={false} />)
    fireEvent.click(screen.getByTestId('save-button'))
    expect(onSave).toHaveBeenCalledWith(mockConfig)
  })

  it('shows saving state', () => {
    render(<VaultSettings config={mockConfig} onSave={() => {}} isSaving={true} />)
    expect(screen.getByTestId('save-button')).toHaveTextContent('Saving...')
    expect(screen.getByTestId('save-button')).toBeDisabled()
  })
})

// Test VaultLockStatus pattern
describe('VaultLockStatus Pattern', () => {
  function VaultLockStatus({
    isLocked,
    lockedUntil,
    lockReason,
    onUnlock,
    canUnlock,
    isUnlocking,
  }: {
    isLocked: boolean
    lockedUntil?: number
    lockReason?: string
    onUnlock: () => void
    canUnlock: boolean
    isUnlocking: boolean
  }) {
    if (!isLocked) {
      return (
        <div data-testid="vault-unlocked">
          <span data-testid="status">Vault is unlocked</span>
        </div>
      )
    }

    return (
      <div data-testid="vault-locked">
        <span data-testid="status">Vault is locked</span>
        {lockReason && (
          <span data-testid="lock-reason">Reason: {lockReason}</span>
        )}
        {lockedUntil && (
          <span data-testid="locked-until">
            Until: {new Date(lockedUntil * 1000).toLocaleString()}
          </span>
        )}
        <button
          data-testid="unlock-button"
          onClick={onUnlock}
          disabled={!canUnlock || isUnlocking}
        >
          {isUnlocking ? 'Unlocking...' : 'Request Unlock'}
        </button>
        {!canUnlock && (
          <span data-testid="cannot-unlock">Guardian approval required</span>
        )}
      </div>
    )
  }

  it('shows unlocked status', () => {
    render(
      <VaultLockStatus
        isLocked={false}
        onUnlock={() => {}}
        canUnlock={true}
        isUnlocking={false}
      />
    )
    expect(screen.getByTestId('status')).toHaveTextContent('Vault is unlocked')
  })

  it('shows locked status', () => {
    render(
      <VaultLockStatus
        isLocked={true}
        onUnlock={() => {}}
        canUnlock={true}
        isUnlocking={false}
      />
    )
    expect(screen.getByTestId('status')).toHaveTextContent('Vault is locked')
  })

  it('shows lock reason', () => {
    render(
      <VaultLockStatus
        isLocked={true}
        lockReason="User initiated"
        onUnlock={() => {}}
        canUnlock={true}
        isUnlocking={false}
      />
    )
    expect(screen.getByTestId('lock-reason')).toHaveTextContent('Reason: User initiated')
  })

  it('calls onUnlock when unlock clicked', () => {
    const onUnlock = vi.fn()
    render(
      <VaultLockStatus
        isLocked={true}
        onUnlock={onUnlock}
        canUnlock={true}
        isUnlocking={false}
      />
    )
    fireEvent.click(screen.getByTestId('unlock-button'))
    expect(onUnlock).toHaveBeenCalled()
  })

  it('disables unlock when cannot unlock', () => {
    render(
      <VaultLockStatus
        isLocked={true}
        onUnlock={() => {}}
        canUnlock={false}
        isUnlocking={false}
      />
    )
    expect(screen.getByTestId('unlock-button')).toBeDisabled()
    expect(screen.getByTestId('cannot-unlock')).toBeInTheDocument()
  })

  it('shows unlocking state', () => {
    render(
      <VaultLockStatus
        isLocked={true}
        onUnlock={() => {}}
        canUnlock={true}
        isUnlocking={true}
      />
    )
    expect(screen.getByTestId('unlock-button')).toHaveTextContent('Unlocking...')
  })
})

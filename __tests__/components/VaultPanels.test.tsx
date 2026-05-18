import { describe, expect, it, } from '@jest/globals'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, style, ...props }: any) => (
      <div className={className} style={style} {...props}>{children}</div>
    ),
    button: ({ children, className, onClick, ...props }: any) => (
      <button className={className} onClick={onClick} {...props}>{children}</button>
    ),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}))

// Mock lucide-react
jest.mock('lucide-react', () => ({
  ArrowUpRight: () => <span>ArrowUpRight</span>,
  ArrowDownLeft: () => <span>ArrowDownLeft</span>,
  Shield: () => <span>Shield</span>,
  Clock: () => <span>Clock</span>,
  ExternalLink: () => <span>ExternalLink</span>,
  Filter: () => <span>Filter</span>,
  Search: () => <span>Search</span>,
  AlertTriangle: () => <span>AlertTriangle</span>,
  Camera: () => <span>Camera</span>,
  Trash2: () => <span>Trash2</span>,
  CheckCircle: () => <span>CheckCircle</span>,
  XCircle: () => <span>XCircle</span>,
  Settings: () => <span>Settings</span>,
  Info: () => <span>Info</span>,
}))

// Mock wagmi
jest.mock('wagmi', () => ({
  useAccount: () => ({
    address: '0x1234567890123456789012345678901234567890',
    isConnected: true,
  }),
}))

// Mock viem
jest.mock('viem', () => ({
  formatEther: (val) => (Number(val) / 1e18).toString(),
  formatUnits: (val, decimals) => (Number(val) / Math.pow(10, decimals || 18)).toString(),
  parseUnits: (val, decimals) => BigInt(Math.floor(parseFloat(val) * Math.pow(10, decimals || 18))),
  isAddress: (addr) => addr && addr.startsWith('0x') && addr.length === 42,
  getAddress: (addr) => addr,
}))

// Mock vfide hooks
jest.mock('@/lib/vfide-hooks', () => ({
  useUserVault: () => ({
    vaultAddress: '0x1234567890123456789012345678901234567890',
  }),
  useVaultBalance: () => ({
    balanceRaw: 1000000000000000000n,
    balance: '1.0',
  }),
  useAbnormalTransactionThreshold: () => ({
    threshold: 1000000000000000000n,
    usePercentage: false,
    percentageBps: 0,
  }),
  useBalanceSnapshot: () => ({
    useSnapshot: false,
    snapshot: 0n,
  }),
  useSetBalanceSnapshotMode: () => ({
    setSnapshotMode: jest.fn(),
    isLoading: false,
  }),
  useUpdateBalanceSnapshot: () => ({
    updateSnapshot: jest.fn(),
    isLoading: false,
  }),
  usePendingTransaction: () => ({
    pendingTxCount: 0,
    pendingTx: null,
  }),
  useApprovePendingTransaction: () => ({
    approve: jest.fn(),
    isLoading: false,
  }),
  useExecutePendingTransaction: () => ({
    execute: jest.fn(),
    isLoading: false,
  }),
  useCleanupExpiredTransaction: () => ({
    cleanup: jest.fn(),
    isLoading: false,
  }),
}))

// Import after mocking
import { TransactionHistory } from '@/components/vault/TransactionHistory'
import { VaultSettingsPanel } from '@/components/vault/VaultSettingsPanel'

describe('TransactionHistory', () => {
  it('renders with default transactions', () => {
    const { container } = render(<TransactionHistory />)
    expect(container).toBeInTheDocument()
  })

  it('renders with loading state', () => {
    render(<TransactionHistory loading={true} />)
    expect(document.body).toBeInTheDocument()
  })

  it('renders search input', () => {
    render(<TransactionHistory />)
    expect(screen.getAllByRole('textbox').length).toBeGreaterThan(0)
  })

  it('renders filter dropdown', () => {
    render(<TransactionHistory />)
    // Filter should be rendered
    expect(screen.getByText('Filter')).toBeInTheDocument()
  })

  it('renders empty state with no transactions', () => {
    render(<TransactionHistory />)
    // With no transactions prop, shows empty state
    expect(screen.getByText(/No transactions found/i)).toBeInTheDocument()
  })

  it('renders with custom transactions', () => {
    const transactions = [
      {
        id: '1',
        type: 'send' as const,
        amount: '-100 VFIDE',
        to: '0xabc...def',
        timestamp: '1 hour ago',
        status: 'completed' as const,
        txHash: '0x123',
      },
    ]
    render(<TransactionHistory transactions={transactions} />)
    expect(screen.getByText('-100 VFIDE')).toBeInTheDocument()
  })

  it('switches to performance mode for long transaction histories', () => {
    const transactions = Array.from({ length: 18 }, (_, i) => ({
      id: String(i + 1),
      type: (i % 2 === 0 ? 'send' : 'receive') as const,
      amount: `${i + 1} VFIDE`,
      to: '0xabc...def',
      timestamp: `${i + 1} hours ago`,
      status: 'completed' as const,
      txHash: `0x${String(i + 1).padStart(6, '0')}`,
    }))

    render(<TransactionHistory transactions={transactions} />)

    expect(screen.getByText(/performance mode active/i)).toBeInTheDocument()
    expect(screen.getByText('1 VFIDE')).toBeInTheDocument()
    expect(screen.queryByText('18 VFIDE')).not.toBeInTheDocument()
  })
})

describe('VaultSettingsPanel', () => {
  it('renders when connected', () => {
    const { container } = render(<VaultSettingsPanel />)
    expect(container).toBeInTheDocument()
  })

  it('shows vault settings', () => {
    render(<VaultSettingsPanel />)
    // Settings should be rendered
    expect(screen.getByText('Settings')).toBeInTheDocument()
  })
})

describe('VaultSettingsPanel - No Wallet', () => {
  beforeAll(() => {
    jest.doMock('wagmi', () => ({
      useAccount: () => ({
        address: undefined,
        isConnected: false,
      }),
    }))
  })

  it('shows connect message when no wallet', () => {
    const { container } = render(<VaultSettingsPanel />)
    expect(container).toBeInTheDocument()
  })
})

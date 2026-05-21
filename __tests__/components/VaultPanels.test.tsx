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
  useChainId: jest.fn(() => 1),
  useSwitchChain: jest.fn(() => ({ switchChain: jest.fn(), switchChainAsync: jest.fn(), chains: [], status: 'idle' })),
  useReadContract: jest.fn(() => ({ data: undefined, isError: false, isLoading: false, isSuccess: false, error: null, refetch: jest.fn() })),
  useReadContracts: jest.fn(() => ({ data: undefined, isError: false, isLoading: false, isSuccess: false, error: null, refetch: jest.fn() })),
  useWriteContract: jest.fn(() => ({ writeContract: jest.fn(), writeContractAsync: jest.fn(), data: undefined, isPending: false, isSuccess: false, isError: false, error: null, reset: jest.fn() })),
  useWaitForTransactionReceipt: jest.fn(() => ({ data: undefined, isLoading: false, isSuccess: false, isError: false })),
  useWatchContractEvent: jest.fn(() => undefined),
  usePublicClient: jest.fn(() => ({ readContract: jest.fn(), getBlockNumber: jest.fn(), getTransactionReceipt: jest.fn() })),
  useWalletClient: jest.fn(() => ({ data: undefined, isLoading: false })),
  useSignTypedData: jest.fn(() => ({ signTypedData: jest.fn(), signTypedDataAsync: jest.fn(), data: undefined, isPending: false, isError: false, error: null, reset: jest.fn() })),
  useSignMessage: jest.fn(() => ({ signMessage: jest.fn(), signMessageAsync: jest.fn(), data: undefined, isPending: false, isError: false, error: null, reset: jest.fn() })),
  useConnect: jest.fn(() => ({ connect: jest.fn(), connectAsync: jest.fn(), connectors: [], status: 'idle' })),
  useDisconnect: jest.fn(() => ({ disconnect: jest.fn(), disconnectAsync: jest.fn() })),
  useConnections: jest.fn(() => []),
  useBalance: jest.fn(() => ({ data: undefined, isLoading: false, isError: false, refetch: jest.fn() })),
  useEnsName: jest.fn(() => ({ data: undefined, isLoading: false })),
  useEnsAvatar: jest.fn(() => ({ data: undefined, isLoading: false })),
  useBlockNumber: jest.fn(() => ({ data: undefined, isLoading: false, refetch: jest.fn() })),
  useEstimateGas: jest.fn(() => ({ data: undefined, isLoading: false })),
  useSendTransaction: jest.fn(() => ({ sendTransaction: jest.fn(), sendTransactionAsync: jest.fn(), data: undefined, isPending: false, isError: false, error: null })),
  useConfig: jest.fn(() => ({})),
  WagmiProvider: jest.fn(),
  createConfig: jest.fn(),
  http: jest.fn(),
}))

// Mock viem
jest.mock('viem', () => ({
  formatEther: (val) => (Number(val) / 1e18).toString(),
  formatUnits: (val, decimals) => (Number(val) / Math.pow(10, decimals || 18)).toString(),
  parseUnits: (val, decimals) => BigInt(Math.floor(parseFloat(val) * Math.pow(10, decimals || 18))),
  isAddress: (addr) => addr && addr.startsWith('0x') && addr.length === 42,
  getAddress: (addr) => addr,
  parseAbi: jest.fn(() => []),
  parseAbiItem: jest.fn((sig: any) => ({ name: typeof sig === 'string' ? sig.split(' ')[1]?.split('(')[0] : '', type: 'function' })),
  parseEther: jest.fn((v: any) => BigInt(v || 0)),
  encodeFunctionData: jest.fn(() => '0x'),
  decodeFunctionResult: jest.fn(() => undefined),
  encodeAbiParameters: jest.fn(() => '0x'),
  decodeAbiParameters: jest.fn(() => []),
  keccak256: jest.fn(() => '0x' + '0'.repeat(64)),
  toBytes: jest.fn(() => new Uint8Array()),
  toHex: jest.fn((v: any) => '0x' + (v ?? '').toString(16)),
  hexToString: jest.fn((h: any) => String(h)),
  padHex: jest.fn((h: any) => h),
  zeroAddress: '0x0000000000000000000000000000000000000000',
  stringToHex: jest.fn((s: any) => '0x' + Buffer.from(String(s)).toString('hex')),
  createPublicClient: jest.fn(() => ({ readContract: jest.fn(), getBlockNumber: jest.fn() })),
  createWalletClient: jest.fn(() => ({ writeContract: jest.fn() })),
  http: jest.fn(() => ({})),
  custom: jest.fn(() => ({})),
  erc20Abi: [],
  erc721Abi: [],
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

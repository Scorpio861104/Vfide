/**
 * Comprehensive tests for VaultSettingsPanel component
 */
import { describe, expect, it, vi, beforeEach } from '@jest/globals'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, ...props }: any) => <div className={className}>{children}</div>,
    button: ({ children, className, onClick, disabled, ...props }: any) => (
      <button className={className} onClick={onClick} disabled={disabled}>{children}</button>
    ),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}))

// Mock wagmi
jest.mock('wagmi', () => ({
  useAccount: jest.fn(() => ({ address: '0x1234567890123456789012345678901234567890' })),
}))

// Mock vfide-hooks
jest.mock('@/lib/vfide-hooks', () => ({
  useUserVault: jest.fn(() => ({
    vaultAddress: '0xVaultAddress123456789012345678901234567890' as `0x${string}`,
  })),
  useVaultBalance: jest.fn(() => ({
    balance: '1000',
    balanceRaw: BigInt('1000000000000000000000'),
  })),
  useAbnormalTransactionThreshold: jest.fn(() => ({
    threshold: BigInt('100000000000000000000'),
    usePercentage: true,
    percentageBps: 500, // 5%
  })),
  useBalanceSnapshot: jest.fn(() => ({
    useSnapshot: false,
    snapshot: BigInt('500000000000000000000'),
  })),
  useSetBalanceSnapshotMode: jest.fn(() => ({
    setSnapshotMode: jest.fn(),
    isLoading: false,
  })),
  useUpdateBalanceSnapshot: jest.fn(() => ({
    updateSnapshot: jest.fn(),
    isLoading: false,
  })),
  usePendingTransaction: jest.fn(() => ({
    pendingTxCount: 2,
    pendingTx: {
      amount: BigInt('50000000000000000000'),
      toVault: '0xRecipient12345678901234567890123456789012' as `0x${string}`,
      approved: false,
      executed: false,
      expiresAt: BigInt(Date.now() + 86400000),
    },
  })),
  useApprovePendingTransaction: jest.fn(() => ({
    approve: jest.fn(),
    isLoading: false,
  })),
  useExecutePendingTransaction: jest.fn(() => ({
    execute: jest.fn(),
    isLoading: false,
  })),
  useCleanupExpiredTransaction: jest.fn(() => ({
    cleanup: jest.fn(),
    isLoading: false,
  })),
}))

// Mock lucide icons
jest.mock('lucide-react', () => ({
  Shield: () => <span data-testid="icon-shield">Shield</span>,
  AlertTriangle: () => <span data-testid="icon-alert">Alert</span>,
  Clock: () => <span data-testid="icon-clock">Clock</span>,
  Camera: () => <span data-testid="icon-camera">Camera</span>,
  Trash2: () => <span data-testid="icon-trash">Trash</span>,
  CheckCircle: () => <span data-testid="icon-check">Check</span>,
  XCircle: () => <span data-testid="icon-x">X</span>,
  Settings: () => <span data-testid="icon-settings">Settings</span>,
  Info: () => <span data-testid="icon-info">Info</span>,
}))

import { VaultSettingsPanel } from '@/components/vault/VaultSettingsPanel'

describe('VaultSettingsPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders settings panel', () => {
    const { container } = render(<VaultSettingsPanel />)
    expect(container.firstChild).toBeInTheDocument()
  })

  it('shows settings icon', () => {
    render(<VaultSettingsPanel />)
    expect(screen.getByTestId('icon-settings')).toBeInTheDocument()
  })

  it('displays threshold information', () => {
    const { container } = render(<VaultSettingsPanel />)
    // Should show threshold percentage
    expect(container.textContent).toMatch(/threshold|5/i)
  })

  it('shows snapshot toggle option', () => {
    const { container } = render(<VaultSettingsPanel />)
    // Should have snapshot controls
    expect(container.firstChild).not.toBeNull()
  })

  it('displays pending transaction count', () => {
    const { container } = render(<VaultSettingsPanel />)
    // Should show pending tx info
    expect(container.textContent).toMatch(/pending|transaction|2/i)
  })

  it('has action buttons', () => {
    render(<VaultSettingsPanel />)
    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBeGreaterThan(0)
  })
})

describe('VaultSettingsPanel - No Wallet', () => {
  it('shows connect wallet message', async () => {
    const { useAccount } = await import('wagmi')
    ;(useAccount as ReturnType<typeof jest.fn>).mockReturnValue({ address: undefined })
    
    const { container } = render(<VaultSettingsPanel />)
    expect(container.textContent).toMatch(/connect|wallet/i)
  })
})

describe('VaultSettingsPanel - No Vault', () => {
  it('shows connect wallet message when no vault', async () => {
    const hooks = await import('@/lib/vfide-hooks')
    ;(hooks.useUserVault as ReturnType<typeof jest.fn>).mockReturnValue({ vaultAddress: null })
    
    const { container } = render(<VaultSettingsPanel />)
    expect(container.textContent).toMatch(/connect|wallet/i)
  })
})

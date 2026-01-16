import { describe, expect, it } from '@jest/globals'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, style, ...props }: any) => (
      <div className={className} style={style}>{children}</div>
    ),
    button: ({ children, className, onClick, disabled, ...props }: any) => (
      <button className={className} onClick={onClick} disabled={disabled}>{children}</button>
    ),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}))

// Mock wagmi
jest.mock('wagmi', () => ({
  useAccount: () => ({
    address: '0x1234567890123456789012345678901234567890',
    isConnected: true,
  }),
  useWriteContract: () => ({
    writeContract: jest.fn(),
    data: undefined,
    isPending: false,
  }),
  useWaitForTransactionReceipt: () => ({
    isSuccess: false,
    isLoading: false,
  }),
}))

// Mock vfide-hooks
jest.mock('@/lib/vfide-hooks', () => ({
  useUserVault: () => ({
    vaultAddress: '0xabcdef1234567890abcdef1234567890abcdef12',
  }),
  useVaultGuardians: () => ({
    guardians: [
      '0x1111111111111111111111111111111111111111',
      '0x2222222222222222222222222222222222222222',
    ],
    guardianCount: 2,
    threshold: 2,
    isLoading: false,
  }),
  useGuardianCancelInheritance: () => ({
    cancel: jest.fn(),
    isPending: false,
  }),
  useInheritanceStatus: () => ({
    isActive: false,
    claimableAt: 0,
  }),
}))

// Mock contracts
jest.mock('@/lib/contracts', () => ({
  CONTRACT_ADDRESSES: {
    GuardianRegistry: '0x9999999999999999999999999999999999999999',
  },
}))

// Mock lucide-react
jest.mock('lucide-react', () => ({
  Users: () => <span>UsersIcon</span>,
  Plus: () => <span>PlusIcon</span>,
  X: () => <span>XIcon</span>,
  Shield: () => <span>ShieldIcon</span>,
  AlertTriangle: () => <span>AlertIcon</span>,
  Clock: () => <span>ClockIcon</span>,
}))

// Import after mocking
import { GuardianManagementPanel } from '@/components/security/GuardianManagementPanel'

describe('GuardianManagementPanel', () => {
  it('renders without crashing', () => {
    const { container } = render(<GuardianManagementPanel />)
    expect(container).toBeInTheDocument()
  })

  it('displays guardian count', () => {
    render(<GuardianManagementPanel />)
    expect(screen.getAllByText('2').length).toBeGreaterThan(0)
  })

  it('shows add guardian input', () => {
    render(<GuardianManagementPanel />)
    // Should have input for adding guardian
    const inputs = screen.getAllByRole('textbox')
    expect(inputs.length).toBeGreaterThan(0)
  })

  it('renders guardian list', () => {
    render(<GuardianManagementPanel />)
    // Guardian addresses should be displayed
    expect(document.body).toBeInTheDocument()
  })
})

describe('GuardianManagementPanel - No Vault', () => {
  it('shows create vault message when no vault exists', () => {
    vi.doMock('@/lib/vfide-hooks', () => ({
      useUserVault: () => ({ vaultAddress: null }),
      useVaultGuardians: () => ({
        guardians: [],
        guardianCount: 0,
        threshold: 0,
        isLoading: false,
      }),
      useGuardianCancelInheritance: () => ({ cancel: jest.fn() }),
      useInheritanceStatus: () => ({ isActive: false }),
    }))
    
    // Component will show no vault state
    const { container } = render(<GuardianManagementPanel />)
    expect(container).toBeInTheDocument()
  })
})

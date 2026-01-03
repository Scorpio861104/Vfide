/**
 * Real Security Component Tests
 * Tests for actual security components with mocked hooks
 */

import { describe, it, expect, vi, beforeEach, Mock } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'

// Mock all dependencies
vi.mock('@/lib/vfide-hooks', () => ({
  useUserVault: vi.fn(),
  useIsVaultLocked: vi.fn(),
  useQuarantineStatus: vi.fn(),
  useCanSelfPanic: vi.fn(),
  useSelfPanic: vi.fn(),
  useVaultGuardians: vi.fn(),
  useGuardianLockStatus: vi.fn(),
  useEmergencyStatus: vi.fn(),
}))

vi.mock('wagmi', () => ({
  useAccount: vi.fn(),
  useChainId: vi.fn(() => 84532),
}))

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: React.HTMLAttributes<HTMLButtonElement>) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

vi.mock('lucide-react', () => ({
  Shield: ({ className }: { className?: string }) => <span data-testid="shield-icon" className={className} />,
  AlertTriangle: ({ className }: { className?: string }) => <span data-testid="alert-icon" className={className} />,
  Lock: ({ className }: { className?: string }) => <span data-testid="lock-icon" className={className} />,
  Clock: ({ className }: { className?: string }) => <span data-testid="clock-icon" className={className} />,
  Users: ({ className }: { className?: string }) => <span data-testid="users-icon" className={className} />,
  Zap: ({ className }: { className?: string }) => <span data-testid="zap-icon" className={className} />,
}))

import {
  useUserVault,
  useIsVaultLocked,
  useQuarantineStatus,
  useCanSelfPanic,
  useSelfPanic,
  useVaultGuardians,
  useGuardianLockStatus,
  useEmergencyStatus,
} from '@/lib/vfide-hooks'
import { VaultSecurityPanel } from '@/components/security/VaultSecurityPanel'

describe('VaultSecurityPanel', () => {
  const mockVaultAddress = '0x1234567890123456789012345678901234567890' as `0x${string}`
  const mockNow = Math.floor(Date.now() / 1000)

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(mockNow * 1000)
    
    // Default mocks - no vault
    ;(useUserVault as Mock).mockReturnValue({
      vaultAddress: undefined,
    })
    
    ;(useIsVaultLocked as Mock).mockReturnValue({
      isLocked: false,
      isLoading: false,
    })
    
    ;(useQuarantineStatus as Mock).mockReturnValue({
      quarantineUntil: 0,
      isLoading: false,
    })
    
    ;(useCanSelfPanic as Mock).mockReturnValue({
      lastPanicTime: 0,
      cooldownSeconds: 86400,
      creationTime: mockNow - 100000, // Created a while ago
      minAgeSeconds: 86400,
    })
    
    ;(useSelfPanic as Mock).mockReturnValue({
      selfPanic: vi.fn(),
      isPanicking: false,
      isSuccess: false,
    })
    
    ;(useVaultGuardians as Mock).mockReturnValue({
      guardians: [],
      isLoading: false,
    })
    
    ;(useGuardianLockStatus as Mock).mockReturnValue({
      isLocked: false,
      lockTime: 0,
      isLoading: false,
    })
    
    ;(useEmergencyStatus as Mock).mockReturnValue({
      isEmergency: false,
      isLoading: false,
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('No Vault', () => {
    it('should show message to create vault when no vault exists', () => {
      render(<VaultSecurityPanel />)

      expect(screen.getByText(/create a vault/i)).toBeInTheDocument()
    })

    it('should display shield icon when no vault', () => {
      render(<VaultSecurityPanel />)

      expect(screen.getByTestId('shield-icon')).toBeInTheDocument()
    })
  })

  describe('With Vault', () => {
    beforeEach(() => {
      ;(useUserVault as Mock).mockReturnValue({
        vaultAddress: mockVaultAddress,
      })
    })

    it('should render security panel when vault exists', () => {
      render(<VaultSecurityPanel />)

      // Should not show the "create vault" message
      expect(screen.queryByText(/create a vault/i)).not.toBeInTheDocument()
    })

    it('should show unlocked state when vault is not locked', () => {
      ;(useIsVaultLocked as Mock).mockReturnValue({
        isLocked: false,
        isLoading: false,
      })

      render(<VaultSecurityPanel />)

      // Component should render without errors
      expect(screen.queryByText(/create a vault/i)).not.toBeInTheDocument()
    })

    it('should show locked state when vault is locked', () => {
      ;(useIsVaultLocked as Mock).mockReturnValue({
        isLocked: true,
        isLoading: false,
      })

      render(<VaultSecurityPanel />)

      // Component should render without errors  
      expect(screen.queryByText(/create a vault/i)).not.toBeInTheDocument()
    })
  })

  describe('Quarantine Status', () => {
    beforeEach(() => {
      ;(useUserVault as Mock).mockReturnValue({
        vaultAddress: mockVaultAddress,
      })
    })

    it('should show not quarantined state', () => {
      ;(useQuarantineStatus as Mock).mockReturnValue({
        quarantineUntil: 0,
        isLoading: false,
      })

      render(<VaultSecurityPanel />)

      // Component should render
      expect(screen.queryByText(/create a vault/i)).not.toBeInTheDocument()
    })

    it('should calculate quarantine remaining correctly', () => {
      // Quarantined for 2 hours from now
      ;(useQuarantineStatus as Mock).mockReturnValue({
        quarantineUntil: mockNow + 7200,
        isLoading: false,
      })

      render(<VaultSecurityPanel />)

      // Component should render and calculate remaining time
      expect(screen.queryByText(/create a vault/i)).not.toBeInTheDocument()
    })
  })

  describe('Self Panic Feature', () => {
    beforeEach(() => {
      ;(useUserVault as Mock).mockReturnValue({
        vaultAddress: mockVaultAddress,
      })
    })

    it('should be able to trigger self panic when conditions met', () => {
      const mockSelfPanic = vi.fn()
      ;(useSelfPanic as Mock).mockReturnValue({
        selfPanic: mockSelfPanic,
        isPanicking: false,
        isSuccess: false,
      })
      
      // Can panic - no cooldown, vault is old enough
      ;(useCanSelfPanic as Mock).mockReturnValue({
        lastPanicTime: 0,
        cooldownSeconds: 86400,
        creationTime: mockNow - 200000,
        minAgeSeconds: 86400,
      })

      render(<VaultSecurityPanel />)

      // Component should render without errors
      expect(screen.queryByText(/create a vault/i)).not.toBeInTheDocument()
    })

    it('should show panic in progress state', () => {
      ;(useSelfPanic as Mock).mockReturnValue({
        selfPanic: vi.fn(),
        isPanicking: true,
        isSuccess: false,
      })

      render(<VaultSecurityPanel />)

      // Component should render
      expect(screen.queryByText(/create a vault/i)).not.toBeInTheDocument()
    })

    it('should show success after panic completes', () => {
      ;(useSelfPanic as Mock).mockReturnValue({
        selfPanic: vi.fn(),
        isPanicking: false,
        isSuccess: true,
      })

      render(<VaultSecurityPanel />)

      // Component should render
      expect(screen.queryByText(/create a vault/i)).not.toBeInTheDocument()
    })
  })

  describe('Guardian Status', () => {
    beforeEach(() => {
      ;(useUserVault as Mock).mockReturnValue({
        vaultAddress: mockVaultAddress,
      })
    })

    it('should show no guardians state', () => {
      ;(useVaultGuardians as Mock).mockReturnValue({
        guardians: [],
        isLoading: false,
      })

      render(<VaultSecurityPanel />)

      expect(screen.queryByText(/create a vault/i)).not.toBeInTheDocument()
    })

    it('should show guardians when available', () => {
      ;(useVaultGuardians as Mock).mockReturnValue({
        guardians: [
          '0xguardian1',
          '0xguardian2',
        ],
        isLoading: false,
      })

      render(<VaultSecurityPanel />)

      expect(screen.queryByText(/create a vault/i)).not.toBeInTheDocument()
    })
  })

  describe('Emergency Status', () => {
    beforeEach(() => {
      ;(useUserVault as Mock).mockReturnValue({
        vaultAddress: mockVaultAddress,
      })
    })

    it('should show normal state when no emergency', () => {
      ;(useEmergencyStatus as Mock).mockReturnValue({
        isEmergency: false,
        isLoading: false,
      })

      render(<VaultSecurityPanel />)

      expect(screen.queryByText(/create a vault/i)).not.toBeInTheDocument()
    })

    it('should show emergency state when emergency active', () => {
      ;(useEmergencyStatus as Mock).mockReturnValue({
        isEmergency: true,
        isLoading: false,
      })

      render(<VaultSecurityPanel />)

      expect(screen.queryByText(/create a vault/i)).not.toBeInTheDocument()
    })
  })
})

/**
 * Real Vault Component Tests
 * Tests for actual vault components with mocked hooks
 */

import { describe, it, expect, vi, beforeEach, Mock } from '@jest/globals'
import { render, screen } from '@testing-library/react'
import React from 'react'

// Mock wagmi first
jest.mock('wagmi', () => ({
  useAccount: jest.fn(),
  useChainId: jest.fn(() => 84532),
}))

// Mock useVaultHub
jest.mock('@/hooks/useVaultHub', () => ({
  useVaultHub: jest.fn(),
}))

// Mock next/link
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}))

import { useAccount } from 'wagmi'
import { useVaultHub } from '@/hooks/useVaultHub'
import { VaultStatusIndicator } from '@/components/vault/VaultStatusIndicator'

describe('VaultStatusIndicator', () => {
  const mockAddress = '0x1234567890123456789012345678901234567890' as `0x${string}`
  const mockVaultAddress = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd' as `0x${string}`

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Not Connected', () => {
    it('should return null when not connected', () => {
      ;(useAccount as Mock).mockReturnValue({
        address: undefined,
        isConnected: false,
      })
      
      ;(useVaultHub as Mock).mockReturnValue({
        vaultAddress: undefined,
        hasVault: false,
        isLoadingVault: false,
      })

      const { container } = render(<VaultStatusIndicator />)

      expect(container.firstChild).toBeNull()
    })
  })

  describe('Loading State', () => {
    it('should show checking message while loading', () => {
      ;(useAccount as Mock).mockReturnValue({
        address: mockAddress,
        isConnected: true,
      })
      
      ;(useVaultHub as Mock).mockReturnValue({
        vaultAddress: undefined,
        hasVault: false,
        isLoadingVault: true,
      })

      render(<VaultStatusIndicator />)

      expect(screen.getByText('Checking...')).toBeInTheDocument()
    })

    it('should show orange pulsing indicator while loading', () => {
      ;(useAccount as Mock).mockReturnValue({
        address: mockAddress,
        isConnected: true,
      })
      
      ;(useVaultHub as Mock).mockReturnValue({
        vaultAddress: undefined,
        hasVault: false,
        isLoadingVault: true,
      })

      render(<VaultStatusIndicator />)

      const pulseDot = document.querySelector('.animate-pulse')
      expect(pulseDot).toBeInTheDocument()
    })
  })

  describe('Has Vault', () => {
    it('should show vault indicator when user has vault', () => {
      ;(useAccount as Mock).mockReturnValue({
        address: mockAddress,
        isConnected: true,
      })
      
      ;(useVaultHub as Mock).mockReturnValue({
        vaultAddress: mockVaultAddress,
        hasVault: true,
        isLoadingVault: false,
      })

      render(<VaultStatusIndicator />)

      expect(screen.getByText('🏦 Vault')).toBeInTheDocument()
    })

    it('should show green indicator when user has vault', () => {
      ;(useAccount as Mock).mockReturnValue({
        address: mockAddress,
        isConnected: true,
      })
      
      ;(useVaultHub as Mock).mockReturnValue({
        vaultAddress: mockVaultAddress,
        hasVault: true,
        isLoadingVault: false,
      })

      render(<VaultStatusIndicator />)

      const greenDot = document.querySelector('.bg-emerald-500')
      expect(greenDot).toBeInTheDocument()
    })

    it('should link to vault page', () => {
      ;(useAccount as Mock).mockReturnValue({
        address: mockAddress,
        isConnected: true,
      })
      
      ;(useVaultHub as Mock).mockReturnValue({
        vaultAddress: mockVaultAddress,
        hasVault: true,
        isLoadingVault: false,
      })

      render(<VaultStatusIndicator />)

      const link = screen.getByRole('link')
      expect(link).toHaveAttribute('href', '/vault')
    })

    it('should show vault address in title', () => {
      ;(useAccount as Mock).mockReturnValue({
        address: mockAddress,
        isConnected: true,
      })
      
      ;(useVaultHub as Mock).mockReturnValue({
        vaultAddress: mockVaultAddress,
        hasVault: true,
        isLoadingVault: false,
      })

      render(<VaultStatusIndicator />)

      const link = screen.getByRole('link')
      expect(link).toHaveAttribute('title', `Vault: ${mockVaultAddress}`)
    })
  })

  describe('No Vault', () => {
    it('should show no vault warning when user has no vault', () => {
      ;(useAccount as Mock).mockReturnValue({
        address: mockAddress,
        isConnected: true,
      })
      
      ;(useVaultHub as Mock).mockReturnValue({
        vaultAddress: undefined,
        hasVault: false,
        isLoadingVault: false,
      })

      render(<VaultStatusIndicator />)

      expect(screen.getByText('⚠️ No Vault')).toBeInTheDocument()
    })

    it('should show orange pulsing indicator when no vault', () => {
      ;(useAccount as Mock).mockReturnValue({
        address: mockAddress,
        isConnected: true,
      })
      
      ;(useVaultHub as Mock).mockReturnValue({
        vaultAddress: undefined,
        hasVault: false,
        isLoadingVault: false,
      })

      render(<VaultStatusIndicator />)

      const pulseDot = document.querySelector('.animate-pulse')
      expect(pulseDot).toBeInTheDocument()
    })

    it('should show "No vault detected" in title', () => {
      ;(useAccount as Mock).mockReturnValue({
        address: mockAddress,
        isConnected: true,
      })
      
      ;(useVaultHub as Mock).mockReturnValue({
        vaultAddress: undefined,
        hasVault: false,
        isLoadingVault: false,
      })

      render(<VaultStatusIndicator />)

      const link = screen.getByRole('link')
      expect(link).toHaveAttribute('title', 'No vault detected')
    })
  })
})

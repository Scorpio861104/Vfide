/**
 * Real Vault Component Tests
 * Tests for actual vault components with mocked hooks
 */

import { describe, it, expect, vi, beforeEach, Mock } from '@jest/globals'
import { render, screen } from '@testing-library/react'
import React from 'react'

// Mock wagmi first
jest.mock('wagmi', () => ({ /* CANONICAL_WAGMI_MOCK */
  useAccount: jest.fn(() => ({ address: undefined, isConnected: false, status: 'disconnected' })),
  useChainId: jest.fn(() => 84532),
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
  WagmiProvider: ({ children }) => children,
  createConfig: jest.fn(() => ({})),
  http: jest.fn(() => ({})),
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

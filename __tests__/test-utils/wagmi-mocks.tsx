/**
 * Test utilities for mocking wagmi and wallet connections
 */

import React, { ReactNode } from 'react'
import { vi } from 'vitest'

// ============================================
// MOCK DATA
// ============================================

export const MOCK_ADDRESSES = {
  user: '0x1234567890123456789012345678901234567890' as const,
  vault: '0xABCDEF1234567890ABCDEF1234567890ABCDEF12' as const,
  merchant: '0x9876543210987654321098765432109876543210' as const,
  token: '0xVFIDETOKEN1234567890VFIDETOKEN12345678' as const,
  zero: '0x0000000000000000000000000000000000000000' as const,
}

export const MOCK_TX_HASH = '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890' as const

// ============================================
// WAGMI MOCK FACTORY
// ============================================

export interface MockWagmiConfig {
  isConnected?: boolean
  address?: `0x${string}`
  chainId?: number
  readContractData?: unknown
  isReadLoading?: boolean
  readError?: Error | null
  writeContractData?: `0x${string}`
  isWritePending?: boolean
  isConfirming?: boolean
  isSuccess?: boolean
}

export function createWagmiMocks(config: MockWagmiConfig = {}) {
  const {
    isConnected = true,
    address = MOCK_ADDRESSES.user,
    chainId = 84532, // Base Sepolia
    readContractData = undefined,
    isReadLoading = false,
    readError = null,
    writeContractData = undefined,
    isWritePending = false,
    isConfirming = false,
    isSuccess = false,
  } = config

  return {
    useAccount: vi.fn(() => ({
      address: isConnected ? address : undefined,
      isConnected,
      isConnecting: false,
      isDisconnected: !isConnected,
      connector: isConnected ? { id: 'mock', name: 'Mock Wallet' } : undefined,
    })),

    useChainId: vi.fn(() => chainId),

    useReadContract: vi.fn(() => ({
      data: readContractData,
      isLoading: isReadLoading,
      error: readError,
      refetch: vi.fn().mockResolvedValue({ data: readContractData }),
      isSuccess: !isReadLoading && !readError && readContractData !== undefined,
      isFetching: false,
    })),

    useWriteContract: vi.fn(() => ({
      writeContract: vi.fn(),
      writeContractAsync: vi.fn().mockResolvedValue(writeContractData || MOCK_TX_HASH),
      data: writeContractData,
      isPending: isWritePending,
      error: null,
      reset: vi.fn(),
    })),

    useWaitForTransactionReceipt: vi.fn(() => ({
      isLoading: isConfirming,
      isSuccess,
      data: isSuccess ? { status: 'success', transactionHash: writeContractData || MOCK_TX_HASH } : undefined,
    })),

    useBalance: vi.fn(() => ({
      data: { value: BigInt('1000000000000000000'), formatted: '1.0', symbol: 'ETH' },
      isLoading: false,
    })),

    useConnect: vi.fn(() => ({
      connect: vi.fn(),
      connectors: [{ id: 'mock', name: 'Mock Wallet' }],
      isPending: false,
      error: null,
    })),

    useDisconnect: vi.fn(() => ({
      disconnect: vi.fn(),
      isPending: false,
    })),

    useSwitchChain: vi.fn(() => ({
      switchChain: vi.fn(),
      isPending: false,
      error: null,
    })),
  }
}

// ============================================
// TEST WRAPPER COMPONENT
// ============================================

export function TestWrapper({ children }: { children: ReactNode }) {
  return <>{children}</>
}

// ============================================
// COMMON MOCK SCENARIOS
// ============================================

export const MOCK_SCENARIOS = {
  // Wallet not connected
  disconnected: createWagmiMocks({ isConnected: false }),
  
  // Connected with no vault
  connectedNoVault: createWagmiMocks({
    isConnected: true,
    readContractData: MOCK_ADDRESSES.zero,
  }),
  
  // Connected with vault
  connectedWithVault: createWagmiMocks({
    isConnected: true,
    readContractData: MOCK_ADDRESSES.vault,
  }),
  
  // Loading state
  loading: createWagmiMocks({
    isConnected: true,
    isReadLoading: true,
  }),
  
  // Transaction pending
  txPending: createWagmiMocks({
    isConnected: true,
    isWritePending: true,
  }),
  
  // Transaction confirming
  txConfirming: createWagmiMocks({
    isConnected: true,
    isConfirming: true,
  }),
  
  // Transaction success
  txSuccess: createWagmiMocks({
    isConnected: true,
    isSuccess: true,
    writeContractData: MOCK_TX_HASH,
  }),
  
  // Read error
  readError: createWagmiMocks({
    isConnected: true,
    readError: new Error('Contract read failed'),
  }),
}

// ============================================
// MOCK CONTRACT RETURN DATA
// ============================================

export const MOCK_CONTRACT_DATA = {
  // Vault balance (1000 VFIDE in wei)
  vaultBalance: BigInt('1000000000000000000000'),
  
  // ProofScore (neutral: 5000 on 0-10000 scale)
  proofScoreNeutral: BigInt(5000),
  proofScoreHigh: BigInt(7500),
  proofScoreElite: BigInt(8500),
  proofScoreLow: BigInt(3500),
  
  // Merchant info tuple
  merchantInfo: [
    true,  // registered
    false, // suspended
    'Test Shop', // businessName
    'Retail', // category
    BigInt(1703980800), // registeredAt
    BigInt('50000000000000000000000'), // totalVolume (50000 VFIDE)
    BigInt(150), // txCount
  ] as const,
  
  // Non-merchant info
  nonMerchantInfo: [
    false, // registered
    false, // suspended
    '', // businessName
    '', // category
    BigInt(0), // registeredAt
    BigInt(0), // totalVolume
    BigInt(0), // txCount
  ] as const,
  
  // Customer trust score (Seer contract return)
  customerTrustScore: [
    BigInt(5000), // score
    false, // highTrust
    false, // lowTrust
    true,  // eligible
  ] as const,
}

// ============================================
// HELPER FUNCTIONS
// ============================================

export function mockWagmiModule(mocks: ReturnType<typeof createWagmiMocks>) {
  vi.mock('wagmi', () => mocks)
}

export function resetAllMocks() {
  vi.clearAllMocks()
  vi.resetAllMocks()
}

/**
 * Real VaultHub Hooks Tests
 * Tests for useVaultHub to increase coverage
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'

// Mock wagmi
const mockUseAccount = vi.fn()
const mockUseReadContract = vi.fn()
const mockUseWriteContract = vi.fn()
const mockUseChainId = vi.fn()

vi.mock('wagmi', () => ({
  useAccount: () => mockUseAccount(),
  useReadContract: (args: unknown) => mockUseReadContract(args),
  useWriteContract: () => mockUseWriteContract(),
  useChainId: () => mockUseChainId(),
}))

// Mock viem
vi.mock('viem', () => ({
  isAddress: (addr: string) => addr && addr.startsWith('0x') && addr.length === 42,
}))

// Mock contracts
vi.mock('../../lib/contracts', () => ({
  VAULT_HUB_ABI: [],
}))

// Mock utils
vi.mock('../../lib/utils', () => ({
  devLog: {
    error: vi.fn(),
    log: vi.fn(),
    warn: vi.fn(),
  },
}))

// Mock testnet
vi.mock('../../lib/testnet', () => ({
  IS_TESTNET: true,
  CURRENT_CHAIN_ID: 84532,
}))

// Import hooks after mocks
import { useVaultHub } from '../../hooks/useVaultHub'

describe('useVaultHub', () => {
  const mockWriteContractAsync = vi.fn()
  const mockRefetch = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAccount.mockReturnValue({ address: '0xuser123456789012345678901234567890123456' })
    mockUseChainId.mockReturnValue(84532)
    mockUseWriteContract.mockReturnValue({
      writeContractAsync: mockWriteContractAsync,
      isPending: false,
    })
    mockUseReadContract.mockReturnValue({
      data: undefined,
      isLoading: false,
      refetch: mockRefetch,
    })
  })

  it('returns hasVault false when no vault', () => {
    mockUseReadContract.mockImplementation(({ functionName }) => {
      if (functionName === 'vaultOf') return { data: '0x0000000000000000000000000000000000000000', isLoading: false, refetch: mockRefetch }
      if (functionName === 'vfideToken') return { data: '0x1234567890123456789012345678901234567890' }
      return { data: undefined }
    })
    
    const { result } = renderHook(() => useVaultHub())
    
    expect(result.current.hasVault).toBe(false)
  })

  it('returns hasVault true when vault exists', () => {
    mockUseReadContract.mockImplementation(({ functionName }) => {
      if (functionName === 'vaultOf') return { data: '0x1234567890123456789012345678901234567890', isLoading: false, refetch: mockRefetch }
      if (functionName === 'vfideToken') return { data: '0x1234567890123456789012345678901234567890' }
      return { data: undefined }
    })
    
    const { result } = renderHook(() => useVaultHub())
    
    expect(result.current.hasVault).toBe(true)
  })

  it('returns vaultAddress when vault exists', () => {
    mockUseReadContract.mockImplementation(({ functionName }) => {
      if (functionName === 'vaultOf') return { data: '0x1234567890123456789012345678901234567890', isLoading: false, refetch: mockRefetch }
      if (functionName === 'vfideToken') return { data: '0x1234567890123456789012345678901234567890' }
      return { data: undefined }
    })
    
    const { result } = renderHook(() => useVaultHub())
    
    expect(result.current.vaultAddress).toBe('0x1234567890123456789012345678901234567890')
  })

  it('returns undefined vaultAddress when no vault', () => {
    mockUseReadContract.mockImplementation(({ functionName }) => {
      if (functionName === 'vaultOf') return { data: undefined, isLoading: false, refetch: mockRefetch }
      if (functionName === 'vfideToken') return { data: '0x1234567890123456789012345678901234567890' }
      return { data: undefined }
    })
    
    const { result } = renderHook(() => useVaultHub())
    
    expect(result.current.vaultAddress).toBeUndefined()
  })

  it('returns isLoadingVault state', () => {
    mockUseReadContract.mockImplementation(({ functionName }) => {
      if (functionName === 'vaultOf') return { data: undefined, isLoading: true, refetch: mockRefetch }
      if (functionName === 'vfideToken') return { data: '0x1234567890123456789012345678901234567890' }
      return { data: undefined }
    })
    
    const { result } = renderHook(() => useVaultHub())
    
    expect(result.current.isLoadingVault).toBe(true)
  })

  it('returns isCreatingVault state', () => {
    mockUseWriteContract.mockReturnValue({
      writeContractAsync: mockWriteContractAsync,
      isPending: true,
    })
    
    const { result } = renderHook(() => useVaultHub())
    
    expect(result.current.isCreatingVault).toBe(true)
  })

  it('provides createVault function', () => {
    const { result } = renderHook(() => useVaultHub())
    
    expect(typeof result.current.createVault).toBe('function')
  })

  it('provides refetchVault function', () => {
    mockUseReadContract.mockImplementation(({ functionName }) => {
      if (functionName === 'vaultOf') return { data: undefined, isLoading: false, refetch: mockRefetch }
      if (functionName === 'vfideToken') return { data: '0x1234567890123456789012345678901234567890' }
      return { data: undefined }
    })
    
    const { result } = renderHook(() => useVaultHub())
    
    expect(typeof result.current.refetchVault).toBe('function')
  })

  it('returns isOnCorrectChain true when on expected chain', () => {
    mockUseChainId.mockReturnValue(84532)
    
    const { result } = renderHook(() => useVaultHub())
    
    expect(result.current.isOnCorrectChain).toBe(true)
  })

  it('returns isOnCorrectChain false when on wrong chain', () => {
    mockUseChainId.mockReturnValue(1) // Mainnet
    
    const { result } = renderHook(() => useVaultHub())
    
    expect(result.current.isOnCorrectChain).toBe(false)
  })

  it('returns expectedChainId', () => {
    const { result } = renderHook(() => useVaultHub())
    
    expect(result.current.expectedChainId).toBe(84532)
  })

  it('returns expectedChainName', () => {
    const { result } = renderHook(() => useVaultHub())
    
    expect(result.current.expectedChainName).toBe('Base Sepolia')
  })

  it('returns isContractConfigured true when vfideToken is set', () => {
    mockUseReadContract.mockImplementation(({ functionName }) => {
      if (functionName === 'vaultOf') return { data: undefined, isLoading: false, refetch: mockRefetch }
      if (functionName === 'vfideToken') return { data: '0x1234567890123456789012345678901234567890' }
      return { data: undefined }
    })
    
    const { result } = renderHook(() => useVaultHub())
    
    expect(result.current.isContractConfigured).toBe(true)
  })

  it('returns isContractConfigured false when vfideToken is zero', () => {
    mockUseReadContract.mockImplementation(({ functionName }) => {
      if (functionName === 'vaultOf') return { data: undefined, isLoading: false, refetch: mockRefetch }
      if (functionName === 'vfideToken') return { data: '0x0000000000000000000000000000000000000000' }
      return { data: undefined }
    })
    
    const { result } = renderHook(() => useVaultHub())
    
    expect(result.current.isContractConfigured).toBe(false)
  })
})

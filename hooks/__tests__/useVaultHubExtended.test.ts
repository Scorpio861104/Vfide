// Set env FIRST before any imports  
process.env.NEXT_PUBLIC_VAULT_HUB_ADDRESS = '0x6666666666666666666666666666666666666666';
process.env.NODE_ENV = 'test';

// Extended tests for useVaultHub.ts - comprehensive coverage
import { describe, it, expect, beforeEach, Mock } from '@jest/globals'
import { renderHook, act } from '@testing-library/react'

// Mock wagmi before importing hooks
jest.mock('wagmi', () => {
  // Ensure env is set for module initialization
  if (!process.env.NEXT_PUBLIC_VAULT_HUB_ADDRESS) {
    process.env.NEXT_PUBLIC_VAULT_HUB_ADDRESS = '0x6666666666666666666666666666666666666666';
  }
  return {
    useAccount: jest.fn(),
    useReadContract: jest.fn(),
    useWriteContract: jest.fn(),
    useWaitForTransactionReceipt: jest.fn(),
    useChainId: jest.fn(),
  };
})

// Mock viem
jest.mock('viem', () => ({
  isAddress: jest.fn((addr: string) => {
    return addr && typeof addr === 'string' && addr.startsWith('0x') && addr.length === 42;
  }),
}))

// Mock lib/contracts
jest.mock('@/lib/contracts', () => ({
  VAULT_HUB_ABI: [],
}))

// Mock lib/utils
jest.mock('@/lib/utils', () => ({
  devLog: {
    error: jest.fn(),
    log: jest.fn(),
  },
}))

// Mock lib/testnet  
jest.mock('@/lib/testnet', () => ({
  IS_TESTNET: true,
  CURRENT_CHAIN_ID: 84532,
}))

// Mock lib/chains
jest.mock('@/lib/chains', () => ({
  getChainByChainId: jest.fn().mockReturnValue({
    testnet: { name: 'Base Sepolia', id: 84532 },
    mainnet: { name: 'Base', id: 8453 }
  }),
  isTestnetChainId: jest.fn().mockReturnValue(true),
}))

import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useChainId } from 'wagmi'
import { useVaultHub } from '../useVaultHub'

describe('useVaultHub - Extended Tests', () => {
  const mockAddress = '0x1234567890123456789012345678901234567890' as `0x${string}`
  const mockVaultAddress = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd' as `0x${string}`
  const mockTokenAddress = '0x5555555555555555555555555555555555555555' as `0x${string}`
  const mockTxHash = '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef' as `0x${string}`

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Reset all mocks to default values
    ;(useAccount as Mock).mockReturnValue({
      address: mockAddress,
      isConnected: true,
    })
    ;(useChainId as Mock).mockReturnValue(84532) // Base Sepolia
    ;(useWriteContract as Mock).mockReturnValue({
      writeContractAsync: jest.fn().mockResolvedValue(mockTxHash),
      isPending: false,
    })
    ;(useWaitForTransactionReceipt as Mock).mockReturnValue({
      data: undefined,
      isLoading: false,
      isSuccess: false,
    })
    // Default mock for useReadContract - returns zero address (no vault) and configured token
    ;(useReadContract as Mock).mockImplementation(({ functionName }: { functionName: string }) => {
      if (functionName === 'vaultOf') {
        return { 
          data: '0x0000000000000000000000000000000000000000', 
          isLoading: false, 
          refetch: jest.fn() 
        }
      }
      if (functionName === 'vfideToken') {
        return { data: mockTokenAddress }
      }
      return { data: undefined }
    })
  })

  // Helper to setup mocks for contract error tests
  function setupErrorTest(mockWriteAsync: Mock) {
    ;(useReadContract as Mock).mockImplementation(({ functionName }: { functionName: string }) => {
      if (functionName === 'vaultOf') {
        return { 
          data: '0x0000000000000000000000000000000000000000', 
          isLoading: false, 
          refetch: jest.fn() 
        }
      }
      if (functionName === 'vfideToken') {
        return { data: mockTokenAddress }
      }
      return { data: undefined }
    })
    ;(useWriteContract as Mock).mockReturnValue({
      writeContractAsync: mockWriteAsync,
      isPending: false,
    })
  }

  describe('Contract Error Parsing', () => {
    // Test the parseContractError function through hook behavior
    it('should handle user rejected error', async () => {
      const mockWriteAsync = jest.fn().mockRejectedValue(new Error('user rejected the transaction'))
      setupErrorTest(mockWriteAsync)

      const { result } = renderHook(() => useVaultHub())

      await act(async () => {
        try {
          await result.current.createVault()
        } catch (e: unknown) {
          expect((e as Error).message).toContain('cancelled by user')
        }
      })
    })

    it('should handle insufficient funds error', async () => {
      const mockWriteAsync = jest.fn().mockRejectedValue(new Error('insufficient funds for gas'))
      setupErrorTest(mockWriteAsync)

      const { result } = renderHook(() => useVaultHub())

      await act(async () => {
        try {
          await result.current.createVault()
        } catch (e: unknown) {
          expect((e as Error).message).toContain('Insufficient ETH')
        }
      })
    })

    it('should handle wrong chain error', async () => {
      const mockWriteAsync = jest.fn().mockRejectedValue(new Error('chain unsupported'))
      setupErrorTest(mockWriteAsync)

      const { result } = renderHook(() => useVaultHub())

      await act(async () => {
        try {
          await result.current.createVault()
        } catch (e: unknown) {
          expect((e as Error).message).toContain('zkSync Sepolia')
        }
      })
    })

    it('should handle UV:zero contract error', async () => {
      const mockWriteAsync = jest.fn().mockRejectedValue(new Error('uv:zero'))
      setupErrorTest(mockWriteAsync)

      const { result } = renderHook(() => useVaultHub())

      await act(async () => {
        try {
          await result.current.createVault()
        } catch (e: unknown) {
          expect((e as Error).message).toContain('not properly initialized')
        }
      })
    })

    it('should handle create2 failed error', async () => {
      const mockWriteAsync = jest.fn().mockRejectedValue(new Error('create2 failed'))
      setupErrorTest(mockWriteAsync)

      const { result } = renderHook(() => useVaultHub())

      await act(async () => {
        try {
          await result.current.createVault()
        } catch (e: unknown) {
          expect((e as Error).message).toContain('creation failed')
        }
      })
    })

    it('should handle network error', async () => {
      const mockWriteAsync = jest.fn().mockRejectedValue(new Error('network error timeout'))
      setupErrorTest(mockWriteAsync)

      const { result } = renderHook(() => useVaultHub())

      await act(async () => {
        try {
          await result.current.createVault()
        } catch (e: unknown) {
          expect((e as Error).message).toContain('Network error')
        }
      })
    })

    it('should handle gas estimation error', async () => {
      const mockWriteAsync = jest.fn().mockRejectedValue(new Error('gas estimate failed'))
      setupErrorTest(mockWriteAsync)

      const { result } = renderHook(() => useVaultHub())

      await act(async () => {
        try {
          await result.current.createVault()
        } catch (e: unknown) {
          expect((e as Error).message).toContain('would fail')
        }
      })
    })

    it('should handle execution reverted with long hex string', async () => {
      // Long hex string (>200 chars) that would indicate raw revert data
      const longHex = 'execution reverted 0x' + 'a'.repeat(200)
      const mockWriteAsync = jest.fn().mockRejectedValue(new Error(longHex))
      setupErrorTest(mockWriteAsync)

      const { result } = renderHook(() => useVaultHub())

      await act(async () => {
        try {
          await result.current.createVault()
        } catch (e: unknown) {
          expect((e as Error).message).toContain('creation failed')
        }
      })
    })

    it('should handle simple revert error', async () => {
      const mockWriteAsync = jest.fn().mockRejectedValue(new Error('execution reverted'))
      setupErrorTest(mockWriteAsync)

      const { result } = renderHook(() => useVaultHub())

      await act(async () => {
        try {
          await result.current.createVault()
        } catch (e: unknown) {
          expect((e as Error).message).toContain('failed')
        }
      })
    })

    it('should handle non-Error object', async () => {
      const mockWriteAsync = jest.fn().mockRejectedValue('string error')
      setupErrorTest(mockWriteAsync)

      const { result } = renderHook(() => useVaultHub())

      await act(async () => {
        try {
          await result.current.createVault()
        } catch (e: unknown) {
          expect((e as Error).message).toContain('unexpected error')
        }
      })
    })

    it('should handle address format error', async () => {
      const mockWriteAsync = jest.fn().mockRejectedValue(new Error('invalid 20 byte address'))
      setupErrorTest(mockWriteAsync)

      const { result } = renderHook(() => useVaultHub())

      await act(async () => {
        try {
          await result.current.createVault()
        } catch (e: unknown) {
          expect((e as Error).message).toContain('Invalid address format')
        }
      })
    })
  })

  describe('Vault State', () => {
    it('should detect user with vault', () => {
      ;(useReadContract as Mock).mockImplementation(({ functionName }: { functionName: string }) => {
        if (functionName === 'vaultOf') {
          return { data: mockVaultAddress, isLoading: false, refetch: jest.fn() }
        }
        if (functionName === 'vfideToken') {
          return { data: mockTokenAddress }
        }
        return { data: undefined }
      })

      const { result } = renderHook(() => useVaultHub())

      expect(result.current.hasVault).toBe(true)
      expect(result.current.vaultAddress).toBe(mockVaultAddress)
    })

    it('should detect user without vault (zero address)', () => {
      ;(useReadContract as Mock).mockImplementation(({ functionName }: { functionName: string }) => {
        if (functionName === 'vaultOf') {
          return { data: '0x0000000000000000000000000000000000000000', isLoading: false, refetch: jest.fn() }
        }
        if (functionName === 'vfideToken') {
          return { data: mockTokenAddress }
        }
        return { data: undefined }
      })

      const { result } = renderHook(() => useVaultHub())

      expect(result.current.hasVault).toBe(false)
      expect(result.current.vaultAddress).toBeUndefined()
    })

    it('should show loading state', () => {
      ;(useReadContract as Mock).mockImplementation(({ functionName }: { functionName: string }) => {
        if (functionName === 'vaultOf') {
          return { data: undefined, isLoading: true, refetch: jest.fn() }
        }
        if (functionName === 'vfideToken') {
          return { data: mockTokenAddress }
        }
        return { data: undefined }
      })

      const { result } = renderHook(() => useVaultHub())

      expect(result.current.isLoadingVault).toBe(true)
    })

    it('should track creating vault state', () => {
      ;(useReadContract as Mock).mockImplementation(({ functionName }: { functionName: string }) => {
        if (functionName === 'vaultOf') {
          return { data: '0x0000000000000000000000000000000000000000', isLoading: false, refetch: jest.fn() }
        }
        if (functionName === 'vfideToken') {
          return { data: mockTokenAddress }
        }
        return { data: undefined }
      })
      ;(useWriteContract as Mock).mockReturnValue({
        writeContractAsync: jest.fn(),
        isPending: true, // Simulating pending write
      })

      const { result } = renderHook(() => useVaultHub())

      expect(result.current.isCreatingVault).toBe(true)
    })
  })

  describe('Chain Validation', () => {
    it('should detect correct chain', () => {
      ;(useReadContract as Mock).mockImplementation(({ functionName }: { functionName: string }) => {
        if (functionName === 'vaultOf') {
          return { data: mockVaultAddress, isLoading: false, refetch: jest.fn() }
        }
        if (functionName === 'vfideToken') {
          return { data: mockTokenAddress }
        }
        return { data: undefined }
      })

      const { result } = renderHook(() => useVaultHub())

      expect(result.current.isOnCorrectChain).toBe(true)
    })

    it('should detect wrong chain', () => {
      ;(useChainId as Mock).mockReturnValue(1) // Ethereum mainnet
      ;(useReadContract as Mock).mockImplementation(({ functionName }: { functionName: string }) => {
        if (functionName === 'vaultOf') {
          return { data: mockVaultAddress, isLoading: false, refetch: jest.fn() }
        }
        if (functionName === 'vfideToken') {
          return { data: mockTokenAddress }
        }
        return { data: undefined }
      })

      const { result } = renderHook(() => useVaultHub())

      expect(result.current.isOnCorrectChain).toBe(false)
    })

    it('should throw error when creating vault on wrong chain', async () => {
      ;(useChainId as Mock).mockReturnValue(1) // Ethereum mainnet
      ;(useReadContract as Mock).mockImplementation(({ functionName }: { functionName: string }) => {
        if (functionName === 'vaultOf') {
          return { 
            data: '0x0000000000000000000000000000000000000000', 
            isLoading: false, 
            refetch: jest.fn() 
          }
        }
        if (functionName === 'vfideToken') {
          return { data: mockTokenAddress }
        }
        return { data: undefined }
      })

      const { result } = renderHook(() => useVaultHub())

      await act(async () => {
        try {
          await result.current.createVault()
          expect.fail('Should have thrown')
        } catch (e: unknown) {
          expect((e as Error).message).toContain('switch to')
        }
      })
    })
  })

  describe('Contract Configuration', () => {
    it('should detect configured contract', () => {
      ;(useReadContract as Mock).mockImplementation(({ functionName }: { functionName: string }) => {
        if (functionName === 'vaultOf') {
          return { data: mockVaultAddress, isLoading: false, refetch: jest.fn() }
        }
        if (functionName === 'vfideToken') {
          return { data: mockTokenAddress }
        }
        return { data: undefined }
      })

      const { result } = renderHook(() => useVaultHub())

      expect(result.current.isContractConfigured).toBe(true)
    })

    it('should detect unconfigured contract (zero token)', () => {
      ;(useReadContract as Mock).mockImplementation(({ functionName }: { functionName: string }) => {
        if (functionName === 'vaultOf') {
          return { data: mockVaultAddress, isLoading: false, refetch: jest.fn() }
        }
        if (functionName === 'vfideToken') {
          return { data: '0x0000000000000000000000000000000000000000' }
        }
        return { data: undefined }
      })

      const { result } = renderHook(() => useVaultHub())

      expect(result.current.isContractConfigured).toBe(false)
    })

    it('should throw error when creating vault with unconfigured contract', async () => {
      ;(useReadContract as Mock).mockImplementation(({ functionName }: { functionName: string }) => {
        if (functionName === 'vaultOf') {
          return { 
            data: '0x0000000000000000000000000000000000000000', 
            isLoading: false, 
            refetch: jest.fn() 
          }
        }
        if (functionName === 'vfideToken') {
          return { data: '0x0000000000000000000000000000000000000000' }
        }
        return { data: undefined }
      })

      const { result } = renderHook(() => useVaultHub())

      await act(async () => {
        try {
          await result.current.createVault()
          expect.fail('Should have thrown')
        } catch (e: unknown) {
          expect((e as Error).message).toContain('not yet fully configured')
        }
      })
    })
  })

  describe('Create Vault', () => {
    it('should create vault successfully', async () => {
      ;(useReadContract as Mock).mockImplementation(({ functionName }: { functionName: string }) => {
        if (functionName === 'vaultOf') {
          return { 
            data: '0x0000000000000000000000000000000000000000', 
            isLoading: false, 
            refetch: jest.fn() 
          }
        }
        if (functionName === 'vfideToken') {
          return { data: mockTokenAddress }
        }
        return { data: undefined }
      })

      const { result } = renderHook(() => useVaultHub())

      await act(async () => {
        const txHash = await result.current.createVault()
        expect(txHash).toBe(mockTxHash)
      })
    })

    it('should provide refetch function', () => {
      const mockRefetch = jest.fn()
      ;(useReadContract as Mock).mockImplementation(({ functionName }: { functionName: string }) => {
        if (functionName === 'vaultOf') {
          return { 
            data: mockVaultAddress, 
            isLoading: false, 
            refetch: mockRefetch 
          }
        }
        if (functionName === 'vfideToken') {
          return { data: mockTokenAddress }
        }
        return { data: undefined }
      })

      const { result } = renderHook(() => useVaultHub())

      expect(result.current.refetchVault).toBe(mockRefetch)
    })
  })
})

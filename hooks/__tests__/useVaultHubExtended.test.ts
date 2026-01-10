// Extended tests for useVaultHub.ts - comprehensive coverage
import { describe, it, expect, vi, beforeEach, Mock } from '@jest/globals'
import { renderHook, act } from '@testing-library/react'

// Store original env
const originalEnv = process.env

// Mock wagmi before importing hooks
jest.mock('wagmi', () => ({
  useAccount: jest.fn(),
  useReadContract: jest.fn(),
  useWriteContract: jest.fn(),
  useChainId: jest.fn(),
}))

// Mock viem
jest.mock('viem', () => ({
  isAddress: (addr: string) => addr && addr.startsWith('0x') && addr.length === 42,
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

import { useAccount, useReadContract, useWriteContract, useChainId } from 'wagmi'

describe('useVaultHub - Extended Tests', () => {
  const mockAddress = '0x1234567890123456789012345678901234567890' as `0x${string}`
  const mockVaultAddress = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd' as `0x${string}`
  const mockTokenAddress = '0x5555555555555555555555555555555555555555' as `0x${string}`
  const mockTxHash = '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef' as `0x${string}`

  beforeEach(() => {
    jest.clearAllMocks()
    // Reset env
    process.env = { ...originalEnv, NEXT_PUBLIC_VAULT_HUB_ADDRESS: '0x6666666666666666666666666666666666666666' }
    
    ;(useAccount as Mock).mockReturnValue({
      address: mockAddress,
      isConnected: true,
    })
    ;(useChainId as Mock).mockReturnValue(84532) // Base Sepolia
    ;(useWriteContract as Mock).mockReturnValue({
      writeContractAsync: jest.fn().mockResolvedValue(mockTxHash),
      isPending: false,
    })
  })

  afterEach(() => {
    process.env = originalEnv
  })

  // We need to dynamically import the hook after setting up mocks
  async function getUseVaultHub() {
    // Clear the module cache to get fresh imports
    vi.resetModules()
    const vaultHubModule = await import('../useVaultHub')
    return vaultHubModule.useVaultHub
  }

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
        return { data: '0x5555555555555555555555555555555555555555' }
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
      const useVaultHub = await getUseVaultHub()
      
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
      const useVaultHub = await getUseVaultHub()
      
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
      const useVaultHub = await getUseVaultHub()
      
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
      const useVaultHub = await getUseVaultHub()
      
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
      const useVaultHub = await getUseVaultHub()
      
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
      const useVaultHub = await getUseVaultHub()
      
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
      const useVaultHub = await getUseVaultHub()
      
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
      const useVaultHub = await getUseVaultHub()
      
      // Long hex string (>200 chars) that would indicate raw revert data
      const longHexError = 'execution reverted 0x' + 'a'.repeat(200)
      const mockWriteAsync = jest.fn().mockRejectedValue(new Error(longHexError))
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
      const useVaultHub = await getUseVaultHub()
      
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
      const useVaultHub = await getUseVaultHub()
      
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
      const useVaultHub = await getUseVaultHub()
      
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
    it('should detect user with vault', async () => {
      const useVaultHub = await getUseVaultHub()
      
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

    it('should detect user without vault (zero address)', async () => {
      const useVaultHub = await getUseVaultHub()
      
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

      expect(result.current.hasVault).toBe(false)
    })

    it('should show loading state', async () => {
      const useVaultHub = await getUseVaultHub()
      
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

    it('should track creating vault state', async () => {
      const useVaultHub = await getUseVaultHub()
      
      ;(useReadContract as Mock).mockReturnValue({
        data: '0x0000000000000000000000000000000000000000',
        isLoading: false,
        refetch: jest.fn(),
      })
      ;(useWriteContract as Mock).mockReturnValue({
        writeContractAsync: jest.fn(),
        isPending: true,
      })

      const { result } = renderHook(() => useVaultHub())

      expect(result.current.isCreatingVault).toBe(true)
    })
  })

  describe('Chain Validation', () => {
    it('should detect correct chain', async () => {
      const useVaultHub = await getUseVaultHub()
      
      ;(useChainId as Mock).mockReturnValue(84532)
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

    it('should detect wrong chain', async () => {
      const useVaultHub = await getUseVaultHub()
      
      ;(useChainId as Mock).mockReturnValue(1) // Ethereum mainnet
      ;(useReadContract as Mock).mockReturnValue({
        data: undefined,
        isLoading: false,
        refetch: jest.fn(),
      })

      const { result } = renderHook(() => useVaultHub())

      expect(result.current.isOnCorrectChain).toBe(false)
    })

    it('should throw error when creating vault on wrong chain', async () => {
      const useVaultHub = await getUseVaultHub()
      
      ;(useChainId as Mock).mockReturnValue(1)
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
    it('should detect configured contract', async () => {
      const useVaultHub = await getUseVaultHub()
      
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

    it('should detect unconfigured contract (zero token)', async () => {
      const useVaultHub = await getUseVaultHub()
      
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
      const useVaultHub = await getUseVaultHub()
      
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
      const useVaultHub = await getUseVaultHub()
      
      const mockWriteAsync = jest.fn().mockResolvedValue(mockTxHash)
      ;(useWriteContract as Mock).mockReturnValue({
        writeContractAsync: mockWriteAsync,
        isPending: false,
      })
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

      expect(mockWriteAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          functionName: 'createVault',
          args: [],
        })
      )
    })

    it('should provide refetch function', async () => {
      const useVaultHub = await getUseVaultHub()
      
      const mockRefetch = jest.fn()
      ;(useReadContract as Mock).mockImplementation(({ functionName }: { functionName: string }) => {
        if (functionName === 'vaultOf') {
          return { data: mockVaultAddress, isLoading: false, refetch: mockRefetch }
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

// Extended tests for useVaultRegistry.ts - covering additional search and recovery functions
import { describe, it, expect, vi, beforeEach, Mock } from '@jest/globals'
import { renderHook, act } from '@testing-library/react'

// Mock wagmi before importing hooks
jest.mock('wagmi', () => ({
  useAccount: jest.fn(),
  useReadContract: jest.fn(),
  useWriteContract: jest.fn(),
  useWaitForTransactionReceipt: jest.fn(),
}))

// Mock viem
jest.mock('viem', () => ({
  keccak256: jest.fn((input: unknown) => '0x' + 'a'.repeat(64)),
  toBytes: jest.fn((input: string) => new Uint8Array([...input].map(c => c.charCodeAt(0)))),
  isAddress: jest.fn((value: string) => /^0x[a-fA-F0-9]{40}$/.test(value)),
}))

jest.mock('@/lib/contracts', () => ({
  CONTRACT_ADDRESSES: {
    VaultRegistry: '0x1234567890123456789012345678901234567890',
    VaultRecoveryClaim: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
  },
  VaultRegistryABI: [],
  isConfiguredContractAddress: (address?: string | null) =>
    typeof address === 'string' &&
    address !== '0x0000000000000000000000000000000000000000' &&
    address.startsWith('0x') &&
    address.length === 42,
}))

import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { CONTRACT_ADDRESSES } from '@/lib/contracts'
import {
  useSearchByRecoveryId,
  useSearchByEmail,
  useSearchByUsername,
  useSearchByGuardian,
  useVaultInfo,
  useSearchByWalletAddress,
  useSearchByVaultAddress,
  useSearchByCreationTime,
  useTotalVaults,
  useVaultByIndex,
  useSetRecoveryId,
  useSetEmailRecovery,
  useSetUsername,
  useIsRecoveryIdAvailable,
  useIsUsernameAvailable,
  useInitiateClaim,
  useGetClaim,
  useActiveClaimForVault,
  useGuardianVote,
  useChallengeClaim,
} from '../useVaultRegistry'

describe('useVaultRegistry - Extended Tests', () => {
  const mockAddress = '0x1234567890123456789012345678901234567890' as `0x${string}`
  const mockVaultAddress = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd' as `0x${string}`
  const mockTxHash = '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef' as `0x${string}`

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useAccount as Mock).mockReturnValue({
      address: mockAddress,
      isConnected: true,
    })
    ;(useWriteContract as Mock).mockReturnValue({
      writeContractAsync: jest.fn().mockResolvedValue(mockTxHash),
      data: undefined,
      isPending: false,
    })
    ;(useWaitForTransactionReceipt as Mock).mockReturnValue({
      isSuccess: false,
      isLoading: false,
    })
  })

  // ==================== useSearchByRecoveryId ====================
  describe('useSearchByRecoveryId', () => {
    it('should search vault by recovery ID', () => {
      ;(useReadContract as Mock).mockReturnValue({
        data: mockVaultAddress,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      })

      const { result } = renderHook(() => useSearchByRecoveryId('my-recovery-id'))

      expect(result.current.vault).toBe(mockVaultAddress)
      expect(result.current.isLoading).toBe(false)
    })

    it('should return undefined for empty recovery ID', () => {
      ;(useReadContract as Mock).mockReturnValue({
        data: undefined,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      })

      const { result } = renderHook(() => useSearchByRecoveryId(''))

      expect(result.current.vault).toBeUndefined()
    })
  })

  // ==================== useSearchByEmail ====================
  describe('useSearchByEmail', () => {
    it('should search vault by email', () => {
      ;(useReadContract as Mock).mockReturnValue({
        data: mockVaultAddress,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      })

      const { result } = renderHook(() => useSearchByEmail('test@example.com'))

      expect(result.current.vault).toBe(mockVaultAddress)
    })

    it('should handle empty email', () => {
      ;(useReadContract as Mock).mockReturnValue({
        data: undefined,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      })

      const { result } = renderHook(() => useSearchByEmail(''))

      expect(result.current.vault).toBeUndefined()
    })
  })

  // ==================== useSearchByUsername ====================
  describe('useSearchByUsername', () => {
    it('should search vault by username', () => {
      ;(useReadContract as Mock).mockReturnValue({
        data: mockVaultAddress,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      })

      const { result } = renderHook(() => useSearchByUsername('johndoe'))

      expect(result.current.vault).toBe(mockVaultAddress)
    })

    it('should handle empty username', () => {
      ;(useReadContract as Mock).mockReturnValue({
        data: undefined,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      })

      const { result } = renderHook(() => useSearchByUsername(''))

      expect(result.current.vault).toBeUndefined()
    })
  })

  // ==================== useSearchByGuardian ====================
  describe('useSearchByGuardian', () => {
    it('should return vaults for guardian', () => {
      const mockVaults = [mockVaultAddress, '0x2222222222222222222222222222222222222222']
      ;(useReadContract as Mock).mockReturnValue({
        data: mockVaults,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      })

      const { result } = renderHook(() => useSearchByGuardian(mockAddress))

      expect(result.current.vaults).toEqual(mockVaults)
      expect(result.current.vaults?.length).toBe(2)
    })

    it('should handle missing guardian address', () => {
      ;(useReadContract as Mock).mockReturnValue({
        data: undefined,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      })

      const { result } = renderHook(() => useSearchByGuardian(undefined))

      expect(result.current.vaults).toBeUndefined()
    })
  })

  // ==================== useVaultInfo ====================
  describe('useVaultInfo', () => {
    it('should return vault info', () => {
      const mockVaultInfo = {
        vault: mockVaultAddress,
        originalOwner: mockAddress,
        createdAt: BigInt(1700000000),
        lastActiveAt: BigInt(1700100000),
        proofScore: BigInt(7500),
        badgeCount: BigInt(5),
        hasGuardians: true,
        hasRecoveryId: true,
        isRecoverable: true,
      }
      ;(useReadContract as Mock).mockReturnValue({
        data: mockVaultInfo,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      })

      const { result } = renderHook(() => useVaultInfo(mockVaultAddress))

      expect(result.current.vaultInfo).toEqual(mockVaultInfo)
    })

    it('should handle missing vault address', () => {
      ;(useReadContract as Mock).mockReturnValue({
        data: undefined,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      })

      const { result } = renderHook(() => useVaultInfo(undefined))

      expect(result.current.vaultInfo).toBeUndefined()
    })
  })

  // ==================== useSearchByWalletAddress ====================
  describe('useSearchByWalletAddress', () => {
    it('should search by old wallet address', () => {
      const mockResult = [mockVaultAddress, { vault: mockVaultAddress }]
      ;(useReadContract as Mock).mockReturnValue({
        data: mockResult,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      })

      const { result } = renderHook(() => useSearchByWalletAddress(mockAddress))

      expect(result.current.vault).toBeDefined()
    })

    it('should handle missing wallet address', () => {
      ;(useReadContract as Mock).mockReturnValue({
        data: undefined,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      })

      const { result } = renderHook(() => useSearchByWalletAddress(undefined))

      expect(result.current.vault).toBeUndefined()
    })
  })

  // ==================== useSearchByVaultAddress ====================
  describe('useSearchByVaultAddress', () => {
    it('should search by vault address', () => {
      const mockInfo = { vault: mockVaultAddress }
      ;(useReadContract as Mock).mockReturnValue({
        data: mockInfo,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      })

      const { result } = renderHook(() => useSearchByVaultAddress(mockVaultAddress))

      expect(result.current.vaultInfo).toBeDefined()
    })

    it('should handle missing vault address', () => {
      ;(useReadContract as Mock).mockReturnValue({
        data: undefined,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      })

      const { result } = renderHook(() => useSearchByVaultAddress(undefined))

      expect(result.current.vaultInfo).toBeUndefined()
    })
  })

  // ==================== useSearchByCreationTime ====================
  describe('useSearchByCreationTime', () => {
    it('should search by creation time range', () => {
      const mockMatches = [{ vault: mockVaultAddress }]
      ;(useReadContract as Mock).mockReturnValue({
        data: mockMatches,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      })

      const { result } = renderHook(() => 
        useSearchByCreationTime(BigInt(1700000000), BigInt(1700100000), 10)
      )

      expect(result.current.matches).toEqual(mockMatches)
    })

    it('should handle missing time range', () => {
      ;(useReadContract as Mock).mockReturnValue({
        data: undefined,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      })

      const { result } = renderHook(() => 
        useSearchByCreationTime(undefined, undefined)
      )

      expect(result.current.matches).toBeUndefined()
    })
  })

  // ==================== useTotalVaults ====================
  describe('useTotalVaults', () => {
    it('should return total vault count', () => {
      ;(useReadContract as Mock).mockReturnValue({
        data: BigInt(1000),
        isLoading: false,
        error: null,
      })

      const { result } = renderHook(() => useTotalVaults())

      // Hook converts to Number
      expect(result.current.totalVaults).toBe(1000)
    })

    it('should handle no data', () => {
      ;(useReadContract as Mock).mockReturnValue({
        data: undefined,
        isLoading: false,
        error: null,
      })

      const { result } = renderHook(() => useTotalVaults())

      // Defaults to 0 when no data
      expect(result.current.totalVaults).toBe(0)
    })
  })

  // ==================== useVaultByIndex ====================
  describe('useVaultByIndex', () => {
    it('should return vault by index', () => {
      const mockVaultInfo = { owner: mockAddress }
      ;(useReadContract as Mock).mockReturnValue({
        data: [mockVaultAddress, mockVaultInfo],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      })

      const { result } = renderHook(() => useVaultByIndex(5))

      expect(result.current.vault).toBe(mockVaultAddress)
      expect(result.current.vaultInfo).toEqual(mockVaultInfo)
    })

    it('should handle missing index', () => {
      ;(useReadContract as Mock).mockReturnValue({
        data: undefined,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      })

      const { result } = renderHook(() => useVaultByIndex(undefined))

      expect(result.current.vault).toBeUndefined()
    })
  })

  // ==================== useSetRecoveryId ====================
  describe('useSetRecoveryId', () => {
    it('should set recovery ID successfully', () => {
      const mockWriteContract = jest.fn()
      ;(useWriteContract as Mock).mockReturnValue({
        writeContract: mockWriteContract,
        data: mockTxHash,
        isPending: false,
        error: null,
      })

      const { result } = renderHook(() => useSetRecoveryId())

      act(() => {
        result.current.setRecoveryId(mockVaultAddress, 'my-new-recovery-id')
      })

      expect(mockWriteContract).toHaveBeenCalled()
    })

    it('should track pending state', () => {
      ;(useWriteContract as Mock).mockReturnValue({
        writeContract: jest.fn(),
        data: mockTxHash,
        isPending: true,
        error: null,
      })

      const { result } = renderHook(() => useSetRecoveryId())

      expect(result.current.isPending).toBe(true)
    })
  })

  // ==================== useSetEmailRecovery ====================
  describe('useSetEmailRecovery', () => {
    it('should set email recovery successfully', () => {
      const mockWriteContract = jest.fn()
      ;(useWriteContract as Mock).mockReturnValue({
        writeContract: mockWriteContract,
        data: mockTxHash,
        isPending: false,
        error: null,
      })

      const { result } = renderHook(() => useSetEmailRecovery())

      act(() => {
        result.current.setEmailRecovery(mockVaultAddress, 'test@example.com')
      })

      expect(mockWriteContract).toHaveBeenCalled()
    })
  })

  // ==================== useSetUsername ====================
  describe('useSetUsername', () => {
    it('should set username successfully', () => {
      const mockWriteContract = jest.fn()
      ;(useWriteContract as Mock).mockReturnValue({
        writeContract: mockWriteContract,
        data: mockTxHash,
        isPending: false,
        error: null,
      })

      const { result } = renderHook(() => useSetUsername())

      act(() => {
        result.current.setUsername(mockVaultAddress, 'newusername')
      })

      expect(mockWriteContract).toHaveBeenCalled()
    })
  })

  // ==================== useIsRecoveryIdAvailable ====================
  describe('useIsRecoveryIdAvailable', () => {
    it('should return true for available recovery ID', () => {
      ;(useReadContract as Mock).mockReturnValue({
        data: true,
        isLoading: false,
        error: null,
      })

      const { result } = renderHook(() => useIsRecoveryIdAvailable('available-id'))

      expect(result.current.isAvailable).toBe(true)
    })

    it('should return false for taken recovery ID', () => {
      ;(useReadContract as Mock).mockReturnValue({
        data: false,
        isLoading: false,
        error: null,
      })

      const { result } = renderHook(() => useIsRecoveryIdAvailable('taken-id'))

      expect(result.current.isAvailable).toBe(false)
    })
  })

  // ==================== useIsUsernameAvailable ====================
  describe('useIsUsernameAvailable', () => {
    it('should return true for available username', () => {
      ;(useReadContract as Mock).mockReturnValue({
        data: true,
        isLoading: false,
        error: null,
      })

      const { result } = renderHook(() => useIsUsernameAvailable('available-username'))

      expect(result.current.isAvailable).toBe(true)
    })

    it('should return false for taken username', () => {
      ;(useReadContract as Mock).mockReturnValue({
        data: false,
        isLoading: false,
        error: null,
      })

      const { result } = renderHook(() => useIsUsernameAvailable('taken-username'))

      expect(result.current.isAvailable).toBe(false)
    })
  })

  // ==================== useInitiateClaim ====================
  describe('useInitiateClaim', () => {
    it('should throw when recovery-claim contract is not deployed', () => {
      const originalAddress = CONTRACT_ADDRESSES.VaultRecoveryClaim
      CONTRACT_ADDRESSES.VaultRecoveryClaim = '0x0000000000000000000000000000000000000000'
      const mockWriteContract = jest.fn()
      ;(useWriteContract as Mock).mockReturnValue({
        writeContract: mockWriteContract,
        data: mockTxHash,
        isPending: false,
        error: null,
      })

      const { result } = renderHook(() => useInitiateClaim())

      expect(() => {
        result.current.initiateClaim(
          mockVaultAddress,
          'Lost access to wallet',
          '0x' + 'a'.repeat(64) as `0x${string}`
        )
      }).toThrow(/not deployed/i)

      expect(mockWriteContract).not.toHaveBeenCalled()
      CONTRACT_ADDRESSES.VaultRecoveryClaim = originalAddress
    })

    it('should track pending state', () => {
      ;(useWriteContract as Mock).mockReturnValue({
        writeContract: jest.fn(),
        data: mockTxHash,
        isPending: true,
        error: null,
      })

      const { result } = renderHook(() => useInitiateClaim())

      expect(result.current.isPending).toBe(true)
    })
  })

  // ==================== useGetClaim ====================
  describe('useGetClaim', () => {
    it('should return claim details', () => {
      const mockClaim = {
        vault: mockVaultAddress,
        claimant: mockAddress,
        originalOwner: '0x1111111111111111111111111111111111111111',
        initiatedAt: BigInt(1700000000),
        challengeEndsAt: BigInt(1700604800),
        expiresAt: BigInt(1701209600),
        status: 1, // Pending
        guardianApprovals: 2,
        nodeVotes: 1,
        evidenceHash: '0x' + 'a'.repeat(64),
        claimReason: 'Lost wallet access',
      }
      ;(useReadContract as Mock).mockReturnValue({
        data: mockClaim,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      })

      const { result } = renderHook(() => useGetClaim(BigInt(1)))

      expect(result.current.claim).toEqual(mockClaim)
    })

    it('should handle missing claim ID', () => {
      ;(useReadContract as Mock).mockReturnValue({
        data: undefined,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      })

      const { result } = renderHook(() => useGetClaim(undefined))

      expect(result.current.claim).toBeUndefined()
    })
  })

  // ==================== useActiveClaimForVault ====================
  describe('useActiveClaimForVault', () => {
    it('should return active claim for vault', () => {
      const mockClaim = {
        vault: mockVaultAddress,
        claimant: mockAddress,
        status: 1,
      }
      ;(useReadContract as Mock).mockReturnValue({
        data: [BigInt(1), mockClaim],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      })

      const { result } = renderHook(() => useActiveClaimForVault(mockVaultAddress))

      expect(result.current.claimId).toBe(BigInt(1))
      expect(result.current.claim).toEqual(mockClaim)
    })

    it('should handle no active claim', () => {
      ;(useReadContract as Mock).mockReturnValue({
        data: undefined,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      })

      const { result } = renderHook(() => useActiveClaimForVault(mockVaultAddress))

      expect(result.current.claimId).toBeUndefined()
      expect(result.current.claim).toBeUndefined()
    })
  })

  // ==================== useGuardianVote ====================
  describe('useGuardianVote', () => {
    it('should throw when recovery-claim contract is not deployed', async () => {
      const originalAddress = CONTRACT_ADDRESSES.VaultRecoveryClaim
      CONTRACT_ADDRESSES.VaultRecoveryClaim = '0x0000000000000000000000000000000000000000'
      const mockWriteContract = jest.fn()
      ;(useWriteContract as Mock).mockReturnValue({
        writeContract: mockWriteContract,
        data: mockTxHash,
        isPending: false,
        error: null,
      })

      const { result } = renderHook(() => useGuardianVote())

      expect(() => {
        result.current.vote(BigInt(1), true)
      }).toThrow(/not deployed/i)

      expect(mockWriteContract).not.toHaveBeenCalled()
      CONTRACT_ADDRESSES.VaultRecoveryClaim = originalAddress
    })

    it('should track voting state', () => {
      ;(useWriteContract as Mock).mockReturnValue({
        writeContract: jest.fn(),
        data: mockTxHash,
        isPending: true,
        error: null,
      })

      const { result } = renderHook(() => useGuardianVote())

      expect(result.current.isPending).toBe(true)
    })
  })

  // ==================== useChallengeClaim ====================
  describe('useChallengeClaim', () => {
    it('should throw when recovery-claim contract is not deployed', () => {
      const originalAddress = CONTRACT_ADDRESSES.VaultRecoveryClaim
      CONTRACT_ADDRESSES.VaultRecoveryClaim = '0x0000000000000000000000000000000000000000'
      const mockWriteContract = jest.fn()
      ;(useWriteContract as Mock).mockReturnValue({
        writeContract: mockWriteContract,
        data: mockTxHash,
        isPending: false,
        error: null,
      })

      const { result } = renderHook(() => useChallengeClaim())

      expect(() => {
        result.current.challenge(BigInt(1), 'Invalid claim - owner is alive')
      }).toThrow(/not deployed/i)

      expect(mockWriteContract).not.toHaveBeenCalled()
      CONTRACT_ADDRESSES.VaultRecoveryClaim = originalAddress
    })

    it('should track challenging state', () => {
      ;(useWriteContract as Mock).mockReturnValue({
        writeContract: jest.fn(),
        data: mockTxHash,
        isPending: true,
        error: null,
      })

      const { result } = renderHook(() => useChallengeClaim())

      expect(result.current.isPending).toBe(true)
    })
  })
})

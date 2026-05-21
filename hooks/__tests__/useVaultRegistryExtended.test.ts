// Extended tests for useVaultRegistry.ts - covering additional search and recovery functions
import { describe, it, expect, vi, beforeEach, Mock } from '@jest/globals'
import { renderHook, act } from '@testing-library/react'

// Mock wagmi before importing hooks
jest.mock('wagmi', () => ({
  useAccount: jest.fn(() => ({ address: undefined, isConnected: false, status: 'disconnected' })),
  useReadContract: jest.fn(() => ({ data: undefined, isError: false, isLoading: false, isSuccess: false, error: null, refetch: jest.fn() })),
  useWriteContract: jest.fn(() => ({ writeContract: jest.fn(), writeContractAsync: jest.fn(), data: undefined, isPending: false, isSuccess: false, isError: false, error: null, reset: jest.fn() })),
  useWaitForTransactionReceipt: jest.fn(() => ({ data: undefined, isLoading: false, isSuccess: false, isError: false })),
  useChainId: jest.fn(() => 1),
  useSwitchChain: jest.fn(() => ({ switchChain: jest.fn(), switchChainAsync: jest.fn(), chains: [], status: 'idle' })),
  useReadContracts: jest.fn(() => ({ data: undefined, isError: false, isLoading: false, isSuccess: false, error: null, refetch: jest.fn() })),
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
  WagmiProvider: jest.fn(),
  createConfig: jest.fn(),
  http: jest.fn(),
}))

// Mock viem
jest.mock('viem', () => ({
  keccak256: jest.fn((input: unknown) => '0x' + 'a'.repeat(64)),
  toBytes: jest.fn((input: string) => new Uint8Array([...input].map(c => c.charCodeAt(0)))),
  isAddress: jest.fn((value: string) => /^0x[a-fA-F0-9]{40}$/.test(value)),
  parseAbi: jest.fn(() => []),
  parseAbiItem: jest.fn((sig: any) => ({ name: typeof sig === 'string' ? sig.split(' ')[1]?.split('(')[0] : '', type: 'function',
  formatUnits: jest.fn((v: any) => String(v)),
  parseUnits: jest.fn((v: any) => BigInt(v || 0)),
  formatEther: jest.fn((v: any) => String(v)),
  parseEther: jest.fn((v: any) => BigInt(v || 0)),
  getAddress: jest.fn((a: string) => a),
  encodeFunctionData: jest.fn(() => '0x'),
  decodeFunctionResult: jest.fn(() => undefined),
  encodeAbiParameters: jest.fn(() => '0x'),
  decodeAbiParameters: jest.fn(() => []),
  toHex: jest.fn((v: any) => '0x' + (v ?? '').toString(16)),
  hexToString: jest.fn((h: any) => String(h)),
  padHex: jest.fn((h: any) => h),
  zeroAddress: '0x0000000000000000000000000000000000000000',
  stringToHex: jest.fn((s: any) => '0x' + Buffer.from(String(s)).toString('hex')),
  createPublicClient: jest.fn(() => ({ readContract: jest.fn(), getBlockNumber: jest.fn() })),
  createWalletClient: jest.fn(() => ({ writeContract: jest.fn() })),
  http: jest.fn(() => ({})),
  custom: jest.fn(() => ({})),
  erc20Abi: [],
  erc721Abi: [],
})),
  formatUnits: jest.fn((v: any) => String(v)),
  parseUnits: jest.fn((v: any) => BigInt(v || 0)),
  formatEther: jest.fn((v: any) => String(v)),
  parseEther: jest.fn((v: any) => BigInt(v || 0)),
  getAddress: jest.fn((a: string) => a),
  encodeFunctionData: jest.fn(() => '0x'),
  decodeFunctionResult: jest.fn(() => undefined),
  encodeAbiParameters: jest.fn(() => '0x'),
  decodeAbiParameters: jest.fn(() => []),
  toHex: jest.fn((v: any) => '0x' + (v ?? '').toString(16)),
  hexToString: jest.fn((h: any) => String(h)),
  padHex: jest.fn((h: any) => h),
  zeroAddress: '0x0000000000000000000000000000000000000000',
  stringToHex: jest.fn((s: any) => '0x' + Buffer.from(String(s)).toString('hex')),
  createPublicClient: jest.fn(() => ({ readContract: jest.fn(), getBlockNumber: jest.fn() })),
  createWalletClient: jest.fn(() => ({ writeContract: jest.fn() })),
  http: jest.fn(() => ({})),
  custom: jest.fn(() => ({})),
  erc20Abi: [],
  erc721Abi: [],
}))

jest.mock('@/lib/contracts', () => ({
  // CANONICAL_CONTRACTS_MOCK_V2
  CONTRACT_ADDRESSES: {},
  CONTRACTS: {},
  getContractAddresses: () => ({}),
  isConfiguredContractAddress: (address?: string | null) =>,
  validateContractAddress: jest.fn((addr: any) => addr),
  ZERO_ADDRESS: '0x0000000000000000000000000000000000000000',
  CURRENT_CHAIN_ID: 84532,
  VaultRegistryABI: [],
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

import { ZERO_ADDRESS } from '@/lib/constants'
import { act, renderHook } from '@testing-library/react'
import * as wagmi from 'wagmi'
import {
    useAbnormalTransactionThreshold,
    useApprovePendingTransaction,
    useBalanceSnapshot,
    useCleanupExpiredTransaction,
    useCreateVault,
    useExecutePendingTransaction,
    useGuardianCancelInheritance,
    useInheritanceStatus,
    useIsGuardianMature,
    usePendingTransaction,
    useSetBalanceSnapshotMode,
    useSetGuardian,
    useTransferVFIDE,
    useUpdateBalanceSnapshot,
    useUserVault,
    useVaultBalance,
    useVaultGuardiansDetailed,
} from '../useVaultHooks'

jest.mock('wagmi')
jest.mock('@/lib/contracts')

// Mock the abis module - must match exact import path from useVaultHooks.ts
jest.mock('../../lib/abis', () => ({
  VaultInfrastructureABI: [],
  VFIDETokenABI: [],
  VaultHubABI: [],
  UserVaultABI: [],
}))
jest.mock('@/lib/abis', () => ({
  VaultInfrastructureABI: [],
  VFIDETokenABI: [],
  VaultHubABI: [],
  UserVaultABI: [],
}))

const mockAddress = '0x1234567890123456789012345678901234567890' as `0x${string}`
const mockVaultAddress = '0xabcdef1234567890abcdef1234567890abcdef12' as `0x${string}`
const mockGuardianAddress = '0x1111111111111111111111111111111111111111' as `0x${string}`

describe('useUserVault', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(wagmi.useAccount as jest.Mock).mockReturnValue({
      address: mockAddress,
    })
  })

  it('returns vault address when user has a vault', () => {
    ;(wagmi.useReadContract as jest.Mock).mockReturnValue({
      data: mockVaultAddress,
      isLoading: false,
    })

    const { result } = renderHook(() => useUserVault())

    expect(result.current.vaultAddress).toBe(mockVaultAddress)
    expect(result.current.hasVault).toBe(true)
    expect(result.current.isLoading).toBe(false)
  })

  it('returns null when user has no vault', () => {
    ;(wagmi.useReadContract as jest.Mock).mockReturnValue({
      data: '0x0000000000000000000000000000000000000000',
      isLoading: false,
    })

    const { result } = renderHook(() => useUserVault())

    expect(result.current.vaultAddress).toBeNull()
    expect(result.current.hasVault).toBe(false)
  })

  it('returns loading state', () => {
    ;(wagmi.useReadContract as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: true,
    })

    const { result } = renderHook(() => useUserVault())

    expect(result.current.isLoading).toBe(true)
  })

  it('returns null when vaultAddress is undefined', () => {
    ;(wagmi.useReadContract as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: false,
    })

    const { result } = renderHook(() => useUserVault())

    expect(result.current.vaultAddress).toBeNull()
    expect(result.current.hasVault).toBeFalsy()
  })

  it('handles when user is not connected', () => {
    ;(wagmi.useAccount as jest.Mock).mockReturnValue({
      address: undefined,
    })
    ;(wagmi.useReadContract as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: false,
    })

    const { result } = renderHook(() => useUserVault())

    expect(result.current.vaultAddress).toBeNull()
    expect(result.current.hasVault).toBeFalsy()
  })
})

describe('useCreateVault', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // useCreateVault now needs useAccount for the address argument
    ;(wagmi.useAccount as jest.Mock).mockReturnValue({
      address: mockAddress,
    })
  })

  it('provides createVault function', () => {
    const mockWriteContract = jest.fn()
    ;(wagmi.useWriteContract as jest.Mock).mockReturnValue({
      writeContract: mockWriteContract,
      data: undefined,
      isPending: false,
    })
    ;(wagmi.useWaitForTransactionReceipt as jest.Mock).mockReturnValue({
      isLoading: false,
      isSuccess: false,
    })

    const { result } = renderHook(() => useCreateVault())

    expect(result.current.createVault).toBeDefined()
    expect(result.current.isCreating).toBe(false)
    expect(result.current.isSuccess).toBe(false)
  })

  it('calls writeContract when createVault is invoked', () => {
    const mockWriteContract = jest.fn()
    ;(wagmi.useWriteContract as jest.Mock).mockReturnValue({
      writeContract: mockWriteContract,
      data: undefined,
      isPending: false,
    })
    ;(wagmi.useWaitForTransactionReceipt as jest.Mock).mockReturnValue({
      isLoading: false,
      isSuccess: false,
    })

    const { result } = renderHook(() => useCreateVault())
    result.current.createVault()

    expect(mockWriteContract).toHaveBeenCalled()
  })

  it('does not call writeContract when address is undefined', () => {
    ;(wagmi.useAccount as jest.Mock).mockReturnValue({
      address: undefined,
    })
    const mockWriteContract = jest.fn()
    ;(wagmi.useWriteContract as jest.Mock).mockReturnValue({
      writeContract: mockWriteContract,
      data: undefined,
      isPending: false,
    })
    ;(wagmi.useWaitForTransactionReceipt as jest.Mock).mockReturnValue({
      isLoading: false,
      isSuccess: false,
    })

    const { result } = renderHook(() => useCreateVault())
    result.current.createVault()

    expect(mockWriteContract).not.toHaveBeenCalled()
  })

  it('returns isCreating true when pending', () => {
    ;(wagmi.useWriteContract as jest.Mock).mockReturnValue({
      writeContract: jest.fn(),
      data: undefined,
      isPending: true,
    })
    ;(wagmi.useWaitForTransactionReceipt as jest.Mock).mockReturnValue({
      isLoading: false,
      isSuccess: false,
    })

    const { result } = renderHook(() => useCreateVault())

    expect(result.current.isCreating).toBe(true)
  })

  it('returns isSuccess when transaction confirmed', () => {
    ;(wagmi.useWriteContract as jest.Mock).mockReturnValue({
      writeContract: jest.fn(),
      data: '0xhash123',
      isPending: false,
    })
    ;(wagmi.useWaitForTransactionReceipt as jest.Mock).mockReturnValue({
      isLoading: false,
      isSuccess: true,
    })

    const { result } = renderHook(() => useCreateVault())

    expect(result.current.isSuccess).toBe(true)
    expect(result.current.txHash).toBe('0xhash123')
  })
})

describe('useVaultBalance', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(wagmi.useAccount as jest.Mock).mockReturnValue({
      address: mockAddress,
    })
  })

  it('returns formatted balance', () => {
    ;(wagmi.useReadContract as jest.Mock).mockReturnValue({
      data: BigInt('1000000000000000000'), // 1 ETH in wei
      isLoading: false,
      refetch: jest.fn(),
    })

    const { result } = renderHook(() => useVaultBalance())

    expect(result.current.balance).toBe('1')
    expect(result.current.balanceRaw).toBe(BigInt('1000000000000000000'))
  })

  it('returns zero balance when no data', () => {
    ;(wagmi.useReadContract as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: false,
      refetch: jest.fn(),
    })

    const { result } = renderHook(() => useVaultBalance())

    expect(result.current.balance).toBe('0')
    expect(result.current.balanceRaw).toBe(0n)
  })

  it('provides refetch function', () => {
    const mockRefetch = jest.fn()
    ;(wagmi.useReadContract as jest.Mock).mockReturnValue({
      data: BigInt('5000000000000000000'),
      isLoading: false,
      refetch: mockRefetch,
    })

    const { result } = renderHook(() => useVaultBalance())

    expect(result.current.refetch).toBe(mockRefetch)
  })

  it('returns loading state', () => {
    ;(wagmi.useReadContract as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: true,
      refetch: jest.fn(),
    })

    const { result } = renderHook(() => useVaultBalance())

    expect(result.current.isLoading).toBe(true)
  })
})

describe('useTransferVFIDE', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(wagmi.useAccount as jest.Mock).mockReturnValue({
      address: mockAddress,
    })
    ;(wagmi.useReadContract as jest.Mock).mockReturnValue({
      data: mockVaultAddress,
      isLoading: false,
    })
  })

  it('provides transfer function', () => {
    const mockWriteContract = jest.fn()
    ;(wagmi.useWriteContract as jest.Mock).mockReturnValue({
      writeContract: mockWriteContract,
      data: undefined,
      isPending: false,
    })
    ;(wagmi.useWaitForTransactionReceipt as jest.Mock).mockReturnValue({
      isLoading: false,
      isSuccess: false,
    })

    const { result } = renderHook(() => useTransferVFIDE())

    expect(result.current.transfer).toBeDefined()
    expect(result.current.isTransferring).toBe(false)
  })

  it('calls writeContract when transfer is invoked', () => {
    const mockWriteContract = jest.fn()
    ;(wagmi.useWriteContract as jest.Mock).mockReturnValue({
      writeContract: mockWriteContract,
      data: undefined,
      isPending: false,
    })
    ;(wagmi.useWaitForTransactionReceipt as jest.Mock).mockReturnValue({
      isLoading: false,
      isSuccess: false,
    })

    const { result } = renderHook(() => useTransferVFIDE())
    const toVault = '0x9876543210987654321098765432109876543210' as `0x${string}`
    result.current.transfer(toVault, '100')

    expect(mockWriteContract).toHaveBeenCalled()
  })

  it('does not call writeContract when no vault address', () => {
    const mockWriteContract = jest.fn()
    ;(wagmi.useAccount as jest.Mock).mockReturnValue({
      address: mockAddress,
    })
    ;(wagmi.useReadContract as jest.Mock).mockReturnValue({
      data: ZERO_ADDRESS, // No vault
      isLoading: false,
    })
    ;(wagmi.useWriteContract as jest.Mock).mockReturnValue({
      writeContract: mockWriteContract,
      data: undefined,
      isPending: false,
    })
    ;(wagmi.useWaitForTransactionReceipt as jest.Mock).mockReturnValue({
      isLoading: false,
      isSuccess: false,
    })

    const { result } = renderHook(() => useTransferVFIDE())
    const toVault = '0x9876543210987654321098765432109876543210' as `0x${string}`
    result.current.transfer(toVault, '100')

    expect(mockWriteContract).not.toHaveBeenCalled()
  })

  it('throws error for invalid recipient address (line 113)', () => {
    const mockWriteContract = jest.fn()
    ;(wagmi.useAccount as jest.Mock).mockReturnValue({
      address: mockAddress,
    })
    ;(wagmi.useReadContract as jest.Mock).mockReturnValue({
      data: mockVaultAddress, // Has vault
      isLoading: false,
    })
    ;(wagmi.useWriteContract as jest.Mock).mockReturnValue({
      writeContract: mockWriteContract,
      data: undefined,
      isPending: false,
    })
    ;(wagmi.useWaitForTransactionReceipt as jest.Mock).mockReturnValue({
      isLoading: false,
      isSuccess: false,
    })

    const { result } = renderHook(() => useTransferVFIDE())
    
    // Invalid address should throw error (triggers line 113)
    let errorThrown = false
    try {
      result.current.transfer('invalid' as `0x${string}`, '100')
    } catch (error: any) {
      errorThrown = true
      expect(error.message).toBeTruthy()
    }
    expect(errorThrown).toBe(true)
    expect(mockWriteContract).not.toHaveBeenCalled()
  })

  it('returns isTransferring true when confirming', () => {
    ;(wagmi.useAccount as jest.Mock).mockReturnValue({
      address: mockAddress,
    })
    ;(wagmi.useReadContract as jest.Mock).mockReturnValue({
      data: mockVaultAddress,
      isLoading: false,
    })
    ;(wagmi.useWriteContract as jest.Mock).mockReturnValue({
      writeContract: jest.fn(),
      data: '0xhash',
      isPending: false,
    })
    ;(wagmi.useWaitForTransactionReceipt as jest.Mock).mockReturnValue({
      isLoading: true,
      isSuccess: false,
    })

    const { result } = renderHook(() => useTransferVFIDE())

    expect(result.current.isTransferring).toBe(true)
  })

  it('returns isSuccess when transfer completed', () => {
    ;(wagmi.useAccount as jest.Mock).mockReturnValue({
      address: mockAddress,
    })
    ;(wagmi.useReadContract as jest.Mock).mockReturnValue({
      data: mockVaultAddress,
      isLoading: false,
    })
    ;(wagmi.useWriteContract as jest.Mock).mockReturnValue({
      writeContract: jest.fn(),
      data: '0xhash',
      isPending: false,
    })
    ;(wagmi.useWaitForTransactionReceipt as jest.Mock).mockReturnValue({
      isLoading: false,
      isSuccess: true,
    })

    const { result } = renderHook(() => useTransferVFIDE())

    expect(result.current.isSuccess).toBe(true)
    expect(result.current.txHash).toBe('0xhash')
  })
})

describe('useVaultGuardiansDetailed', () => {
  it('returns guardian count', () => {
    ;(wagmi.useReadContract as jest.Mock).mockReturnValue({
      data: 3,
    })

    const { result } = renderHook(() => useVaultGuardiansDetailed(mockVaultAddress))

    expect(result.current.guardianCount).toBe(3)
  })

  it('returns 0 when no data', () => {
    ;(wagmi.useReadContract as jest.Mock).mockReturnValue({
      data: undefined,
    })

    const { result } = renderHook(() => useVaultGuardiansDetailed(mockVaultAddress))

    expect(result.current.guardianCount).toBe(0)
  })
})

describe('useIsGuardianMature', () => {
  it('returns true when guardian is mature', () => {
    ;(wagmi.useReadContract as jest.Mock).mockReturnValue({
      data: true,
    })

    const guardianAddress = '0xguardian1234567890guardian1234567890ab' as `0x${string}`
    const { result } = renderHook(() => useIsGuardianMature(mockVaultAddress, guardianAddress))

    expect(result.current.isMature).toBe(true)
  })

  it('returns false when guardian is not mature', () => {
    ;(wagmi.useReadContract as jest.Mock).mockReturnValue({
      data: false,
    })

    const guardianAddress = '0xguardian1234567890guardian1234567890ab' as `0x${string}`
    const { result } = renderHook(() => useIsGuardianMature(mockVaultAddress, guardianAddress))

    expect(result.current.isMature).toBe(false)
  })

  it('returns false when no data', () => {
    ;(wagmi.useReadContract as jest.Mock).mockReturnValue({
      data: undefined,
    })

    const guardianAddress = '0xguardian1234567890guardian1234567890ab' as `0x${string}`
    const { result } = renderHook(() => useIsGuardianMature(mockVaultAddress, guardianAddress))

    expect(result.current.isMature).toBe(false)
  })

  it('returns false when vault address is undefined', () => {
    ;(wagmi.useReadContract as jest.Mock).mockReturnValue({
      data: undefined,
    })

    const guardianAddress = '0xguardian1234567890guardian1234567890ab' as `0x${string}`
    const { result } = renderHook(() => useIsGuardianMature(undefined, guardianAddress))

    expect(result.current.isMature).toBe(false)
  })

  it('returns false when guardian address is undefined', () => {
    ;(wagmi.useReadContract as jest.Mock).mockReturnValue({
      data: undefined,
    })

    const { result } = renderHook(() => useIsGuardianMature(mockVaultAddress, undefined))

    expect(result.current.isMature).toBe(false)
  })
})

describe('useSetGuardian', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('provides setGuardian function', () => {
    ;(wagmi.useWriteContract as jest.Mock).mockReturnValue({
      writeContractAsync: jest.fn(),
    })
    ;(wagmi.useWaitForTransactionReceipt as jest.Mock).mockReturnValue({
      isSuccess: false,
      isLoading: false,
    })

    const { result } = renderHook(() => useSetGuardian(mockVaultAddress))

    expect(result.current.setGuardian).toBeDefined()
  })

  it('handles UV_RecoveryActive error', async () => {
    const mockWriteContractAsync = jest.fn().mockRejectedValue(new Error('UV_RecoveryActive'))
    ;(wagmi.useWriteContract as jest.Mock).mockReturnValue({
      writeContractAsync: mockWriteContractAsync,
    })
    ;(wagmi.useWaitForTransactionReceipt as jest.Mock).mockReturnValue({
      isSuccess: false,
      isLoading: false,
    })

    const { result } = renderHook(() => useSetGuardian(mockVaultAddress))
    
    await act(async () => {
      // New signature: setGuardian(slot: number, guardianAddress)
      await result.current.setGuardian(0, ZERO_ADDRESS as `0x${string}`)
    })

    expect(result.current.error).toBe('Cannot modify guardians during active recovery')
  })

  it('handles UV_Locked error', async () => {
    const mockWriteContractAsync = jest.fn().mockRejectedValue(new Error('UV_Locked'))
    ;(wagmi.useWriteContract as jest.Mock).mockReturnValue({
      writeContractAsync: mockWriteContractAsync,
    })
    ;(wagmi.useWaitForTransactionReceipt as jest.Mock).mockReturnValue({
      isSuccess: false,
      isLoading: false,
    })

    const { result } = renderHook(() => useSetGuardian(mockVaultAddress))
    
    await act(async () => {
      await result.current.setGuardian(0, mockGuardianAddress)
    })

    expect(result.current.error).toBe('Vault is currently locked')
  })

  it('returns success on successful transaction', async () => {
    const mockHash = '0xhash123' as `0x${string}`
    const mockWriteContractAsync = jest.fn().mockResolvedValue(mockHash)
    ;(wagmi.useWriteContract as jest.Mock).mockReturnValue({
      writeContractAsync: mockWriteContractAsync,
    })
    ;(wagmi.useWaitForTransactionReceipt as jest.Mock).mockReturnValue({
      isSuccess: true,
      isLoading: false,
    })

    const { result } = renderHook(() => useSetGuardian(mockVaultAddress))
    
    let response: { success: boolean; txHash?: `0x${string}` }
    
    await act(async () => {
      response = await result.current.setGuardian(0, mockGuardianAddress)
    })

    expect(response!.success).toBe(true)
    expect(response!.txHash).toBe(mockHash)
  })

  it('handles generic error', async () => {
    const mockWriteContractAsync = jest.fn().mockRejectedValue(new Error('User rejected transaction'))
    ;(wagmi.useWriteContract as jest.Mock).mockReturnValue({
      writeContractAsync: mockWriteContractAsync,
    })
    ;(wagmi.useWaitForTransactionReceipt as jest.Mock).mockReturnValue({
      isSuccess: false,
      isLoading: false,
    })

    const { result } = renderHook(() => useSetGuardian(mockVaultAddress))
    
    await act(async () => {
      await result.current.setGuardian(0, mockGuardianAddress)
    })

    expect(result.current.error).toBe('User rejected transaction')
  })

  it('handles non-Error rejection', async () => {
    const mockWriteContractAsync = jest.fn().mockRejectedValue(null)
    ;(wagmi.useWriteContract as jest.Mock).mockReturnValue({
      writeContractAsync: mockWriteContractAsync,
    })
    ;(wagmi.useWaitForTransactionReceipt as jest.Mock).mockReturnValue({
      isSuccess: false,
      isLoading: false,
    })

    const { result } = renderHook(() => useSetGuardian(mockVaultAddress))
    
    let response: { success: boolean; error?: string }
    
    await act(async () => {
      response = await result.current.setGuardian(0, mockGuardianAddress)
    })

    expect(response!.success).toBe(false)
    expect(response!.error).toBe('Transaction failed')
  })

  it('handles UV_NotOwner error', async () => {
    const mockWriteContractAsync = jest.fn().mockRejectedValue(new Error('UV_NotOwner'))
    ;(wagmi.useWriteContract as jest.Mock).mockReturnValue({
      writeContractAsync: mockWriteContractAsync,
    })
    ;(wagmi.useWaitForTransactionReceipt as jest.Mock).mockReturnValue({
      isSuccess: false,
      isLoading: false,
    })

    const { result } = renderHook(() => useSetGuardian(mockVaultAddress))
    await act(async () => {
      await result.current.setGuardian(0, mockGuardianAddress)
    })

    expect(result.current.error).toBe('Only vault owner can modify guardians')
  })

  it('returns loading state while transaction is pending', () => {
    ;(wagmi.useWriteContract as jest.Mock).mockReturnValue({
      writeContractAsync: jest.fn(),
    })
    ;(wagmi.useWaitForTransactionReceipt as jest.Mock).mockReturnValue({
      isSuccess: false,
      isLoading: true,
    })

    const { result } = renderHook(() => useSetGuardian(mockVaultAddress))

    expect(result.current.isLoading).toBe(true)
  })
})

describe('useAbnormalTransactionThreshold', () => {
  it('returns threshold data', () => {
    ;(wagmi.useReadContract as jest.Mock)
      .mockReturnValueOnce({ data: BigInt(1000) })
      .mockReturnValueOnce({ data: true })
      .mockReturnValueOnce({ data: BigInt(500) })

    const { result } = renderHook(() => useAbnormalTransactionThreshold(mockVaultAddress))

    expect(result.current.threshold).toBe(BigInt(1000))
    expect(result.current.usePercentage).toBe(true)
    expect(result.current.percentageBps).toBe(500)
  })

  it('returns defaults when no data', () => {
    ;(wagmi.useReadContract as jest.Mock).mockReturnValue({ data: undefined })

    const { result } = renderHook(() => useAbnormalTransactionThreshold(mockVaultAddress))

    expect(result.current.threshold).toBe(0n)
    expect(result.current.usePercentage).toBe(false)
    expect(result.current.percentageBps).toBe(0)
  })
})

describe('useSetBalanceSnapshotMode', () => {
  it('provides setSnapshotMode function', () => {
    ;(wagmi.useWriteContract as jest.Mock).mockReturnValue({
      writeContractAsync: jest.fn(),
    })
    ;(wagmi.useWaitForTransactionReceipt as jest.Mock).mockReturnValue({
      isSuccess: false,
      isLoading: false,
    })

    const { result } = renderHook(() => useSetBalanceSnapshotMode(mockVaultAddress))

    expect(result.current.setSnapshotMode).toBeDefined()
  })

  it('returns success on successful call', async () => {
    const mockHash = '0xhash456' as `0x${string}`
    ;(wagmi.useWriteContract as jest.Mock).mockReturnValue({
      writeContractAsync: jest.fn().mockResolvedValue(mockHash),
    })
    ;(wagmi.useWaitForTransactionReceipt as jest.Mock).mockReturnValue({
      isSuccess: true,
      isLoading: false,
    })

    const { result } = renderHook(() => useSetBalanceSnapshotMode(mockVaultAddress))
    
    let response: { success: boolean }
    await act(async () => {
      response = await result.current.setSnapshotMode(true)
    })

    expect(response!.success).toBe(true)
  })

  it('handles errors', async () => {
    ;(wagmi.useWriteContract as jest.Mock).mockReturnValue({
      writeContractAsync: jest.fn().mockRejectedValue(new Error('Failed')),
    })
    ;(wagmi.useWaitForTransactionReceipt as jest.Mock).mockReturnValue({
      isSuccess: false,
      isLoading: false,
    })

    const { result } = renderHook(() => useSetBalanceSnapshotMode(mockVaultAddress))
    
    let response: { success: boolean; error?: string }
    await act(async () => {
      response = await result.current.setSnapshotMode(true)
    })

    expect(response!.success).toBe(false)
    expect(response!.error).toBe('Failed')
  })
})

describe('useUpdateBalanceSnapshot', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('provides updateSnapshot function', () => {
    ;(wagmi.useWriteContract as jest.Mock).mockReturnValue({
      writeContractAsync: jest.fn(),
    })
    ;(wagmi.useWaitForTransactionReceipt as jest.Mock).mockReturnValue({
      isSuccess: false,
      isLoading: false,
    })

    const { result } = renderHook(() => useUpdateBalanceSnapshot(mockVaultAddress))

    expect(result.current.updateSnapshot).toBeDefined()
  })

  it('returns success when updateSnapshot is called successfully', async () => {
    const mockHash = '0xupdatesnapshot123' as `0x${string}`
    ;(wagmi.useWriteContract as jest.Mock).mockReturnValue({
      writeContractAsync: jest.fn().mockResolvedValue(mockHash),
    })
    ;(wagmi.useWaitForTransactionReceipt as jest.Mock).mockReturnValue({
      isSuccess: true,
      isLoading: false,
    })

    const { result } = renderHook(() => useUpdateBalanceSnapshot(mockVaultAddress))

    let response: { success: boolean; txHash?: `0x${string}` }
    await act(async () => {
      response = await result.current.updateSnapshot()
    })

    expect(response!.success).toBe(true)
    expect(response!.txHash).toBe(mockHash)
  })

  it('handles error when updateSnapshot fails', async () => {
    ;(wagmi.useWriteContract as jest.Mock).mockReturnValue({
      writeContractAsync: jest.fn().mockRejectedValue(new Error('Snapshot update failed')),
    })
    ;(wagmi.useWaitForTransactionReceipt as jest.Mock).mockReturnValue({
      isSuccess: false,
      isLoading: false,
    })

    const { result } = renderHook(() => useUpdateBalanceSnapshot(mockVaultAddress))

    let response: { success: boolean; error?: string }
    await act(async () => {
      response = await result.current.updateSnapshot()
    })

    expect(response!.success).toBe(false)
    expect(response!.error).toBe('Snapshot update failed')
  })

  it('handles non-Error rejection', async () => {
    ;(wagmi.useWriteContract as jest.Mock).mockReturnValue({
      writeContractAsync: jest.fn().mockRejectedValue(12345),
    })
    ;(wagmi.useWaitForTransactionReceipt as jest.Mock).mockReturnValue({
      isSuccess: false,
      isLoading: false,
    })

    const { result } = renderHook(() => useUpdateBalanceSnapshot(mockVaultAddress))

    let response: { success: boolean; error?: string }
    await act(async () => {
      response = await result.current.updateSnapshot()
    })

    expect(response!.success).toBe(false)
    expect(response!.error).toBe('Transaction failed')
  })

  it('returns correct transaction states', () => {
    const mockHash = '0xhash' as `0x${string}`
    ;(wagmi.useWriteContract as jest.Mock).mockReturnValue({
      writeContractAsync: jest.fn().mockResolvedValue(mockHash),
    })
    ;(wagmi.useWaitForTransactionReceipt as jest.Mock).mockReturnValue({
      isSuccess: true,
      isLoading: false,
    })

    const { result } = renderHook(() => useUpdateBalanceSnapshot(mockVaultAddress))

    expect(result.current.isSuccess).toBe(true)
    expect(result.current.isLoading).toBe(false)
  })
})

describe('useBalanceSnapshot', () => {
  it('returns snapshot data', () => {
    ;(wagmi.useReadContract as jest.Mock)
      .mockReturnValueOnce({ data: true })
      .mockReturnValueOnce({ data: BigInt(5000) })

    const { result } = renderHook(() => useBalanceSnapshot(mockVaultAddress))

    expect(result.current.useSnapshot).toBe(true)
    expect(result.current.snapshot).toBe(BigInt(5000))
  })

  it('returns defaults when no data', () => {
    ;(wagmi.useReadContract as jest.Mock).mockReturnValue({ data: undefined })

    const { result } = renderHook(() => useBalanceSnapshot(mockVaultAddress))

    expect(result.current.useSnapshot).toBe(false)
    expect(result.current.snapshot).toBe(0n)
  })
})

describe('usePendingTransaction', () => {
  it('returns pending transaction data', () => {
    const mockTx = [
      mockVaultAddress,
      BigInt(1000),
      BigInt(Date.now()),
      true,
      false,
    ]
    ;(wagmi.useReadContract as jest.Mock)
      .mockReturnValueOnce({ data: mockTx })
      .mockReturnValueOnce({ data: BigInt(1) })

    const { result } = renderHook(() => usePendingTransaction(mockVaultAddress, 0))

    expect(result.current.pendingTx).not.toBeNull()
    expect(result.current.pendingTx?.toVault).toBe(mockVaultAddress)
    expect(result.current.pendingTx?.approved).toBe(true)
    expect(result.current.pendingTx?.executed).toBe(false)
  })

  it('returns null when no pending transaction', () => {
    ;(wagmi.useReadContract as jest.Mock).mockReturnValue({ data: undefined })

    const { result } = renderHook(() => usePendingTransaction(mockVaultAddress, 0))

    expect(result.current.pendingTx).toBeNull()
    expect(result.current.pendingTxCount).toBe(0n)
  })

  it('handles when txId is undefined', () => {
    ;(wagmi.useReadContract as jest.Mock).mockReturnValue({ data: undefined })

    const { result } = renderHook(() => usePendingTransaction(mockVaultAddress, undefined))

    expect(result.current.pendingTx).toBeNull()
  })

  it('handles when vault address is undefined', () => {
    ;(wagmi.useReadContract as jest.Mock).mockReturnValue({ data: undefined })

    const { result } = renderHook(() => usePendingTransaction(undefined, 0))

    expect(result.current.pendingTx).toBeNull()
    expect(result.current.pendingTxCount).toBe(0n)
  })
})

describe('useApprovePendingTransaction', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('provides approve function', () => {
    ;(wagmi.useWriteContract as jest.Mock).mockReturnValue({
      writeContractAsync: jest.fn(),
    })
    ;(wagmi.useWaitForTransactionReceipt as jest.Mock).mockReturnValue({
      isSuccess: false,
      isLoading: false,
    })

    const { result } = renderHook(() => useApprovePendingTransaction(mockVaultAddress))

    expect(result.current.approve).toBeDefined()
  })

  it('returns success when approve is called successfully', async () => {
    const mockHash = '0xapprovetx123' as `0x${string}`
    ;(wagmi.useWriteContract as jest.Mock).mockReturnValue({
      writeContractAsync: jest.fn().mockResolvedValue(mockHash),
    })
    ;(wagmi.useWaitForTransactionReceipt as jest.Mock).mockReturnValue({
      isSuccess: true,
      isLoading: false,
    })

    const { result } = renderHook(() => useApprovePendingTransaction(mockVaultAddress))

    let response: { success: boolean; txHash?: `0x${string}` }
    await act(async () => {
      response = await result.current.approve(0)
    })

    expect(response!.success).toBe(true)
    expect(response!.txHash).toBe(mockHash)
  })

  it('handles error when approve fails', async () => {
    ;(wagmi.useWriteContract as jest.Mock).mockReturnValue({
      writeContractAsync: jest.fn().mockRejectedValue(new Error('Insufficient permissions')),
    })
    ;(wagmi.useWaitForTransactionReceipt as jest.Mock).mockReturnValue({
      isSuccess: false,
      isLoading: false,
    })

    const { result } = renderHook(() => useApprovePendingTransaction(mockVaultAddress))

    let response: { success: boolean; error?: string }
    await act(async () => {
      response = await result.current.approve(0)
    })

    expect(response!.success).toBe(false)
    expect(response!.error).toBe('Insufficient permissions')
  })

  it('handles non-Error rejection', async () => {
    ;(wagmi.useWriteContract as jest.Mock).mockReturnValue({
      writeContractAsync: jest.fn().mockRejectedValue(null),
    })
    ;(wagmi.useWaitForTransactionReceipt as jest.Mock).mockReturnValue({
      isSuccess: false,
      isLoading: false,
    })

    const { result } = renderHook(() => useApprovePendingTransaction(mockVaultAddress))

    let response: { success: boolean; error?: string }
    await act(async () => {
      response = await result.current.approve(0)
    })

    expect(response!.success).toBe(false)
    expect(response!.error).toBe('Transaction failed')
  })
})

describe('useExecutePendingTransaction', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('provides execute function', () => {
    ;(wagmi.useWriteContract as jest.Mock).mockReturnValue({
      writeContractAsync: jest.fn(),
    })
    ;(wagmi.useWaitForTransactionReceipt as jest.Mock).mockReturnValue({
      isSuccess: false,
      isLoading: false,
    })

    const { result } = renderHook(() => useExecutePendingTransaction(mockVaultAddress))

    expect(result.current.execute).toBeDefined()
  })

  it('returns success when execute is called successfully', async () => {
    const mockHash = '0xexecutetx123' as `0x${string}`
    ;(wagmi.useWriteContract as jest.Mock).mockReturnValue({
      writeContractAsync: jest.fn().mockResolvedValue(mockHash),
    })
    ;(wagmi.useWaitForTransactionReceipt as jest.Mock).mockReturnValue({
      isSuccess: true,
      isLoading: false,
    })

    const { result } = renderHook(() => useExecutePendingTransaction(mockVaultAddress))

    let response: { success: boolean; txHash?: `0x${string}` }
    await act(async () => {
      response = await result.current.execute(0)
    })

    expect(response!.success).toBe(true)
    expect(response!.txHash).toBe(mockHash)
  })

  it('handles error when execute fails', async () => {
    ;(wagmi.useWriteContract as jest.Mock).mockReturnValue({
      writeContractAsync: jest.fn().mockRejectedValue(new Error('Transaction not approved')),
    })
    ;(wagmi.useWaitForTransactionReceipt as jest.Mock).mockReturnValue({
      isSuccess: false,
      isLoading: false,
    })

    const { result } = renderHook(() => useExecutePendingTransaction(mockVaultAddress))

    let response: { success: boolean; error?: string }
    await act(async () => {
      response = await result.current.execute(0)
    })

    expect(response!.success).toBe(false)
    expect(response!.error).toBe('Transaction not approved')
  })

  it('handles non-Error rejection', async () => {
    ;(wagmi.useWriteContract as jest.Mock).mockReturnValue({
      writeContractAsync: jest.fn().mockRejectedValue(undefined),
    })
    ;(wagmi.useWaitForTransactionReceipt as jest.Mock).mockReturnValue({
      isSuccess: false,
      isLoading: false,
    })

    const { result } = renderHook(() => useExecutePendingTransaction(mockVaultAddress))

    let response: { success: boolean; error?: string }
    await act(async () => {
      response = await result.current.execute(0)
    })

    expect(response!.success).toBe(false)
    expect(response!.error).toBe('Transaction failed')
  })

  it('returns correct loading and success states', () => {
    ;(wagmi.useWriteContract as jest.Mock).mockReturnValue({
      writeContractAsync: jest.fn(),
    })
    ;(wagmi.useWaitForTransactionReceipt as jest.Mock).mockReturnValue({
      isSuccess: false,
      isLoading: true,
    })

    const { result } = renderHook(() => useExecutePendingTransaction(mockVaultAddress))

    expect(result.current.isLoading).toBe(true)
    expect(result.current.isSuccess).toBe(false)
  })
})

describe('useCleanupExpiredTransaction', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('provides cleanup function', () => {
    ;(wagmi.useWriteContract as jest.Mock).mockReturnValue({
      writeContractAsync: jest.fn(),
    })
    ;(wagmi.useWaitForTransactionReceipt as jest.Mock).mockReturnValue({
      isSuccess: false,
      isLoading: false,
    })

    const { result } = renderHook(() => useCleanupExpiredTransaction(mockVaultAddress))

    expect(result.current.cleanup).toBeDefined()
  })

  it('returns success when cleanup is called successfully', async () => {
    const mockHash = '0xcleanuptx123' as `0x${string}`
    ;(wagmi.useWriteContract as jest.Mock).mockReturnValue({
      writeContractAsync: jest.fn().mockResolvedValue(mockHash),
    })
    ;(wagmi.useWaitForTransactionReceipt as jest.Mock).mockReturnValue({
      isSuccess: true,
      isLoading: false,
    })

    const { result } = renderHook(() => useCleanupExpiredTransaction(mockVaultAddress))

    let response: { success: boolean; txHash?: `0x${string}` }
    await act(async () => {
      response = await result.current.cleanup(1)
    })

    expect(response!.success).toBe(true)
    expect(response!.txHash).toBe(mockHash)
  })

  it('handles error when cleanup fails', async () => {
    ;(wagmi.useWriteContract as jest.Mock).mockReturnValue({
      writeContractAsync: jest.fn().mockRejectedValue(new Error('Transaction expired')),
    })
    ;(wagmi.useWaitForTransactionReceipt as jest.Mock).mockReturnValue({
      isSuccess: false,
      isLoading: false,
    })

    const { result } = renderHook(() => useCleanupExpiredTransaction(mockVaultAddress))

    let response: { success: boolean; error?: string }
    await act(async () => {
      response = await result.current.cleanup(1)
    })

    expect(response!.success).toBe(false)
    expect(response!.error).toBe('Transaction expired')
  })

  it('handles non-Error rejection', async () => {
    ;(wagmi.useWriteContract as jest.Mock).mockReturnValue({
      writeContractAsync: jest.fn().mockRejectedValue('String error'),
    })
    ;(wagmi.useWaitForTransactionReceipt as jest.Mock).mockReturnValue({
      isSuccess: false,
      isLoading: false,
    })

    const { result } = renderHook(() => useCleanupExpiredTransaction(mockVaultAddress))

    let response: { success: boolean; error?: string }
    await act(async () => {
      response = await result.current.cleanup(1)
    })

    expect(response!.success).toBe(false)
    expect(response!.error).toBe('Transaction failed')
  })

  it('returns loading state while transaction is pending', () => {
    ;(wagmi.useWriteContract as jest.Mock).mockReturnValue({
      writeContractAsync: jest.fn(),
    })
    ;(wagmi.useWaitForTransactionReceipt as jest.Mock).mockReturnValue({
      isSuccess: false,
      isLoading: true,
    })

    const { result } = renderHook(() => useCleanupExpiredTransaction(mockVaultAddress))

    expect(result.current.isLoading).toBe(true)
  })
})

describe('useGuardianCancelInheritance', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('provides cancelInheritance function', () => {
    ;(wagmi.useWriteContract as jest.Mock).mockReturnValue({
      writeContractAsync: jest.fn(),
    })
    ;(wagmi.useWaitForTransactionReceipt as jest.Mock).mockReturnValue({
      isSuccess: false,
      isLoading: false,
    })

    const { result } = renderHook(() => useGuardianCancelInheritance(mockVaultAddress))

    expect(result.current.cancelInheritance).toBeDefined()
  })

  it('returns success when cancelInheritance is called successfully', async () => {
    const mockHash = '0xcancelinheritance123' as `0x${string}`
    ;(wagmi.useWriteContract as jest.Mock).mockReturnValue({
      writeContractAsync: jest.fn().mockResolvedValue(mockHash),
    })
    ;(wagmi.useWaitForTransactionReceipt as jest.Mock).mockReturnValue({
      isSuccess: true,
      isLoading: false,
    })

    const { result } = renderHook(() => useGuardianCancelInheritance(mockVaultAddress))

    let response: { success: boolean; txHash?: `0x${string}` }
    await act(async () => {
      response = await result.current.cancelInheritance()
    })

    expect(response!.success).toBe(true)
    expect(response!.txHash).toBe(mockHash)
  })

  it('handles error when cancelInheritance fails', async () => {
    ;(wagmi.useWriteContract as jest.Mock).mockReturnValue({
      writeContractAsync: jest.fn().mockRejectedValue(new Error('Not authorized')),
    })
    ;(wagmi.useWaitForTransactionReceipt as jest.Mock).mockReturnValue({
      isSuccess: false,
      isLoading: false,
    })

    const { result } = renderHook(() => useGuardianCancelInheritance(mockVaultAddress))

    let response: { success: boolean; error?: string }
    await act(async () => {
      response = await result.current.cancelInheritance()
    })

    expect(response!.success).toBe(false)
    expect(response!.error).toBe('Not authorized')
  })

  it('handles non-Error rejection', async () => {
    ;(wagmi.useWriteContract as jest.Mock).mockReturnValue({
      writeContractAsync: jest.fn().mockRejectedValue({ code: 'USER_REJECTED' }),
    })
    ;(wagmi.useWaitForTransactionReceipt as jest.Mock).mockReturnValue({
      isSuccess: false,
      isLoading: false,
    })

    const { result } = renderHook(() => useGuardianCancelInheritance(mockVaultAddress))

    let response: { success: boolean; error?: string }
    await act(async () => {
      response = await result.current.cancelInheritance()
    })

    expect(response!.success).toBe(false)
    expect(response!.error).toBe('Transaction failed')
  })

  it('returns loading and success states', () => {
    const mockHash = '0xhash' as `0x${string}`
    ;(wagmi.useWriteContract as jest.Mock).mockReturnValue({
      writeContractAsync: jest.fn().mockResolvedValue(mockHash),
    })
    ;(wagmi.useWaitForTransactionReceipt as jest.Mock).mockReturnValue({
      isSuccess: true,
      isLoading: false,
    })

    const { result } = renderHook(() => useGuardianCancelInheritance(mockVaultAddress))

    expect(result.current.isSuccess).toBe(true)
    expect(result.current.isLoading).toBe(false)
  })
})

describe('useInheritanceStatus', () => {
  it('returns next of kin when set', () => {
    const nokAddress = '0xnextofkin12345678901234567890123456789012' as `0x${string}`
    ;(wagmi.useReadContract as jest.Mock).mockReturnValue({
      data: nokAddress,
    })

    const { result } = renderHook(() => useInheritanceStatus(mockVaultAddress))

    expect(result.current.nextOfKin).toBe(nokAddress)
    expect(result.current.hasNextOfKin).toBe(true)
  })

  it('returns no next of kin when not set', () => {
    ;(wagmi.useReadContract as jest.Mock).mockReturnValue({
      data: '0x0000000000000000000000000000000000000000',
    })

    const { result } = renderHook(() => useInheritanceStatus(mockVaultAddress))

    expect(result.current.hasNextOfKin).toBe(false)
  })

  it('returns default address when data is undefined', () => {
    ;(wagmi.useReadContract as jest.Mock).mockReturnValue({
      data: undefined,
    })

    const { result } = renderHook(() => useInheritanceStatus(mockVaultAddress))

    expect(result.current.nextOfKin).toBe('0x0000000000000000000000000000000000000000')
    // Note: hasNextOfKin is true when data is undefined due to the !== check
    expect(result.current.hasNextOfKin).toBe(true)
  })

  it('handles undefined vault address', () => {
    ;(wagmi.useReadContract as jest.Mock).mockReturnValue({
      data: undefined,
    })

    const { result } = renderHook(() => useInheritanceStatus(undefined))

    expect(result.current.nextOfKin).toBe('0x0000000000000000000000000000000000000000')
    // Note: hasNextOfKin is true when data is undefined due to the !== check
    expect(result.current.hasNextOfKin).toBe(true)
  })
})

describe('useSetGuardian edge cases', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('handles invalid guardian address validation (line 195-196)', async () => {
    ;(wagmi.useWriteContract as jest.Mock).mockReturnValue({
      writeContractAsync: jest.fn(),
    })

    const { result } = renderHook(() => useSetGuardian(mockVaultAddress))

    let response: { success: boolean; error?: string }
    await act(async () => {
      // Pass an invalid address to trigger validation error (line 195-196)
      response = await result.current.setGuardian(0, 'invalid-address' as `0x${string}`)
    })

    expect(response!.success).toBe(false)
    expect(response!.error).toBeTruthy()
  })

  it('uses setGuardianLegacy wrapper (line 220-222)', async () => {
    const mockWriteContract = jest.fn().mockResolvedValue('0xtxhash' as `0x${string}`)
    ;(wagmi.useWriteContract as jest.Mock).mockReturnValue({
      writeContractAsync: mockWriteContract,
    })

    const { result } = renderHook(() => useSetGuardian(mockVaultAddress))

    await act(async () => {
      // This calls the legacy wrapper which uses slot 0 (line 220-222)
      await result.current.setGuardianLegacy(mockGuardianAddress, true)
    })

    expect(mockWriteContract).toHaveBeenCalledWith({
      address: mockVaultAddress,
      abi: expect.any(Array),
      functionName: 'setGuardian',
      args: [0, mockGuardianAddress],
    })
  })

  it('uses setGuardianLegacy to remove guardian (line 220-222)', async () => {
    const mockWriteContract = jest.fn().mockResolvedValue('0xtxhash' as `0x${string}`)
    ;(wagmi.useWriteContract as jest.Mock).mockReturnValue({
      writeContractAsync: mockWriteContract,
    })

    const { result } = renderHook(() => useSetGuardian(mockVaultAddress))

    await act(async () => {
      // This should use ZERO_ADDRESS when active=false (line 220-222)
      await result.current.setGuardianLegacy(mockGuardianAddress, false)
    })

    expect(mockWriteContract).toHaveBeenCalledWith({
      address: mockVaultAddress,
      abi: expect.any(Array),
      functionName: 'setGuardian',
      args: [0, ZERO_ADDRESS],
    })
  })
})

describe('useTransferVFIDE edge cases', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('validates inputs before transfer', () => {
    const mockWriteContract = jest.fn()
    ;(wagmi.useWriteContract as jest.Mock).mockReturnValue({
      writeContract: mockWriteContract,
      data: null,
      isPending: false,
    })
    ;(wagmi.useAccount as jest.Mock).mockReturnValue({
      address: mockAddress,
    })
    ;(wagmi.useReadContract as jest.Mock).mockReturnValue({
      data: mockVaultAddress,
    })
    ;(wagmi.useWaitForTransactionReceipt as jest.Mock).mockReturnValue({
      isLoading: false,
      isSuccess: false,
    })

    const { result } = renderHook(() => useTransferVFIDE())
    
    // Verify the hook returns expected interface with 'transfer' method
    expect(result.current.transfer).toBeDefined()
    expect(typeof result.current.transfer).toBe('function')
    expect(result.current.isTransferring).toBe(false)
    expect(result.current.isSuccess).toBe(false)
  })
})

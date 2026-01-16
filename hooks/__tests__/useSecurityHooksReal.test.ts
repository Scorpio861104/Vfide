// Tests for useSecurityHooks.ts - comprehensive coverage
import { describe, it, expect, beforeEach, Mock } from '@jest/globals'
import { renderHook, act } from '@testing-library/react'

// Mock wagmi before importing hooks
jest.mock('wagmi', () => ({
  useAccount: jest.fn(),
  useReadContract: jest.fn(),
  useWriteContract: jest.fn(),
  useWaitForTransactionReceipt: jest.fn(),
}))

// Mock abis
jest.mock('@/lib/abis', () => ({
  SecurityHubABI: [],
  PanicGuardABI: [],
  GuardianRegistryABI: [],
  GuardianLockABI: [],
  EmergencyBreakerABI: [],
  VaultHubABI: [],
}))

// Mock contracts
jest.mock('@/lib/contracts', () => ({
  CONTRACT_ADDRESSES: {
    SecurityHub: '0x1111111111111111111111111111111111111111',
    PanicGuard: '0x2222222222222222222222222222222222222222',
    GuardianRegistry: '0x3333333333333333333333333333333333333333',
    GuardianLock: '0x4444444444444444444444444444444444444444',
    EmergencyBreaker: '0x5555555555555555555555555555555555555555',
    VaultHub: '0x6666666666666666666666666666666666666666',
  },
}))

import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import {
  useIsVaultLocked,
  useQuarantineStatus,
  useCanSelfPanic,
  useSelfPanic,
  useVaultGuardians,
  useIsGuardian,
  useGuardianLockStatus,
  useCastGuardianLock,
  useEmergencyStatus,
} from '../useSecurityHooks'

describe('useSecurityHooks - Comprehensive Tests', () => {
  const mockAddress = '0x1234567890123456789012345678901234567890' as `0x${string}`
  const mockVaultAddress = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd' as `0x${string}`
  const mockGuardianAddress = '0x9876543210987654321098765432109876543210' as `0x${string}`
  const mockTxHash = '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef' as `0x${string}`

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useAccount as Mock).mockReturnValue({
      address: mockAddress,
      isConnected: true,
    })
    ;(useWriteContract as Mock).mockReturnValue({
      writeContract: jest.fn(),
      data: undefined,
      isPending: false,
    })
    ;(useWaitForTransactionReceipt as Mock).mockReturnValue({
      isSuccess: false,
      isLoading: false,
    })
  })

  // ==================== useIsVaultLocked ====================
  describe('useIsVaultLocked', () => {
    it('should return locked status when vault is locked', () => {
      ;(useReadContract as Mock).mockReturnValue({
        data: true,
        isLoading: false,
        refetch: jest.fn(),
      })

      const { result } = renderHook(() => useIsVaultLocked(mockVaultAddress))

      expect(result.current.isLocked).toBe(true)
      expect(result.current.isLoading).toBe(false)
    })

    it('should return not locked when vault is unlocked', () => {
      ;(useReadContract as Mock).mockReturnValue({
        data: false,
        isLoading: false,
        refetch: jest.fn(),
      })

      const { result } = renderHook(() => useIsVaultLocked(mockVaultAddress))

      expect(result.current.isLocked).toBe(false)
    })

    it('should handle loading state', () => {
      ;(useReadContract as Mock).mockReturnValue({
        data: undefined,
        isLoading: true,
        refetch: jest.fn(),
      })

      const { result } = renderHook(() => useIsVaultLocked(mockVaultAddress))

      expect(result.current.isLoading).toBe(true)
      expect(result.current.isLocked).toBe(false)
    })

    it('should provide refetch function', () => {
      const mockRefetch = jest.fn()
      ;(useReadContract as Mock).mockReturnValue({
        data: false,
        isLoading: false,
        refetch: mockRefetch,
      })

      const { result } = renderHook(() => useIsVaultLocked(mockVaultAddress))

      expect(result.current.refetch).toBe(mockRefetch)
    })

    it('should handle missing vault address', () => {
      ;(useReadContract as Mock).mockReturnValue({
        data: undefined,
        isLoading: false,
        refetch: jest.fn(),
      })

      const { result } = renderHook(() => useIsVaultLocked(undefined))

      expect(result.current.isLocked).toBe(false)
    })
  })

  // ==================== useQuarantineStatus ====================
  describe('useQuarantineStatus', () => {
    it('should return quarantine expiry time', () => {
      const futureTime = Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
      ;(useReadContract as Mock).mockReturnValue({
        data: BigInt(futureTime),
        isLoading: false,
      })

      const { result } = renderHook(() => useQuarantineStatus(mockVaultAddress))

      expect(result.current.quarantineUntil).toBe(futureTime)
      expect(result.current.isLoading).toBe(false)
    })

    it('should return 0 when not quarantined', () => {
      ;(useReadContract as Mock).mockReturnValue({
        data: BigInt(0),
        isLoading: false,
      })

      const { result } = renderHook(() => useQuarantineStatus(mockVaultAddress))

      expect(result.current.quarantineUntil).toBe(0)
    })

    it('should handle undefined data', () => {
      ;(useReadContract as Mock).mockReturnValue({
        data: undefined,
        isLoading: false,
      })

      const { result } = renderHook(() => useQuarantineStatus(undefined))

      expect(result.current.quarantineUntil).toBe(0)
    })
  })

  // ==================== useCanSelfPanic ====================
  describe('useCanSelfPanic', () => {
    it('should return panic timing info', () => {
      let callCount = 0
      ;(useReadContract as Mock).mockImplementation(() => {
        callCount++
        if (callCount === 1) {
          return { data: mockVaultAddress } // vaultOf
        } else if (callCount === 2) {
          return { data: BigInt(Math.floor(Date.now() / 1000) - 86400), isLoading: false } // lastSelfPanic
        } else {
          return { data: BigInt(Math.floor(Date.now() / 1000) - 7200), isLoading: false } // vaultCreationTime
        }
      })

      const { result } = renderHook(() => useCanSelfPanic())

      expect(result.current.cooldownSeconds).toBe(86400) // 24 hours
      expect(result.current.minAgeSeconds).toBe(3600) // 1 hour
      expect(result.current.isLoading).toBe(false)
    })

    it('should return defaults when no data', () => {
      ;(useReadContract as Mock).mockReturnValue({
        data: undefined,
        isLoading: false,
      })

      const { result } = renderHook(() => useCanSelfPanic())

      expect(result.current.lastPanicTime).toBe(0)
      expect(result.current.creationTime).toBe(0)
    })

    it('should show loading state', () => {
      ;(useReadContract as Mock).mockReturnValue({
        data: undefined,
        isLoading: true,
      })

      const { result } = renderHook(() => useCanSelfPanic())

      expect(result.current.isLoading).toBe(true)
    })
  })

  // ==================== useSelfPanic ====================
  describe('useSelfPanic', () => {
    it('should call selfPanic with duration', () => {
      const mockWriteContract = jest.fn()
      ;(useWriteContract as Mock).mockReturnValue({
        writeContract: mockWriteContract,
        data: undefined,
        isPending: false,
      })

      const { result } = renderHook(() => useSelfPanic())

      expect(result.current.isAvailable).toBe(true)

      act(() => {
        result.current.selfPanic(12) // 12 hours
      })

      expect(mockWriteContract).toHaveBeenCalledWith(
        expect.objectContaining({
          functionName: 'selfPanic',
          args: [BigInt(12 * 3600)],
        })
      )
    })

    it('should use default duration of 24 hours', () => {
      const mockWriteContract = jest.fn()
      ;(useWriteContract as Mock).mockReturnValue({
        writeContract: mockWriteContract,
        data: undefined,
        isPending: false,
      })

      const { result } = renderHook(() => useSelfPanic())

      act(() => {
        result.current.selfPanic()
      })

      expect(mockWriteContract).toHaveBeenCalledWith(
        expect.objectContaining({
          args: [BigInt(24 * 3600)],
        })
      )
    })

    it('should track transaction success', () => {
      ;(useWriteContract as Mock).mockReturnValue({
        writeContract: jest.fn(),
        data: mockTxHash,
        isPending: false,
      })
      ;(useWaitForTransactionReceipt as Mock).mockReturnValue({
        isLoading: false,
        isSuccess: true,
      })

      const { result } = renderHook(() => useSelfPanic())

      expect(result.current.isSuccess).toBe(true)
      expect(result.current.txHash).toBe(mockTxHash)
    })

    it('should show panicking state', () => {
      ;(useWriteContract as Mock).mockReturnValue({
        writeContract: jest.fn(),
        data: mockTxHash,
        isPending: true,
      })
      ;(useWaitForTransactionReceipt as Mock).mockReturnValue({
        isLoading: false,
        isSuccess: false,
      })

      const { result } = renderHook(() => useSelfPanic())

      expect(result.current.isPanicking).toBe(true)
    })
  })

  // ==================== useVaultGuardians ====================
  describe('useVaultGuardians', () => {
    it('should return guardian count and threshold', () => {
      let callCount = 0
      ;(useReadContract as Mock).mockImplementation(() => {
        callCount++
        if (callCount === 1) {
          return { data: BigInt(3) } // guardianCount
        } else {
          return { data: BigInt(2) } // threshold (guardiansNeeded)
        }
      })

      const { result } = renderHook(() => useVaultGuardians(mockVaultAddress))

      expect(result.current.guardianCount).toBe(3)
      expect(result.current.threshold).toBe(2)
    })

    it('should return zeros when no data', () => {
      ;(useReadContract as Mock).mockReturnValue({
        data: undefined,
      })

      const { result } = renderHook(() => useVaultGuardians(undefined))

      expect(result.current.guardianCount).toBe(0)
      expect(result.current.threshold).toBe(0)
    })
  })

  // ==================== useIsGuardian ====================
  describe('useIsGuardian', () => {
    it('should return true when address is guardian', () => {
      ;(useReadContract as Mock).mockReturnValue({
        data: true,
      })

      const { result } = renderHook(() =>
        useIsGuardian(mockVaultAddress, mockGuardianAddress)
      )

      expect(result.current).toBe(true)
    })

    it('should return false when address is not guardian', () => {
      ;(useReadContract as Mock).mockReturnValue({
        data: false,
      })

      const { result } = renderHook(() =>
        useIsGuardian(mockVaultAddress, mockGuardianAddress)
      )

      expect(result.current).toBe(false)
    })

    it('should return false when no data', () => {
      ;(useReadContract as Mock).mockReturnValue({
        data: undefined,
      })

      const { result } = renderHook(() => useIsGuardian(undefined, undefined))

      expect(result.current).toBe(false)
    })
  })

  // ==================== useGuardianLockStatus ====================
  describe('useGuardianLockStatus', () => {
    it('should return lock status and approval count', () => {
      let callCount = 0
      ;(useReadContract as Mock).mockImplementation(() => {
        callCount++
        if (callCount === 1) {
          return { data: true } // locked
        } else {
          return { data: BigInt(2) } // approvals
        }
      })

      const { result } = renderHook(() => useGuardianLockStatus(mockVaultAddress))

      expect(result.current.isLocked).toBe(true)
      expect(result.current.approvals).toBe(2)
    })

    it('should return defaults when no data', () => {
      ;(useReadContract as Mock).mockReturnValue({
        data: undefined,
      })

      const { result } = renderHook(() => useGuardianLockStatus(undefined))

      expect(result.current.isLocked).toBe(false)
      expect(result.current.approvals).toBe(0)
    })
  })

  // ==================== useCastGuardianLock ====================
  describe('useCastGuardianLock', () => {
    it('should cast lock vote with reason', () => {
      const mockWriteContract = jest.fn()
      ;(useWriteContract as Mock).mockReturnValue({
        writeContract: mockWriteContract,
        data: undefined,
        isPending: false,
      })

      const { result } = renderHook(() => useCastGuardianLock(mockVaultAddress))

      act(() => {
        result.current.castLock('Suspicious activity')
      })

      expect(mockWriteContract).toHaveBeenCalledWith(
        expect.objectContaining({
          functionName: 'castLock',
          args: [mockVaultAddress, 'Suspicious activity'],
        })
      )
    })

    it('should use default reason', () => {
      const mockWriteContract = jest.fn()
      ;(useWriteContract as Mock).mockReturnValue({
        writeContract: mockWriteContract,
        data: undefined,
        isPending: false,
      })

      const { result } = renderHook(() => useCastGuardianLock(mockVaultAddress))

      act(() => {
        result.current.castLock()
      })

      expect(mockWriteContract).toHaveBeenCalledWith(
        expect.objectContaining({
          args: [mockVaultAddress, 'Security concern'],
        })
      )
    })

    it('should track casting state', () => {
      ;(useWriteContract as Mock).mockReturnValue({
        writeContract: jest.fn(),
        data: mockTxHash,
        isPending: true,
      })

      const { result } = renderHook(() => useCastGuardianLock(mockVaultAddress))

      expect(result.current.isCasting).toBe(true)
    })

    it('should track success state', () => {
      ;(useWriteContract as Mock).mockReturnValue({
        writeContract: jest.fn(),
        data: mockTxHash,
        isPending: false,
      })
      ;(useWaitForTransactionReceipt as Mock).mockReturnValue({
        isLoading: false,
        isSuccess: true,
      })

      const { result } = renderHook(() => useCastGuardianLock(mockVaultAddress))

      expect(result.current.isSuccess).toBe(true)
      expect(result.current.txHash).toBe(mockTxHash)
    })
  })

  // ==================== useEmergencyStatus ====================
  describe('useEmergencyStatus', () => {
    it('should return emergency status when halted', () => {
      let callCount = 0
      ;(useReadContract as Mock).mockImplementation(() => {
        callCount++
        if (callCount === 1) {
          return { data: true, refetch: jest.fn() } // halted
        } else {
          return { data: false } // globalRisk
        }
      })

      const { result } = renderHook(() => useEmergencyStatus())

      expect(result.current.isHalted).toBe(true)
      expect(result.current.isEmergency).toBe(true)
    })

    it('should return emergency status when global risk', () => {
      let callCount = 0
      ;(useReadContract as Mock).mockImplementation(() => {
        callCount++
        if (callCount === 1) {
          return { data: false, refetch: jest.fn() } // halted
        } else {
          return { data: true } // globalRisk
        }
      })

      const { result } = renderHook(() => useEmergencyStatus())

      expect(result.current.isGlobalRisk).toBe(true)
      expect(result.current.isEmergency).toBe(true)
    })

    it('should return no emergency when all clear', () => {
      ;(useReadContract as Mock).mockReturnValue({
        data: false,
        refetch: jest.fn(),
      })

      const { result } = renderHook(() => useEmergencyStatus())

      expect(result.current.isHalted).toBe(false)
      expect(result.current.isGlobalRisk).toBe(false)
      expect(result.current.isEmergency).toBe(false)
    })

    it('should provide refetch function', () => {
      const mockRefetch = jest.fn()
      ;(useReadContract as Mock).mockReturnValue({
        data: false,
        refetch: mockRefetch,
      })

      const { result } = renderHook(() => useEmergencyStatus())

      expect(result.current.refetch).toBeDefined()
    })
  })
})

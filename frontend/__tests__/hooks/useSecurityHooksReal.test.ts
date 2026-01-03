/**
 * Real Security Hooks Tests
 * Tests for actual security hook implementations to increase coverage
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'

// Mock wagmi
const mockUseAccount = vi.fn()
const mockUseReadContract = vi.fn()
const mockUseWriteContract = vi.fn()
const mockUseWaitForTransactionReceipt = vi.fn()

vi.mock('wagmi', () => ({
  useAccount: () => mockUseAccount(),
  useReadContract: (args: unknown) => mockUseReadContract(args),
  useWriteContract: () => mockUseWriteContract(),
  useWaitForTransactionReceipt: () => mockUseWaitForTransactionReceipt(),
}))

// Mock contracts
vi.mock('../../lib/contracts', () => ({
  CONTRACT_ADDRESSES: {
    SecurityHub: '0x1234567890123456789012345678901234567890',
    PanicGuard: '0x0987654321098765432109876543210987654321',
    GuardianRegistry: '0xaaaa111122223333444455556666777788889999',
    GuardianLock: '0xbbbbccccddddeeeeffffaaaa111122223333',
    EmergencyBreaker: '0xcccc1111222233334444555566667777',
    VaultHub: '0xdddd8888999900001111222233334444',
  },
}))

// Mock ABIs
vi.mock('../../lib/abis', () => ({
  SecurityHubABI: [],
  PanicGuardABI: [],
  GuardianRegistryABI: [],
  GuardianLockABI: [],
  EmergencyBreakerABI: [],
  VaultHubABI: [],
}))

// Import hooks after mocks are set up
import {
  useIsVaultLocked,
  useQuarantineStatus,
  useCanSelfPanic,
} from '../../hooks/useSecurityHooks'

describe('useIsVaultLocked', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns true when vault is locked', () => {
    mockUseReadContract.mockReturnValue({
      data: true,
      isLoading: false,
      refetch: vi.fn(),
    })
    
    const { result } = renderHook(() => useIsVaultLocked('0xVaultAddress' as `0x${string}`))
    
    expect(result.current.isLocked).toBe(true)
  })

  it('returns false when vault is unlocked', () => {
    mockUseReadContract.mockReturnValue({
      data: false,
      isLoading: false,
      refetch: vi.fn(),
    })
    
    const { result } = renderHook(() => useIsVaultLocked('0xVaultAddress' as `0x${string}`))
    
    expect(result.current.isLocked).toBe(false)
  })

  it('returns false when data is undefined', () => {
    mockUseReadContract.mockReturnValue({
      data: undefined,
      isLoading: false,
      refetch: vi.fn(),
    })
    
    const { result } = renderHook(() => useIsVaultLocked('0xVaultAddress' as `0x${string}`))
    
    expect(result.current.isLocked).toBe(false)
  })

  it('returns loading state', () => {
    mockUseReadContract.mockReturnValue({
      data: undefined,
      isLoading: true,
      refetch: vi.fn(),
    })
    
    const { result } = renderHook(() => useIsVaultLocked('0xVaultAddress' as `0x${string}`))
    
    expect(result.current.isLoading).toBe(true)
  })

  it('provides refetch function', () => {
    const mockRefetch = vi.fn()
    mockUseReadContract.mockReturnValue({
      data: false,
      isLoading: false,
      refetch: mockRefetch,
    })
    
    const { result } = renderHook(() => useIsVaultLocked('0xVaultAddress' as `0x${string}`))
    
    expect(result.current.refetch).toBe(mockRefetch)
  })
})

describe('useQuarantineStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns quarantine timestamp when quarantined', () => {
    const quarantineTime = Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
    mockUseReadContract.mockReturnValue({
      data: BigInt(quarantineTime),
      isLoading: false,
    })
    
    const { result } = renderHook(() => useQuarantineStatus('0xVaultAddress' as `0x${string}`))
    
    expect(result.current.quarantineUntil).toBe(quarantineTime)
  })

  it('returns 0 when not quarantined', () => {
    mockUseReadContract.mockReturnValue({
      data: BigInt(0),
      isLoading: false,
    })
    
    const { result } = renderHook(() => useQuarantineStatus('0xVaultAddress' as `0x${string}`))
    
    expect(result.current.quarantineUntil).toBe(0)
  })

  it('returns 0 when data is undefined', () => {
    mockUseReadContract.mockReturnValue({
      data: undefined,
      isLoading: false,
    })
    
    const { result } = renderHook(() => useQuarantineStatus('0xVaultAddress' as `0x${string}`))
    
    expect(result.current.quarantineUntil).toBe(0)
  })

  it('returns loading state', () => {
    mockUseReadContract.mockReturnValue({
      data: undefined,
      isLoading: true,
    })
    
    const { result } = renderHook(() => useQuarantineStatus('0xVaultAddress' as `0x${string}`))
    
    expect(result.current.isLoading).toBe(true)
  })
})

describe('useCanSelfPanic', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAccount.mockReturnValue({ address: '0x1234' })
  })

  it('returns lastPanicTime from contract', () => {
    const lastPanicTime = Math.floor(Date.now() / 1000) - 3600 // 1 hour ago
    mockUseReadContract.mockImplementation((args: { functionName: string }) => {
      if (args.functionName === 'vaultOf') {
        return { data: '0xVaultAddress', isLoading: false }
      }
      if (args.functionName === 'lastSelfPanic') {
        return { data: BigInt(lastPanicTime), isLoading: false }
      }
      if (args.functionName === 'vaultCreationTime') {
        return { data: BigInt(1704067200), isLoading: false }
      }
      return { data: null, isLoading: false }
    })
    
    const { result } = renderHook(() => useCanSelfPanic())
    
    expect(result.current.lastPanicTime).toBe(lastPanicTime)
  })

  it('returns creationTime from contract', () => {
    const creationTime = 1704067200
    mockUseReadContract.mockImplementation((args: { functionName: string }) => {
      if (args.functionName === 'vaultOf') {
        return { data: '0xVaultAddress', isLoading: false }
      }
      if (args.functionName === 'lastSelfPanic') {
        return { data: BigInt(0), isLoading: false }
      }
      if (args.functionName === 'vaultCreationTime') {
        return { data: BigInt(creationTime), isLoading: false }
      }
      return { data: null, isLoading: false }
    })
    
    const { result } = renderHook(() => useCanSelfPanic())
    
    expect(result.current.creationTime).toBe(creationTime)
  })

  it('returns cooldown and minAge constants', () => {
    mockUseReadContract.mockReturnValue({
      data: null,
      isLoading: false,
    })
    
    const { result } = renderHook(() => useCanSelfPanic())
    
    expect(result.current.cooldownSeconds).toBe(86400) // 24 hours
    expect(result.current.minAgeSeconds).toBe(3600) // 1 hour
  })

  it('returns 0 for times when data is undefined', () => {
    mockUseReadContract.mockReturnValue({
      data: undefined,
      isLoading: false,
    })
    
    const { result } = renderHook(() => useCanSelfPanic())
    
    expect(result.current.lastPanicTime).toBe(0)
    expect(result.current.creationTime).toBe(0)
  })

  it('returns loading state when any contract is loading', () => {
    mockUseReadContract.mockImplementation((args: { functionName: string }) => {
      if (args.functionName === 'lastSelfPanic') {
        return { data: null, isLoading: true }
      }
      return { data: null, isLoading: false }
    })
    
    const { result } = renderHook(() => useCanSelfPanic())
    
    expect(result.current.isLoading).toBe(true)
  })
})

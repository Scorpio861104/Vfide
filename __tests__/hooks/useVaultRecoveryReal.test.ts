/**
 * Real VaultRecovery Hooks Tests
 * Tests for useVaultRecovery to increase coverage
 */

import { describe, it, expect, vi, beforeEach } from '@jest/globals'
import { renderHook, act } from '@testing-library/react'

// Mock wagmi
const mockUseAccount = jest.fn()
const mockUseReadContract = jest.fn()
const mockUseWriteContract = jest.fn()
const mockUseWatchContractEvent = jest.fn()
const mockUseChainId = jest.fn()
const mockUsePublicClient = jest.fn()
const mockIsCardBoundVaultMode = jest.fn(() => false)

jest.mock('wagmi', () => ({
  useAccount: () => mockUseAccount(),
  useReadContract: (args: unknown) => mockUseReadContract(args),
  useWriteContract: () => mockUseWriteContract(),
  useWatchContractEvent: (config: unknown) => mockUseWatchContractEvent(config),
  useChainId: () => mockUseChainId(),
  usePublicClient: () => mockUsePublicClient(),
}))

// Mock viem
jest.mock('viem', () => ({
  parseAbi: (abi: string[]) => abi,
  isAddress: (addr: string) => typeof addr === 'string' && addr.startsWith('0x') && addr.length === 42,
}))

jest.mock('@/lib/contracts', () => {
  const actual = jest.requireActual('@/lib/contracts')
  return {
    ...actual,
    isCardBoundVaultMode: () => mockIsCardBoundVaultMode(),
  }
})

// Import hooks after mocks
import { useVaultRecovery } from '../../hooks/useVaultRecovery'

describe('useVaultRecovery', () => {
  const mockWriteContractAsync = jest.fn()
  const testVaultAddress = '0x1234567890123456789012345678901234567890' as `0x${string}`
  const userAddress = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as `0x${string}`
  const ownerAddress = '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' as `0x${string}`
  const nextOfKinAddress = '0xcccccccccccccccccccccccccccccccccccccccc' as `0x${string}`
  const guardianAddress = '0xdddddddddddddddddddddddddddddddddddddddd' as `0x${string}`
  const candidateAddress = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee' as `0x${string}`

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseChainId.mockReturnValue(84532)
    mockUsePublicClient.mockReturnValue({ waitForTransactionReceipt: jest.fn().mockResolvedValue({}) })
    mockIsCardBoundVaultMode.mockReturnValue(false)
    mockUseAccount.mockReturnValue({ address: userAddress })
    mockUseWriteContract.mockReturnValue({
      writeContractAsync: mockWriteContractAsync,
      isPending: false,
    })
    mockUseReadContract.mockReturnValue({ data: undefined })
    mockUseWatchContractEvent.mockImplementation(() => {})
  })

  it('returns vaultOwner', () => {
    mockUseReadContract.mockImplementation(({ functionName }) => {
      if (functionName === 'owner') return { data: ownerAddress }
      return { data: undefined }
    })
    
    const { result } = renderHook(() => useVaultRecovery(testVaultAddress))
    
    expect(result.current.vaultOwner).toBe(ownerAddress)
  })

  it('returns guardianCount', () => {
    mockUseReadContract.mockImplementation(({ functionName }) => {
      if (functionName === 'guardianCount') return { data: BigInt(3) }
      return { data: undefined }
    })
    
    const { result } = renderHook(() => useVaultRecovery(testVaultAddress))
    
    expect(result.current.guardianCount).toBe(3)
  })

  it('returns guardianCount 0 when undefined', () => {
    mockUseReadContract.mockReturnValue({ data: undefined })
    
    const { result } = renderHook(() => useVaultRecovery(testVaultAddress))
    
    expect(result.current.guardianCount).toBe(0)
  })

  it('returns isUserGuardian true', () => {
    mockUseReadContract.mockImplementation(({ functionName }) => {
      if (functionName === 'isGuardian') return { data: true }
      return { data: undefined }
    })
    
    const { result } = renderHook(() => useVaultRecovery(testVaultAddress))
    
    expect(result.current.isUserGuardian).toBe(true)
  })

  it('returns isUserGuardian false', () => {
    mockUseReadContract.mockImplementation(({ functionName }) => {
      if (functionName === 'isGuardian') return { data: false }
      return { data: undefined }
    })
    
    const { result } = renderHook(() => useVaultRecovery(testVaultAddress))
    
    expect(result.current.isUserGuardian).toBe(false)
  })

  it('returns isGuardianMature true', () => {
    mockUseReadContract.mockImplementation(({ functionName }) => {
      if (functionName === 'isGuardianMature') return { data: true }
      if (functionName === 'isGuardian') return { data: true }
      return { data: undefined }
    })
    
    const { result } = renderHook(() => useVaultRecovery(testVaultAddress))
    
    // Hook exposes this as isUserGuardianMature
    expect(result.current.isUserGuardianMature).toBe(true)
  })

  it('returns nextOfKin', () => {
    mockUseReadContract.mockImplementation(({ functionName }) => {
      if (functionName === 'nextOfKin') return { data: nextOfKinAddress }
      return { data: undefined }
    })
    
    const { result } = renderHook(() => useVaultRecovery(testVaultAddress))
    
    expect(result.current.nextOfKin).toBe(nextOfKinAddress)
  })

  it('returns isWritePending', () => {
    mockUseWriteContract.mockReturnValue({
      writeContractAsync: mockWriteContractAsync,
      isPending: true,
    })
    
    const { result } = renderHook(() => useVaultRecovery(testVaultAddress))
    
    expect(result.current.isWritePending).toBe(true)
  })

  it('returns initial recoveryStatus', () => {
    const { result } = renderHook(() => useVaultRecovery(testVaultAddress))
    
    expect(result.current.recoveryStatus).toEqual({
      isActive: false,
      proposedOwner: null,
      approvals: 0,
      threshold: 0,
      expiryTime: null,
      daysRemaining: null,
    })
  })

  it('decodes recovery and inheritance tuple order from UserVault ABI', () => {
    const futureSec = BigInt(Math.floor(Date.now() / 1000) + 86400)

    mockUseReadContract.mockImplementation(({ functionName }) => {
      if (functionName === 'getRecoveryStatus') {
        return { data: [candidateAddress, 2n, 2n, futureSec, true] }
      }
      if (functionName === 'getInheritanceStatus') {
        return { data: [true, 1n, 2n, futureSec, false] }
      }
      return { data: undefined }
    })

    const { result } = renderHook(() => useVaultRecovery(testVaultAddress))

    expect(result.current.recoveryStatus.isActive).toBe(true)
    expect(result.current.recoveryStatus.proposedOwner).toBe(candidateAddress)
    expect(result.current.recoveryStatus.approvals).toBe(2)
    expect(result.current.recoveryStatus.threshold).toBe(2)

    expect(result.current.inheritanceStatus.isActive).toBe(true)
    expect(result.current.inheritanceStatus.approvals).toBe(1)
    expect(result.current.inheritanceStatus.threshold).toBe(2)
    expect(result.current.inheritanceStatus.denied).toBe(false)
  })

  describe('setNextOfKinAddress', () => {
    it('calls writeContractAsync with correct args', async () => {
      mockWriteContractAsync.mockResolvedValue('0xtx')
      
      const { result } = renderHook(() => useVaultRecovery(testVaultAddress))
      
      await act(async () => {
        await result.current.setNextOfKinAddress(nextOfKinAddress)
      })
      
      expect(mockWriteContractAsync).toHaveBeenCalledWith(expect.objectContaining({
        functionName: 'setNextOfKin',
        args: [nextOfKinAddress],
      }))
    })

    it('throws when no vault address', async () => {
      const { result } = renderHook(() => useVaultRecovery(undefined))
      
      await expect(result.current.setNextOfKinAddress(nextOfKinAddress))
        .rejects.toThrow('Vault address not provided')
    })
  })

  describe('addGuardian', () => {
    it('calls writeContractAsync with correct args', async () => {
      mockWriteContractAsync.mockResolvedValue('0xtx')
      
      const { result } = renderHook(() => useVaultRecovery(testVaultAddress))
      
      await act(async () => {
        await result.current.addGuardian(guardianAddress)
      })
      
      expect(mockWriteContractAsync).toHaveBeenCalledWith(expect.objectContaining({
        functionName: 'setGuardian',
        args: [guardianAddress, true],
      }))
    })

    it('throws when no vault address', async () => {
      const { result } = renderHook(() => useVaultRecovery(undefined))
      
      await expect(result.current.addGuardian(guardianAddress))
        .rejects.toThrow('Vault address not provided')
    })
  })

  describe('removeGuardian', () => {
    it('calls writeContractAsync with correct args', async () => {
      mockWriteContractAsync.mockResolvedValue('0xtx')
      
      const { result } = renderHook(() => useVaultRecovery(testVaultAddress))
      
      await act(async () => {
        await result.current.removeGuardian(guardianAddress)
      })
      
      expect(mockWriteContractAsync).toHaveBeenCalledWith(expect.objectContaining({
        functionName: 'setGuardian',
        args: [guardianAddress, false],
      }))
    })
  })

  describe('requestRecovery', () => {
    it('calls writeContractAsync with correct args', async () => {
      mockWriteContractAsync.mockResolvedValue('0xtx')
      
      const { result } = renderHook(() => useVaultRecovery(testVaultAddress))
      
      await act(async () => {
        await result.current.requestRecovery(candidateAddress)
      })
      
      expect(mockWriteContractAsync).toHaveBeenCalledWith(expect.objectContaining({
        functionName: 'requestRecovery',
        args: [candidateAddress],
      }))
    })

    it('throws when no vault address', async () => {
      const { result } = renderHook(() => useVaultRecovery(undefined))
      
      await expect(result.current.requestRecovery(candidateAddress))
        .rejects.toThrow('Vault address not provided')
    })
  })

  describe('approveRecovery', () => {
    it('calls writeContractAsync', async () => {
      mockWriteContractAsync.mockResolvedValue('0xtx')
      
      const { result } = renderHook(() => useVaultRecovery(testVaultAddress))
      
      await act(async () => {
        await result.current.approveRecovery()
      })
      
      expect(mockWriteContractAsync).toHaveBeenCalledWith(expect.objectContaining({
        functionName: 'guardianApproveRecovery',
      }))
    })

    it('throws when no vault address', async () => {
      const { result } = renderHook(() => useVaultRecovery(undefined))
      
      await expect(result.current.approveRecovery())
        .rejects.toThrow('Vault address not provided')
    })
  })

  describe('finalizeRecovery', () => {
    it('calls writeContractAsync', async () => {
      mockWriteContractAsync.mockResolvedValue('0xtx')
      
      const { result } = renderHook(() => useVaultRecovery(testVaultAddress))
      
      await act(async () => {
        await result.current.finalizeRecovery()
      })
      
      expect(mockWriteContractAsync).toHaveBeenCalledWith(expect.objectContaining({
        functionName: 'finalizeRecovery',
      }))
    })

    it('throws when no vault address', async () => {
      const { result } = renderHook(() => useVaultRecovery(undefined))
      
      await expect(result.current.finalizeRecovery())
        .rejects.toThrow('Vault address not provided')
    })
  })

  describe('cancelRecovery', () => {
    it('calls writeContractAsync', async () => {
      mockWriteContractAsync.mockResolvedValue('0xtx')
      
      const { result } = renderHook(() => useVaultRecovery(testVaultAddress))
      
      await act(async () => {
        await result.current.cancelRecovery()
      })
      
      expect(mockWriteContractAsync).toHaveBeenCalledWith(expect.objectContaining({
        functionName: 'cancelRecovery',
      }))
    })

    it('throws when no vault address', async () => {
      const { result } = renderHook(() => useVaultRecovery(undefined))
      
      await expect(result.current.cancelRecovery())
        .rejects.toThrow('Vault address not provided')
    })
  })

  describe('CardBound vault mode restrictions', () => {
    it('blocks recovery actions when CardBound mode is enabled', async () => {
      mockIsCardBoundVaultMode.mockReturnValue(true)
      mockWriteContractAsync.mockResolvedValue('0xtx')
      const { result } = renderHook(() => useVaultRecovery(testVaultAddress))

      await expect(result.current.setNextOfKinAddress(nextOfKinAddress))
        .rejects.toThrow('Inheritance is not supported in CardBound vault mode')

      await act(async () => {
        await result.current.requestRecovery(candidateAddress)
      })

      expect(mockWriteContractAsync).toHaveBeenCalledWith(expect.objectContaining({
        functionName: 'proposeWalletRotation',
        args: [candidateAddress, 604800n],
      }))
    })
  })
})

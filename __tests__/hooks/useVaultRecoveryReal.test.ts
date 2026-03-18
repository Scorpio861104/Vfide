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

jest.mock('wagmi', () => ({
  useAccount: () => mockUseAccount(),
  useReadContract: (args: unknown) => mockUseReadContract(args),
  useWriteContract: () => mockUseWriteContract(),
  useWatchContractEvent: (config: unknown) => mockUseWatchContractEvent(config),
}))

// Mock viem
jest.mock('viem', () => ({
  parseAbi: (abi: string[]) => abi,
  isAddress: (addr: string) => typeof addr === 'string' && addr.startsWith('0x') && addr.length === 42,
}))

// Import hooks after mocks
import { useVaultRecovery } from '../../hooks/useVaultRecovery'

describe('useVaultRecovery', () => {
  const mockWriteContractAsync = jest.fn()
  const testVaultAddress = '0x1234567890123456789012345678901234567890' as `0x${string}`

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseAccount.mockReturnValue({ address: '0xuser' })
    mockUseWriteContract.mockReturnValue({
      writeContractAsync: mockWriteContractAsync,
      isPending: false,
    })
    mockUseReadContract.mockReturnValue({ data: undefined })
    mockUseWatchContractEvent.mockImplementation(() => {})
  })

  it('returns vaultOwner', () => {
    mockUseReadContract.mockImplementation(({ functionName }) => {
      if (functionName === 'owner') return { data: '0xowner' }
      return { data: undefined }
    })
    
    const { result } = renderHook(() => useVaultRecovery(testVaultAddress))
    
    expect(result.current.vaultOwner).toBe('0xowner')
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
      if (functionName === 'nextOfKin') return { data: '0xnextofkin' }
      return { data: undefined }
    })
    
    const { result } = renderHook(() => useVaultRecovery(testVaultAddress))
    
    expect(result.current.nextOfKin).toBe('0xnextofkin')
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
        return { data: ['0xabc', 2n, 2n, futureSec, true] }
      }
      if (functionName === 'getInheritanceStatus') {
        return { data: [true, 1n, 2n, futureSec, false] }
      }
      return { data: undefined }
    })

    const { result } = renderHook(() => useVaultRecovery(testVaultAddress))

    expect(result.current.recoveryStatus.isActive).toBe(true)
    expect(result.current.recoveryStatus.proposedOwner).toBe('0xabc')
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
        await result.current.setNextOfKinAddress('0xkin')
      })
      
      expect(mockWriteContractAsync).toHaveBeenCalledWith(expect.objectContaining({
        functionName: 'setNextOfKin',
        args: ['0xkin'],
      }))
    })

    it('throws when no vault address', async () => {
      const { result } = renderHook(() => useVaultRecovery(undefined))
      
      await expect(result.current.setNextOfKinAddress('0xkin'))
        .rejects.toThrow('Vault address not provided')
    })
  })

  describe('addGuardian', () => {
    it('calls writeContractAsync with correct args', async () => {
      mockWriteContractAsync.mockResolvedValue('0xtx')
      
      const { result } = renderHook(() => useVaultRecovery(testVaultAddress))
      
      await act(async () => {
        await result.current.addGuardian('0xguardian')
      })
      
      expect(mockWriteContractAsync).toHaveBeenCalledWith(expect.objectContaining({
        functionName: 'setGuardian',
        args: ['0xguardian', true],
      }))
    })

    it('throws when no vault address', async () => {
      const { result } = renderHook(() => useVaultRecovery(undefined))
      
      await expect(result.current.addGuardian('0xguardian'))
        .rejects.toThrow('Vault address not provided')
    })
  })

  describe('removeGuardian', () => {
    it('calls writeContractAsync with correct args', async () => {
      mockWriteContractAsync.mockResolvedValue('0xtx')
      
      const { result } = renderHook(() => useVaultRecovery(testVaultAddress))
      
      await act(async () => {
        await result.current.removeGuardian('0xguardian')
      })
      
      expect(mockWriteContractAsync).toHaveBeenCalledWith(expect.objectContaining({
        functionName: 'setGuardian',
        args: ['0xguardian', false],
      }))
    })
  })

  describe('requestRecovery', () => {
    it('calls writeContractAsync with correct args', async () => {
      mockWriteContractAsync.mockResolvedValue('0xtx')
      
      const { result } = renderHook(() => useVaultRecovery(testVaultAddress))
      
      await act(async () => {
        await result.current.requestRecovery('0xnewowner')
      })
      
      expect(mockWriteContractAsync).toHaveBeenCalledWith(expect.objectContaining({
        functionName: 'requestRecovery',
        args: ['0xnewowner'],
      }))
    })

    it('throws when no vault address', async () => {
      const { result } = renderHook(() => useVaultRecovery(undefined))
      
      await expect(result.current.requestRecovery('0xnewowner'))
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
        functionName: 'approveRecovery',
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
})

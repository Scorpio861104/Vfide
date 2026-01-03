/**
 * Extended useSimpleVault Tests
 * Covers executeVaultAction flow and ProofScore tiers
 */

import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'

// Mock useVaultHub
vi.mock('../useVaultHub', () => ({
  useVaultHub: vi.fn(),
}))

// Mock wagmi
vi.mock('wagmi', () => ({
  useWriteContract: vi.fn(),
}))

// Mock utils
vi.mock('../../lib/utils', () => ({
  devLog: {
    error: vi.fn(),
    log: vi.fn(),
    warn: vi.fn(),
  },
}))

import { useWriteContract } from 'wagmi'
import { useVaultHub } from '../useVaultHub'
import {
  useSimpleVault,
  useVaultBalanceSimple,
  useProofScoreSimple,
} from '../useSimpleVault'

describe('useSimpleVault - Extended Tests', () => {
  const mockVaultAddress = '0x1234567890123456789012345678901234567890' as `0x${string}`
  const mockTargetContract = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd' as `0x${string}`
  const mockCallData = '0xdeadbeef' as `0x${string}`

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers({ shouldAdvanceTime: true })
    ;(useVaultHub as Mock).mockReturnValue({
      vaultAddress: mockVaultAddress,
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('executeVaultAction - Success Flow', () => {
    it('should progress through preparing state', async () => {
      const mockWriteContract = vi.fn().mockResolvedValue('0xtxhash')
      ;(useWriteContract as Mock).mockReturnValue({
        writeContract: mockWriteContract,
      })

      const { result } = renderHook(() => useSimpleVault())

      act(() => {
        result.current.executeVaultAction('Send Tokens', mockTargetContract, mockCallData, '💸')
      })

      // Should show preparing state quickly
      await waitFor(() => {
        expect(result.current.actionStatus).toBe('preparing')
      }, { timeout: 100 })
    })

    it('should include action name in preparing message', async () => {
      const mockWriteContract = vi.fn().mockResolvedValue('0xtxhash')
      ;(useWriteContract as Mock).mockReturnValue({
        writeContract: mockWriteContract,
      })

      const { result } = renderHook(() => useSimpleVault())

      act(() => {
        result.current.executeVaultAction('Stake Tokens', mockTargetContract, mockCallData)
      })

      await waitFor(() => {
        expect(result.current.userMessage).toContain('stake tokens')
      }, { timeout: 600 })
    })

    it('should call writeContract with correct vault execute params', async () => {
      const mockWriteContract = vi.fn().mockResolvedValue('0xtxhash')
      ;(useWriteContract as Mock).mockReturnValue({
        writeContract: mockWriteContract,
      })

      const { result } = renderHook(() => useSimpleVault())

      await act(async () => {
        result.current.executeVaultAction('Execute', mockTargetContract, mockCallData)
        // Advance past the 500ms delay
        await vi.advanceTimersByTimeAsync(600)
      })

      expect(mockWriteContract).toHaveBeenCalledWith(
        expect.objectContaining({
          address: mockVaultAddress,
          functionName: 'execute',
          args: [mockTargetContract, mockCallData],
        })
      )
    })

    it('should set signing status after preparing', async () => {
      const mockWriteContract = vi.fn().mockImplementation(() => {
        return new Promise(resolve => setTimeout(resolve, 1000))
      })
      ;(useWriteContract as Mock).mockReturnValue({
        writeContract: mockWriteContract,
      })

      const { result } = renderHook(() => useSimpleVault())

      act(() => {
        result.current.executeVaultAction('Sign', mockTargetContract, mockCallData)
      })

      // Advance past preparing delay
      await act(async () => {
        await vi.advanceTimersByTimeAsync(600)
      })

      expect(result.current.actionStatus).toBe('signing')
      expect(result.current.userMessage).toContain('sign')
    })

    it('should set confirming status after signing', async () => {
      const mockWriteContract = vi.fn().mockResolvedValue('0xtxhash')
      ;(useWriteContract as Mock).mockReturnValue({
        writeContract: mockWriteContract,
      })

      const { result } = renderHook(() => useSimpleVault())

      act(() => {
        result.current.executeVaultAction('Confirm Action', mockTargetContract, mockCallData)
      })

      // Advance past preparing delay and signing
      await act(async () => {
        await vi.advanceTimersByTimeAsync(600)
      })

      await waitFor(() => {
        expect(result.current.actionStatus).toBe('confirming')
      }, { timeout: 100 })
    })

    it('should reach success status after all steps', async () => {
      const mockWriteContract = vi.fn().mockResolvedValue('0xtxhash')
      ;(useWriteContract as Mock).mockReturnValue({
        writeContract: mockWriteContract,
      })

      const { result } = renderHook(() => useSimpleVault())

      act(() => {
        result.current.executeVaultAction('Complete', mockTargetContract, mockCallData)
      })

      // Advance through all timers
      await act(async () => {
        await vi.advanceTimersByTimeAsync(5000)
      })

      expect(result.current.actionStatus).toBe('success')
      expect(result.current.userMessage).toContain('successful')
    })

    it('should reset to idle after success', async () => {
      const mockWriteContract = vi.fn().mockResolvedValue('0xtxhash')
      ;(useWriteContract as Mock).mockReturnValue({
        writeContract: mockWriteContract,
      })

      const { result } = renderHook(() => useSimpleVault())

      act(() => {
        result.current.executeVaultAction('Reset Test', mockTargetContract, mockCallData)
      })

      // Advance through all timers including the 3s reset
      await act(async () => {
        await vi.advanceTimersByTimeAsync(10000)
      })

      expect(result.current.actionStatus).toBe('idle')
      expect(result.current.userMessage).toBe('')
    })
  })

  describe('executeVaultAction - Error Handling', () => {
    it('should set error status when writeContract fails', async () => {
      const mockWriteContract = vi.fn().mockRejectedValue(new Error('Transaction reverted'))
      ;(useWriteContract as Mock).mockReturnValue({
        writeContract: mockWriteContract,
      })

      const { result } = renderHook(() => useSimpleVault())

      act(() => {
        result.current.executeVaultAction('Fail Test', mockTargetContract, mockCallData)
      })

      // Advance past preparing delay
      await act(async () => {
        await vi.advanceTimersByTimeAsync(600)
      })

      await waitFor(() => {
        expect(result.current.actionStatus).toBe('error')
      }, { timeout: 200 })

      expect(result.current.userMessage).toContain('failed')
    })

    it('should include action name in error message', async () => {
      const mockWriteContract = vi.fn().mockRejectedValue(new Error('User rejected'))
      ;(useWriteContract as Mock).mockReturnValue({
        writeContract: mockWriteContract,
      })

      const { result } = renderHook(() => useSimpleVault())

      act(() => {
        result.current.executeVaultAction('Custom Action', mockTargetContract, mockCallData)
      })

      // Advance past preparing delay
      await act(async () => {
        await vi.advanceTimersByTimeAsync(600)
      })

      await waitFor(() => {
        expect(result.current.userMessage).toContain('Custom Action')
      }, { timeout: 200 })
    })

    it('should set error when no vault address', async () => {
      ;(useVaultHub as Mock).mockReturnValue({
        vaultAddress: undefined,
      })
      ;(useWriteContract as Mock).mockReturnValue({
        writeContract: vi.fn(),
      })

      const { result } = renderHook(() => useSimpleVault())

      await act(async () => {
        await result.current.executeVaultAction('No Vault', mockTargetContract, mockCallData)
      })

      expect(result.current.actionStatus).toBe('error')
      expect(result.current.userMessage).toContain('No vault found')
    })

    it('should set hasVault false when no vault address', () => {
      ;(useVaultHub as Mock).mockReturnValue({
        vaultAddress: undefined,
      })
      ;(useWriteContract as Mock).mockReturnValue({
        writeContract: vi.fn(),
      })

      const { result } = renderHook(() => useSimpleVault())

      expect(result.current.hasVault).toBe(false)
    })
  })

  describe('isLoading state', () => {
    it('should be true during preparing', async () => {
      const mockWriteContract = vi.fn().mockImplementation(() => new Promise(() => {}))
      ;(useWriteContract as Mock).mockReturnValue({
        writeContract: mockWriteContract,
      })

      const { result } = renderHook(() => useSimpleVault())

      act(() => {
        result.current.executeVaultAction('Loading Test', mockTargetContract, mockCallData)
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(true)
      })
    })

    it('should be true during signing', async () => {
      const mockWriteContract = vi.fn().mockImplementation(() => new Promise(() => {}))
      ;(useWriteContract as Mock).mockReturnValue({
        writeContract: mockWriteContract,
      })

      const { result } = renderHook(() => useSimpleVault())

      act(() => {
        result.current.executeVaultAction('Signing', mockTargetContract, mockCallData)
      })

      await act(async () => {
        await vi.advanceTimersByTimeAsync(600)
      })

      expect(result.current.actionStatus).toBe('signing')
      expect(result.current.isLoading).toBe(true)
    })

    it('should be false after success', async () => {
      const mockWriteContract = vi.fn().mockResolvedValue('0xtxhash')
      ;(useWriteContract as Mock).mockReturnValue({
        writeContract: mockWriteContract,
      })

      const { result } = renderHook(() => useSimpleVault())

      act(() => {
        result.current.executeVaultAction('Success', mockTargetContract, mockCallData)
      })

      await act(async () => {
        await vi.advanceTimersByTimeAsync(5000)
      })

      expect(result.current.actionStatus).toBe('success')
      expect(result.current.isLoading).toBe(false)
    })

    it('should be false after error', async () => {
      const mockWriteContract = vi.fn().mockRejectedValue(new Error('Error'))
      ;(useWriteContract as Mock).mockReturnValue({
        writeContract: mockWriteContract,
      })

      const { result } = renderHook(() => useSimpleVault())

      act(() => {
        result.current.executeVaultAction('Error', mockTargetContract, mockCallData)
      })

      await act(async () => {
        await vi.advanceTimersByTimeAsync(600)
      })

      await waitFor(() => {
        expect(result.current.actionStatus).toBe('error')
      })

      expect(result.current.isLoading).toBe(false)
    })
  })

  describe('Custom emoji', () => {
    it('should use default emoji when not provided', async () => {
      const mockWriteContract = vi.fn().mockResolvedValue('0xtxhash')
      ;(useWriteContract as Mock).mockReturnValue({
        writeContract: mockWriteContract,
      })

      const { result } = renderHook(() => useSimpleVault())

      act(() => {
        result.current.executeVaultAction('Default Emoji', mockTargetContract, mockCallData)
      })

      await waitFor(() => {
        expect(result.current.userMessage).toContain('🔐')
      })
    })

    it('should use provided emoji', async () => {
      const mockWriteContract = vi.fn().mockResolvedValue('0xtxhash')
      ;(useWriteContract as Mock).mockReturnValue({
        writeContract: mockWriteContract,
      })

      const { result } = renderHook(() => useSimpleVault())

      act(() => {
        result.current.executeVaultAction('Custom Emoji', mockTargetContract, mockCallData, '🚀')
      })

      await waitFor(() => {
        expect(result.current.userMessage).toContain('🚀')
      })
    })
  })
})

describe('useVaultBalanceSimple', () => {
  it('returns balance as BigInt(0)', () => {
    const { result } = renderHook(() => useVaultBalanceSimple())
    expect(result.current.balance).toBe(BigInt(0))
  })

  it('returns formatted as "0.00"', () => {
    const { result } = renderHook(() => useVaultBalanceSimple())
    expect(result.current.formatted).toBe('0.00')
  })

  it('returns loading as false', () => {
    const { result } = renderHook(() => useVaultBalanceSimple())
    expect(result.current.loading).toBe(false)
  })
})

describe('useProofScoreSimple - All Tiers', () => {
  it('returns NEUTRAL tier for default score', () => {
    const { result } = renderHook(() => useProofScoreSimple())
    expect(result.current.tier).toBe('NEUTRAL')
    expect(result.current.tierColor).toBe('#FFD700')
  })

  it('has score property', () => {
    const { result } = renderHook(() => useProofScoreSimple())
    expect(result.current.score).toBe(5000)
  })

  it('loading is always false for simple hook', () => {
    const { result } = renderHook(() => useProofScoreSimple())
    expect(result.current.loading).toBe(false)
  })
})

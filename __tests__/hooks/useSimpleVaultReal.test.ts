/**
 * Real Simple Vault Hooks Tests
 * Tests for useSimpleVault to increase coverage
 */

import { describe, it, expect, beforeEach } from '@jest/globals'
import { renderHook, act, waitFor } from '@testing-library/react'

// Mock useVaultHub first (before other imports)
const mockVaultAddress = jest.fn()

jest.mock('../../hooks/useVaultHub', () => ({
  useVaultHub: () => ({
    vaultAddress: mockVaultAddress(),
  }),
}))

// Mock wagmi
const mockWriteContract = jest.fn()

jest.mock('wagmi', () => ({
  useWriteContract: () => ({
    writeContract: mockWriteContract,
  }),
}))

// Mock utils
jest.mock('../../lib/utils', () => ({
  devLog: {
    error: jest.fn(),
    log: jest.fn(),
    warn: jest.fn(),
  },
}))

// Import hooks after mocks
import {
  useSimpleVault,
  useVaultBalanceSimple,
  useProofScoreSimple,
} from '../../hooks/useSimpleVault'

describe('useSimpleVault', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers({ shouldAdvanceTime: true })
    mockVaultAddress.mockReturnValue('0xvault123')
    mockWriteContract.mockResolvedValue('0xtxhash')
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('returns executeVaultAction function', () => {
    const { result } = renderHook(() => useSimpleVault())
    
    expect(typeof result.current.executeVaultAction).toBe('function')
  })

  it('returns initial actionStatus as idle', () => {
    const { result } = renderHook(() => useSimpleVault())
    
    expect(result.current.actionStatus).toBe('idle')
  })

  it('returns initial userMessage as empty', () => {
    const { result } = renderHook(() => useSimpleVault())
    
    expect(result.current.userMessage).toBe('')
  })

  it('returns isLoading false initially', () => {
    const { result } = renderHook(() => useSimpleVault())
    
    expect(result.current.isLoading).toBe(false)
  })

  it('returns hasVault true when vault address exists', () => {
    mockVaultAddress.mockReturnValue('0xvault123')
    
    const { result } = renderHook(() => useSimpleVault())
    
    expect(result.current.hasVault).toBe(true)
  })

  it('returns hasVault false when no vault address', () => {
    mockVaultAddress.mockReturnValue(undefined)
    
    const { result } = renderHook(() => useSimpleVault())
    
    expect(result.current.hasVault).toBe(false)
  })

  it('sets error status when no vault', async () => {
    mockVaultAddress.mockReturnValue(undefined)
    
    const { result } = renderHook(() => useSimpleVault())
    
    await act(async () => {
      await result.current.executeVaultAction('Test', '0xtarget', '0xdata')
    })
    
    expect(result.current.actionStatus).toBe('error')
    expect(result.current.userMessage).toContain('No vault found')
  })

  it('progresses through status states', async () => {
    const { result } = renderHook(() => useSimpleVault())
    
    // Start the action
    act(() => {
      result.current.executeVaultAction('Send Payment', '0xtarget', '0xdata', '💸')
    })
    
    // Should be preparing
    await waitFor(() => {
      expect(result.current.actionStatus).toBe('preparing')
    })
  })

  it('uses custom emoji in message', async () => {
    const { result } = renderHook(() => useSimpleVault())
    
    act(() => {
      result.current.executeVaultAction('Stake', '0xtarget', '0xdata', '🔒')
    })
    
    await waitFor(() => {
      expect(result.current.userMessage).toContain('🔒')
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

describe('useProofScoreSimple', () => {
  it('returns default score of 5000', () => {
    const { result } = renderHook(() => useProofScoreSimple())
    
    expect(result.current.score).toBe(5000)
  })

  it('returns NEUTRAL tier for default score', () => {
    const { result } = renderHook(() => useProofScoreSimple())
    
    expect(result.current.tier).toBe('NEUTRAL')
  })

  it('returns gold color for NEUTRAL tier', () => {
    const { result } = renderHook(() => useProofScoreSimple())
    
    expect(result.current.tierColor).toBe('#FFD700')
  })

  it('returns loading as false', () => {
    const { result } = renderHook(() => useProofScoreSimple())
    
    expect(result.current.loading).toBe(false)
  })
})

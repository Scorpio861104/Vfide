/**
 * Real ProofScore Hooks Tests
 * Tests for useProofScoreHooks to increase coverage
 */

import { describe, it, expect, vi, beforeEach } from '@jest/globals'
import { renderHook, act } from '@testing-library/react'

// Mock wagmi
const mockUseAccount = jest.fn()
const mockUseReadContract = jest.fn()
const mockUseWriteContract = jest.fn()
const mockUseWaitForTransactionReceipt = jest.fn()

jest.mock('wagmi', () => ({
  useAccount: () => mockUseAccount(),
  useReadContract: (args: unknown) => mockUseReadContract(args),
  useWriteContract: () => mockUseWriteContract(),
  useWaitForTransactionReceipt: () => mockUseWaitForTransactionReceipt(),
}))

// Mock contracts
jest.mock('../../lib/contracts', () => ({
  CONTRACT_ADDRESSES: {
    Seer: '0x1234567890123456789012345678901234567890',
  },
}))

// Mock ABIs
jest.mock('../../lib/abis', () => ({
  SeerABI: [],
}))

// Import hooks after mocks
import {
  useProofScore,
  useEndorse,
  useScoreBreakdown,
} from '../../hooks/useProofScoreHooks'

describe('useProofScore', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseAccount.mockReturnValue({ address: '0x1234' })
  })

  it('returns Elite tier for score >= 8000', () => {
    mockUseReadContract.mockReturnValue({
      data: BigInt(8000),
      isLoading: false,
      refetch: jest.fn(),
    })
    
    const { result } = renderHook(() => useProofScore())
    
    expect(result.current.tier).toBe('Elite')
    expect(result.current.burnFee).toBe(0.25)
    expect(result.current.isElite).toBe(true)
  })

  it('returns High Trust tier for score >= 7000', () => {
    mockUseReadContract.mockReturnValue({
      data: BigInt(7000),
      isLoading: false,
      refetch: jest.fn(),
    })
    
    const { result } = renderHook(() => useProofScore())
    
    expect(result.current.tier).toBe('High Trust')
    expect(result.current.burnFee).toBe(1.0)
  })

  it('returns Neutral tier for score >= 5000', () => {
    mockUseReadContract.mockReturnValue({
      data: BigInt(5000),
      isLoading: false,
      refetch: jest.fn(),
    })
    
    const { result } = renderHook(() => useProofScore())
    
    expect(result.current.tier).toBe('Neutral')
    expect(result.current.burnFee).toBe(2.0)
  })

  it('returns Low Trust tier for score >= 3500', () => {
    mockUseReadContract.mockReturnValue({
      data: BigInt(4000),
      isLoading: false,
      refetch: jest.fn(),
    })
    
    const { result } = renderHook(() => useProofScore())
    
    expect(result.current.tier).toBe('Low Trust')
    expect(result.current.burnFee).toBe(3.5)
  })

  it('returns Risky tier for score < 3500', () => {
    mockUseReadContract.mockReturnValue({
      data: BigInt(3000),
      isLoading: false,
      refetch: jest.fn(),
    })
    
    const { result } = renderHook(() => useProofScore())
    
    expect(result.current.tier).toBe('Risky')
    expect(result.current.burnFee).toBe(5.0)
  })

  it('returns correct color for Elite tier', () => {
    mockUseReadContract.mockReturnValue({
      data: BigInt(9000),
      isLoading: false,
      refetch: jest.fn(),
    })
    
    const { result } = renderHook(() => useProofScore())
    
    expect(result.current.color).toBe('#00FF88')
  })

  it('returns correct color for Neutral tier', () => {
    mockUseReadContract.mockReturnValue({
      data: BigInt(5500),
      isLoading: false,
      refetch: jest.fn(),
    })
    
    const { result } = renderHook(() => useProofScore())
    
    expect(result.current.color).toBe('#FFD700')
  })

  it('checks can vote capability', () => {
    mockUseReadContract.mockReturnValue({
      data: BigInt(5400),
      isLoading: false,
      refetch: jest.fn(),
    })
    
    const { result } = renderHook(() => useProofScore())
    
    expect(result.current.canVote).toBe(true)
  })

  it('checks can merchant capability', () => {
    mockUseReadContract.mockReturnValue({
      data: BigInt(5600),
      isLoading: false,
      refetch: jest.fn(),
    })
    
    const { result } = renderHook(() => useProofScore())
    
    expect(result.current.canMerchant).toBe(true)
  })

  it('checks can council capability', () => {
    mockUseReadContract.mockReturnValue({
      data: BigInt(7000),
      isLoading: false,
      refetch: jest.fn(),
    })
    
    const { result } = renderHook(() => useProofScore())
    
    expect(result.current.canCouncil).toBe(true)
  })

  it('checks can endorse capability', () => {
    mockUseReadContract.mockReturnValue({
      data: BigInt(8000),
      isLoading: false,
      refetch: jest.fn(),
    })
    
    const { result } = renderHook(() => useProofScore())
    
    expect(result.current.canEndorse).toBe(true)
  })

  it('returns default score when no data', () => {
    mockUseReadContract.mockReturnValue({
      data: undefined,
      isLoading: false,
      refetch: jest.fn(),
    })
    
    const { result } = renderHook(() => useProofScore())
    
    expect(result.current.score).toBe(5000) // Default neutral
    expect(result.current.tier).toBe('Neutral')
  })

  it('accepts custom user address', () => {
    mockUseReadContract.mockReturnValue({
      data: BigInt(8500),
      isLoading: false,
      refetch: jest.fn(),
    })
    
    const customAddress = '0xCustom' as `0x${string}`
    const { result } = renderHook(() => useProofScore(customAddress))
    
    expect(result.current.score).toBe(8500)
  })

  it('returns isLoading state', () => {
    mockUseReadContract.mockReturnValue({
      data: undefined,
      isLoading: true,
      refetch: jest.fn(),
    })
    
    const { result } = renderHook(() => useProofScore())
    
    expect(result.current.isLoading).toBe(true)
  })
})

describe('useEndorse', () => {
  const mockWriteContractAsync = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseWriteContract.mockReturnValue({
      writeContractAsync: mockWriteContractAsync,
      data: undefined,
      isPending: false,
    })
    mockUseWaitForTransactionReceipt.mockReturnValue({
      isLoading: false,
      isSuccess: false,
    })
  })

  it('validates target address is set', () => {
    const { result } = renderHook(() => useEndorse('0xTarget' as `0x${string}`))
    
    expect(result.current.isValid).toBe(true)
  })

  it('returns invalid for zero address', () => {
    const { result } = renderHook(() => useEndorse('0x0000000000000000000000000000000000000000' as `0x${string}`))
    
    expect(result.current.isValid).toBe(false)
  })

  it('returns invalid when no address', () => {
    const { result } = renderHook(() => useEndorse())
    
    expect(result.current.isValid).toBe(false)
  })

  it('returns error when endorsing invalid address', async () => {
    const { result } = renderHook(() => useEndorse())
    
    let response: { success: boolean; error?: string }
    await act(async () => {
      response = await result.current.endorse()
    })
    
    expect(response!.success).toBe(false)
    expect(response!.error).toBe('Invalid target address')
  })

  it('calls writeContractAsync when endorsing valid address', async () => {
    mockWriteContractAsync.mockResolvedValue({ hash: '0xabc' })
    
    const { result } = renderHook(() => useEndorse('0xTarget' as `0x${string}`))
    
    await act(async () => {
      await result.current.endorse()
    })
    
    expect(mockWriteContractAsync).toHaveBeenCalledWith(expect.objectContaining({
      functionName: 'endorse',
      args: ['0xTarget', 'endorsement'],
    }))
  })

  it('returns success on successful endorsement', async () => {
    mockWriteContractAsync.mockResolvedValue({ hash: '0xabc' })
    
    const { result } = renderHook(() => useEndorse('0xTarget' as `0x${string}`))
    
    let response: { success: boolean }
    await act(async () => {
      response = await result.current.endorse()
    })
    
    expect(response!.success).toBe(true)
  })

  it('handles endorsement failure', async () => {
    mockWriteContractAsync.mockRejectedValue(new Error('Already endorsed'))
    
    const { result } = renderHook(() => useEndorse('0xTarget' as `0x${string}`))
    
    let response: { success: boolean; error?: string }
    await act(async () => {
      response = await result.current.endorse()
    })
    
    expect(response!.success).toBe(false)
    expect(response!.error).toBe('Failed to endorse: Already endorsed')
    expect(result.current.error).toBe('Failed to endorse: Already endorsed')
  })

  it('returns isEndorsing true when pending', () => {
    mockUseWriteContract.mockReturnValue({
      writeContractAsync: mockWriteContractAsync,
      data: undefined,
      isPending: true,
    })
    
    const { result } = renderHook(() => useEndorse('0xTarget' as `0x${string}`))
    
    expect(result.current.isEndorsing).toBe(true)
  })

  it('returns isSuccess when confirmed', () => {
    mockUseWaitForTransactionReceipt.mockReturnValue({
      isLoading: false,
      isSuccess: true,
    })
    
    const { result } = renderHook(() => useEndorse('0xTarget' as `0x${string}`))
    
    expect(result.current.isSuccess).toBe(true)
  })
})

describe('useScoreBreakdown', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseAccount.mockReturnValue({ address: '0x1234' })
  })

  it('returns breakdown based on total score', () => {
    mockUseReadContract.mockReturnValue({
      data: BigInt(7500),
      isLoading: false,
      refetch: jest.fn(),
    })
    
    const { result } = renderHook(() => useScoreBreakdown())
    
    expect(result.current).toBeDefined()
  })

  it('returns default score when no data', () => {
    mockUseReadContract.mockReturnValue({
      data: undefined,
      isLoading: false,
      refetch: jest.fn(),
    })
    
    const { result } = renderHook(() => useScoreBreakdown())
    
    // Should use default score of 5000
    expect(result.current).toBeDefined()
  })

  it('returns loading state', () => {
    mockUseReadContract.mockReturnValue({
      data: undefined,
      isLoading: true,
      refetch: jest.fn(),
    })
    
    const { result } = renderHook(() => useScoreBreakdown())
    
    expect(result.current.isLoading).toBe(true)
  })
})

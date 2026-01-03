/**
 * Real Mentor Hooks Tests
 * Tests for useMentorHooks to increase coverage
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
    Seer: '0x1234567890123456789012345678901234567890',
  },
}))

// Mock ABIs
vi.mock('../../lib/abis', () => ({
  SeerABI: [],
}))

// Import hooks after mocks
import {
  useIsMentor,
  useBecomeMentor,
  useSponsorMentee,
  useMentorInfo,
} from '../../hooks/useMentorHooks'

describe('useIsMentor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAccount.mockReturnValue({ address: '0xuser' })
  })

  it('returns isMentor true when data is true', () => {
    mockUseReadContract.mockReturnValue({
      data: true,
      isLoading: false,
    })
    
    const { result } = renderHook(() => useIsMentor())
    
    expect(result.current.isMentor).toBe(true)
  })

  it('returns isMentor false when data is false', () => {
    mockUseReadContract.mockReturnValue({
      data: false,
      isLoading: false,
    })
    
    const { result } = renderHook(() => useIsMentor())
    
    expect(result.current.isMentor).toBe(false)
  })

  it('returns isMentor false when data is undefined', () => {
    mockUseReadContract.mockReturnValue({
      data: undefined,
      isLoading: false,
    })
    
    const { result } = renderHook(() => useIsMentor())
    
    expect(result.current.isMentor).toBe(false)
  })

  it('returns isLoading state', () => {
    mockUseReadContract.mockReturnValue({
      data: undefined,
      isLoading: true,
    })
    
    const { result } = renderHook(() => useIsMentor())
    
    expect(result.current.isLoading).toBe(true)
  })

  it('uses connected address when no address provided', () => {
    mockUseAccount.mockReturnValue({ address: '0xconnected' })
    mockUseReadContract.mockReturnValue({ data: true, isLoading: false })
    
    renderHook(() => useIsMentor())
    
    expect(mockUseReadContract).toHaveBeenCalledWith(expect.objectContaining({
      args: ['0xconnected'],
    }))
  })

  it('uses provided address when given', () => {
    mockUseAccount.mockReturnValue({ address: '0xconnected' })
    mockUseReadContract.mockReturnValue({ data: true, isLoading: false })
    
    renderHook(() => useIsMentor('0xprovided'))
    
    expect(mockUseReadContract).toHaveBeenCalledWith(expect.objectContaining({
      args: ['0xprovided'],
    }))
  })
})

describe('useBecomeMentor', () => {
  const mockWriteContract = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockUseWriteContract.mockReturnValue({
      writeContract: mockWriteContract,
      data: undefined,
      isPending: false,
    })
    mockUseWaitForTransactionReceipt.mockReturnValue({
      isLoading: false,
      isSuccess: false,
    })
  })

  it('provides becomeMentor function', () => {
    const { result } = renderHook(() => useBecomeMentor())
    
    expect(typeof result.current.becomeMentor).toBe('function')
  })

  it('returns isLoading false when not pending', () => {
    const { result } = renderHook(() => useBecomeMentor())
    
    expect(result.current.isLoading).toBe(false)
  })

  it('returns isLoading true when pending', () => {
    mockUseWriteContract.mockReturnValue({
      writeContract: mockWriteContract,
      data: undefined,
      isPending: true,
    })
    
    const { result } = renderHook(() => useBecomeMentor())
    
    expect(result.current.isLoading).toBe(true)
  })

  it('returns isLoading true when confirming', () => {
    mockUseWaitForTransactionReceipt.mockReturnValue({
      isLoading: true,
      isSuccess: false,
    })
    
    const { result } = renderHook(() => useBecomeMentor())
    
    expect(result.current.isLoading).toBe(true)
  })

  it('returns isSuccess when confirmed', () => {
    mockUseWaitForTransactionReceipt.mockReturnValue({
      isLoading: false,
      isSuccess: true,
    })
    
    const { result } = renderHook(() => useBecomeMentor())
    
    expect(result.current.isSuccess).toBe(true)
  })

  it('calls writeContract when becomeMentor is called', () => {
    const { result } = renderHook(() => useBecomeMentor())
    
    result.current.becomeMentor()
    
    expect(mockWriteContract).toHaveBeenCalledWith(expect.objectContaining({
      functionName: 'becomeMentor',
    }))
  })
})

describe('useSponsorMentee', () => {
  const mockWriteContract = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockUseWriteContract.mockReturnValue({
      writeContract: mockWriteContract,
      data: undefined,
      isPending: false,
    })
    mockUseWaitForTransactionReceipt.mockReturnValue({
      isLoading: false,
      isSuccess: false,
    })
  })

  it('provides sponsorMentee function', () => {
    const { result } = renderHook(() => useSponsorMentee('0xmentee'))
    
    expect(typeof result.current.sponsorMentee).toBe('function')
  })

  it('returns isSponsoring false when not pending', () => {
    const { result } = renderHook(() => useSponsorMentee('0xmentee'))
    
    expect(result.current.isSponsoring).toBe(false)
  })

  it('returns isSponsoring true when pending', () => {
    mockUseWriteContract.mockReturnValue({
      writeContract: mockWriteContract,
      data: undefined,
      isPending: true,
    })
    
    const { result } = renderHook(() => useSponsorMentee('0xmentee'))
    
    expect(result.current.isSponsoring).toBe(true)
  })

  it('calls writeContract with mentee address', () => {
    const { result } = renderHook(() => useSponsorMentee('0xmentee123'))
    
    result.current.sponsorMentee()
    
    expect(mockWriteContract).toHaveBeenCalledWith(expect.objectContaining({
      functionName: 'sponsorMentee',
      args: ['0xmentee123'],
    }))
  })
})

describe('useMentorInfo', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAccount.mockReturnValue({ address: '0xuser' })
  })

  it('returns mentorAddress when available', () => {
    mockUseReadContract.mockImplementation(({ functionName }) => {
      if (functionName === 'mentorOf') return { data: '0xmentor' }
      if (functionName === 'menteeCount') return { data: BigInt(5) }
      if (functionName === 'highScoreFirstAchievedAt') return { data: BigInt(1000) }
      return { data: undefined }
    })
    
    const { result } = renderHook(() => useMentorInfo())
    
    expect(result.current.mentorAddress).toBe('0xmentor')
  })

  it('returns hasMentor true when mentor is set', () => {
    mockUseReadContract.mockImplementation(({ functionName }) => {
      if (functionName === 'mentorOf') return { data: '0xmentor' }
      if (functionName === 'menteeCount') return { data: BigInt(5) }
      if (functionName === 'highScoreFirstAchievedAt') return { data: BigInt(1000) }
      return { data: undefined }
    })
    
    const { result } = renderHook(() => useMentorInfo())
    
    expect(result.current.hasMentor).toBe(true)
  })

  it('returns hasMentor false when mentor is zero address', () => {
    mockUseReadContract.mockImplementation(({ functionName }) => {
      if (functionName === 'mentorOf') return { data: '0x0000000000000000000000000000000000000000' }
      return { data: undefined }
    })
    
    const { result } = renderHook(() => useMentorInfo())
    
    expect(result.current.hasMentor).toBeFalsy()
  })

  it('returns menteeCount', () => {
    mockUseReadContract.mockImplementation(({ functionName }) => {
      if (functionName === 'mentorOf') return { data: undefined }
      if (functionName === 'menteeCount') return { data: BigInt(10) }
      if (functionName === 'highScoreFirstAchievedAt') return { data: undefined }
      return { data: undefined }
    })
    
    const { result } = renderHook(() => useMentorInfo())
    
    expect(result.current.menteeCount).toBe(10)
  })

  it('returns menteeCount 0 when undefined', () => {
    mockUseReadContract.mockImplementation(() => ({ data: undefined }))
    
    const { result } = renderHook(() => useMentorInfo())
    
    expect(result.current.menteeCount).toBe(0)
  })

  it('returns canBecomeMentor true when highScore achieved', () => {
    mockUseReadContract.mockImplementation(({ functionName }) => {
      if (functionName === 'highScoreFirstAchievedAt') return { data: BigInt(Math.floor(Date.now() / 1000)) }
      return { data: undefined }
    })
    
    const { result } = renderHook(() => useMentorInfo())
    
    expect(result.current.canBecomeMentor).toBeTruthy()
  })

  it('returns highScoreTimestamp', () => {
    const timestamp = 1234567890
    mockUseReadContract.mockImplementation(({ functionName }) => {
      if (functionName === 'highScoreFirstAchievedAt') return { data: BigInt(timestamp) }
      return { data: undefined }
    })
    
    const { result } = renderHook(() => useMentorInfo())
    
    expect(result.current.highScoreTimestamp).toBe(timestamp)
  })

  it('calculates mentorEligibleAt', () => {
    const timestamp = 1234567890
    mockUseReadContract.mockImplementation(({ functionName }) => {
      if (functionName === 'highScoreFirstAchievedAt') return { data: BigInt(timestamp) }
      return { data: undefined }
    })
    
    const { result } = renderHook(() => useMentorInfo())
    
    // 30 days in seconds
    const thirtyDays = 30 * 24 * 60 * 60
    expect(result.current.mentorEligibleAt).toBe(timestamp + thirtyDays)
  })
})

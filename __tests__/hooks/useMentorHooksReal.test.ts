/**
 * Real Mentor Hooks Tests
 * Tests for useMentorHooks to increase coverage
 */

import { describe, it, expect, vi, beforeEach } from '@jest/globals'
import { renderHook } from '@testing-library/react'

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
jest.mock('../../lib/contracts', () => {
  const contractAddresses = {
    Seer: '0x1234567890123456789012345678901234567890',
    SeerView: '0x1234567890123456789012345678901234567891',
    SeerSocial: '0x1234567890123456789012345678901234567892',
  }

  return {
    CONTRACT_ADDRESSES: contractAddresses,
    ZERO_ADDRESS: '0x0000000000000000000000000000000000000000',
    isConfiguredContractAddress: (address?: string | null) =>
      typeof address === 'string' &&
      address !== '0x0000000000000000000000000000000000000000' &&
      address.startsWith('0x') &&
      address.length === 42,
    getContractConfigurationError: (name: string) => new Error(`[VFIDE] ${name} contract not configured.`),
  }
})

// Mock ABIs
jest.mock('../../lib/abis', () => ({
  SeerABI: [],
}))

// Import hooks after mocks
import {
  useIsMentor,
  useBecomeMentor,
  useSponsorMentee,
  useMentorInfo,
} from '../../hooks/useMentorHooks'
import { CONTRACT_ADDRESSES as mockContractAddresses } from '../../lib/contracts'

describe('useIsMentor', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseAccount.mockReturnValue({ address: '0xuser' })
    mockContractAddresses.Seer = '0x1234567890123456789012345678901234567890'
    mockContractAddresses.SeerView = '0x1234567890123456789012345678901234567891'
    mockContractAddresses.SeerSocial = '0x1234567890123456789012345678901234567892'
  })

  it('returns isMentor true when data is true', () => {
    // getMentorInfo returns tuple: [isMentor, mentor, menteeCount, hasMentor, canBecomeMentor, minScoreToMentor, currentScore]
    mockUseReadContract.mockReturnValue({
      data: [true, '0xmentor', BigInt(5), true, false, BigInt(7000), BigInt(8000)],
      isLoading: false,
    })
    
    const { result } = renderHook(() => useIsMentor())
    
    expect(result.current.isMentor).toBe(true)
  })

  it('returns isMentor false when data is false', () => {
    mockUseReadContract.mockReturnValue({
      data: [false, '0x0000000000000000000000000000000000000000', BigInt(0), false, false, BigInt(7000), BigInt(5000)],
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

  it('reports unavailable when mentor contracts are not configured', () => {
    mockContractAddresses.SeerView = '0x0000000000000000000000000000000000000000'
    mockContractAddresses.SeerSocial = '0x0000000000000000000000000000000000000000'
    mockUseReadContract.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    })

    const { result } = renderHook(() => useIsMentor())

    expect(result.current.isAvailable).toBe(false)
  })

  it('uses connected address when no address provided', () => {
    mockUseAccount.mockReturnValue({ address: '0xconnected' })
    mockUseReadContract.mockReturnValue({ data: [true, '0xmentor', BigInt(0), false, false, BigInt(0), BigInt(0)], isLoading: false })
    
    renderHook(() => useIsMentor('0xconnected'))
    
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
  const mockWriteContract = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    mockContractAddresses.Seer = '0x1234567890123456789012345678901234567890'
    mockContractAddresses.SeerView = '0x1234567890123456789012345678901234567891'
    mockContractAddresses.SeerSocial = '0x1234567890123456789012345678901234567892'
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

  it('fails closed when SeerSocial is not configured', () => {
    mockContractAddresses.SeerSocial = '0x0000000000000000000000000000000000000000'

    const { result } = renderHook(() => useBecomeMentor())

    result.current.becomeMentor()

    expect(result.current.isAvailable).toBe(false)
    expect(mockWriteContract).not.toHaveBeenCalled()
  })
})

describe('useSponsorMentee', () => {
  const mockWriteContract = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    mockContractAddresses.Seer = '0x1234567890123456789012345678901234567890'
    mockContractAddresses.SeerView = '0x1234567890123456789012345678901234567891'
    mockContractAddresses.SeerSocial = '0x1234567890123456789012345678901234567892'
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
    jest.clearAllMocks()
    mockUseAccount.mockReturnValue({ address: '0xuser' })
  })

  // Hook returns tuple: [isMentor, mentor, menteeCount, hasMentor, canBecomeMentor, minScoreToMentor, currentScore]
  it('returns mentor address when available', () => {
    mockUseReadContract.mockReturnValue({
      data: [true, '0xmentor' as `0x${string}`, BigInt(5), true, false, BigInt(7000), BigInt(8000)],
      isLoading: false,
    })
    
    const { result } = renderHook(() => useMentorInfo('0xuser'))
    
    expect(result.current.mentor).toBe('0xmentor')
  })

  it('returns hasMentor true when mentor is set', () => {
    mockUseReadContract.mockReturnValue({
      data: [true, '0xmentor' as `0x${string}`, BigInt(5), true, false, BigInt(7000), BigInt(8000)],
      isLoading: false,
    })
    
    const { result } = renderHook(() => useMentorInfo('0xuser'))
    
    expect(result.current.hasMentor).toBe(true)
  })

  it('returns hasMentor false when mentor is zero address', () => {
    mockUseReadContract.mockReturnValue({
      data: [false, '0x0000000000000000000000000000000000000000' as `0x${string}`, BigInt(0), false, false, BigInt(7000), BigInt(5000)],
      isLoading: false,
    })
    
    const { result } = renderHook(() => useMentorInfo('0xuser'))
    
    expect(result.current.hasMentor).toBeFalsy()
  })

  it('returns menteeCount', () => {
    mockUseReadContract.mockReturnValue({
      data: [true, '0xmentor' as `0x${string}`, BigInt(10), true, false, BigInt(7000), BigInt(8000)],
      isLoading: false,
    })
    
    const { result } = renderHook(() => useMentorInfo('0xuser'))
    
    expect(result.current.menteeCount).toBe(10)
  })

  it('returns menteeCount 0 when undefined', () => {
    mockUseReadContract.mockReturnValue({ data: undefined, isLoading: false })
    
    const { result } = renderHook(() => useMentorInfo('0xuser'))
    
    expect(result.current.menteeCount).toBe(0)
  })

  it('returns canBecomeMentor true when flag is true', () => {
    mockUseReadContract.mockReturnValue({
      data: [false, '0x0000000000000000000000000000000000000000' as `0x${string}`, BigInt(0), false, true, BigInt(7000), BigInt(8000)],
      isLoading: false,
    })
    
    const { result } = renderHook(() => useMentorInfo('0xuser'))
    
    expect(result.current.canBecomeMentor).toBeTruthy()
  })

  it('returns minScoreToMentor', () => {
    mockUseReadContract.mockReturnValue({
      data: [false, '0x0000000000000000000000000000000000000000' as `0x${string}`, BigInt(0), false, false, BigInt(7000), BigInt(5000)],
      isLoading: false,
    })
    
    const { result } = renderHook(() => useMentorInfo('0xuser'))
    
    expect(result.current.minScoreToMentor).toBe(7000)
  })

  it('returns currentScore', () => {
    mockUseReadContract.mockReturnValue({
      data: [false, '0x0000000000000000000000000000000000000000' as `0x${string}`, BigInt(0), false, false, BigInt(7000), BigInt(8500)],
      isLoading: false,
    })
    
    const { result } = renderHook(() => useMentorInfo('0xuser'))
    
    expect(result.current.currentScore).toBe(8500)
  })
})

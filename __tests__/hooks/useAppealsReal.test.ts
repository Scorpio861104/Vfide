/**
 * Real appeals hooks tests
 * Verifies fail-closed behavior when SeerSocial is not configured.
 */

import { describe, it, expect, beforeEach } from '@jest/globals'
import { renderHook } from '@testing-library/react'

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

jest.mock('../../lib/contracts', () => {
  const contractAddresses = {
    SeerSocial: '0x1234567890123456789012345678901234567890',
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

jest.mock('../../lib/abis', () => ({
  SeerSocialABI: [],
}))

import { useAppealStatus, useFileAppeal } from '../../hooks/useAppeals'
import { CONTRACT_ADDRESSES as mockContractAddresses } from '../../lib/contracts'

describe('useAppealStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockContractAddresses.SeerSocial = '0x1234567890123456789012345678901234567890'
    mockUseAccount.mockReturnValue({ address: '0x1234567890123456789012345678901234567891' })
    mockUseReadContract.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    })
  })

  it('parses an active appeal tuple', () => {
    mockUseReadContract.mockReturnValue({
      data: ['0x1234567890123456789012345678901234567891', 'review me', 10n, false, false, ''],
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    })

    const { result } = renderHook(() => useAppealStatus('0x1234567890123456789012345678901234567891'))

    expect(result.current.hasAppeal).toBe(true)
    expect(result.current.reason).toBe('review me')
  })

  it('returns default status when SeerSocial is missing', () => {
    mockContractAddresses.SeerSocial = '0x0000000000000000000000000000000000000000'

    const { result } = renderHook(() => useAppealStatus('0x1234567890123456789012345678901234567891'))

    expect(result.current.hasAppeal).toBe(false)
    expect(result.current.error ?? null).toBeNull()
  })
})

describe('useFileAppeal', () => {
  const mockWriteContract = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    mockContractAddresses.SeerSocial = '0x1234567890123456789012345678901234567890'
    mockUseAccount.mockReturnValue({ address: '0x1234567890123456789012345678901234567891' })
    mockUseWriteContract.mockReturnValue({
      writeContract: mockWriteContract,
      data: undefined,
      isPending: false,
      error: null,
    })
    mockUseWaitForTransactionReceipt.mockReturnValue({
      isLoading: false,
      isSuccess: false,
    })
  })

  it('calls writeContract for a valid appeal', () => {
    const { result } = renderHook(() => useFileAppeal())

    result.current.fileAppeal('help')

    expect(mockWriteContract).toHaveBeenCalledWith(expect.objectContaining({
      functionName: 'fileAppeal',
      args: ['help'],
    }))
  })

  it('fails closed when SeerSocial is not configured', () => {
    mockContractAddresses.SeerSocial = '0x0000000000000000000000000000000000000000'

    const { result } = renderHook(() => useFileAppeal())

    result.current.fileAppeal('help')

    expect(mockWriteContract).not.toHaveBeenCalled()
  })
})

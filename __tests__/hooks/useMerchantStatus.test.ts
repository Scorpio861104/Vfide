import { describe, it, expect, vi, beforeEach } from '@jest/globals'

// Mock wagmi hooks
jest.mock('wagmi', () => ({
  useReadContract: jest.fn(() => ({ data: null, isError: false, isLoading: false })),
}))

// Mock contracts
jest.mock('@/lib/contracts', () => ({
  CONTRACT_ADDRESSES: {
    MerchantPortal: '0x1234567890123456789012345678901234567890',
  },
  MERCHANT_PORTAL_ABI: [],
}))

import { useReadContract } from 'wagmi'
import { useMerchantStatus } from '@/hooks/useMerchantStatus'

describe('useMerchantStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns isMerchant false when no data', () => {
    const { isMerchant, isLoading, isError } = useMerchantStatus('0x1234567890123456789012345678901234567890' as `0x${string}`)
    expect(isMerchant).toBe(false)
    expect(isLoading).toBe(false)
    expect(isError).toBe(false)
  })

  it('returns isMerchant true when user is merchant', () => {
    jest.mocked(useReadContract).mockReturnValue({
      data: true as unknown as undefined,
      isError: false,
      isLoading: false,
    } as ReturnType<typeof useReadContract>)

    const { isMerchant } = useMerchantStatus('0x1234567890123456789012345678901234567890' as `0x${string}`)
    expect(isMerchant).toBe(true)
  })

  it('returns isMerchant false when user is not merchant', () => {
    jest.mocked(useReadContract).mockReturnValue({
      data: false as unknown as undefined,
      isError: false,
      isLoading: false,
    } as ReturnType<typeof useReadContract>)

    const { isMerchant } = useMerchantStatus('0x1234567890123456789012345678901234567890' as `0x${string}`)
    expect(isMerchant).toBe(false)
  })

  it('handles loading state', () => {
    jest.mocked(useReadContract).mockReturnValue({
      data: null,
      isError: false,
      isLoading: true,
    } as unknown as ReturnType<typeof useReadContract>)

    const { isLoading } = useMerchantStatus('0x1234567890123456789012345678901234567890' as `0x${string}`)
    expect(isLoading).toBe(true)
  })

  it('handles error state', () => {
    jest.mocked(useReadContract).mockReturnValue({
      data: null,
      isError: true,
      isLoading: false,
    } as unknown as ReturnType<typeof useReadContract>)

    const { isError } = useMerchantStatus('0x1234567890123456789012345678901234567890' as `0x${string}`)
    expect(isError).toBe(true)
  })

  it('handles undefined address', () => {
    const { isMerchant } = useMerchantStatus(undefined)
    expect(isMerchant).toBe(false)
  })
})

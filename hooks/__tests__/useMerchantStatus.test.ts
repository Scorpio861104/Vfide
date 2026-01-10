/* eslint-disable @typescript-eslint/no-explicit-any */
import { renderHook } from '@testing-library/react'
import { useMerchantStatus } from '../useMerchantStatus'
import { useReadContract } from 'wagmi'

jest.mock('wagmi')
jest.mock('@/lib/contracts')

const mockUseReadContract = useReadContract as jest.MockedFunction<typeof useReadContract>

describe('useMerchantStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns merchant status true', () => {
    mockUseReadContract.mockReturnValueOnce({
      data: [true, false, 'Test Business', 'retail', 1000000n, 5000000n, 100n],
      isError: false,
      isLoading: false,
    } as any)

    const { result } = renderHook(() => 
      useMerchantStatus('0x1234567890123456789012345678901234567890')
    )

    expect(result.current.isMerchant).toBe(true)
    expect(result.current.isError).toBe(false)
    expect(result.current.isLoading).toBe(false)
  })

  it('returns merchant status false', () => {
    mockUseReadContract.mockReturnValue({
      data: false,
      isError: false,
      isLoading: false,
    } as any)

    const { result } = renderHook(() => 
      useMerchantStatus('0x1234567890123456789012345678901234567890')
    )

    expect(result.current.isMerchant).toBe(false)
  })

  it('handles loading state', () => {
    mockUseReadContract.mockReturnValue({
      data: undefined,
      isError: false,
      isLoading: true,
    } as any)

    const { result } = renderHook(() => 
      useMerchantStatus('0x1234567890123456789012345678901234567890')
    )

    expect(result.current.isLoading).toBe(true)
    expect(result.current.isMerchant).toBe(false)
  })

  it('handles error state', () => {
    mockUseReadContract.mockReturnValue({
      data: undefined,
      isError: true,
      isLoading: false,
    } as any)

    const { result } = renderHook(() => 
      useMerchantStatus('0x1234567890123456789012345678901234567890')
    )

    expect(result.current.isError).toBe(true)
    expect(result.current.isMerchant).toBe(false)
  })

  it('handles undefined address', () => {
    mockUseReadContract.mockReturnValue({
      data: undefined,
      isError: false,
      isLoading: false,
    } as any)

    const { result } = renderHook(() => useMerchantStatus(undefined))
    
    expect(result.current.isMerchant).toBe(false)
  })

  it('defaults to false when no data', () => {
    mockUseReadContract.mockReturnValue({
      data: undefined,
      isError: false,
      isLoading: false,
    } as any)

    const { result } = renderHook(() => 
      useMerchantStatus('0x1234567890123456789012345678901234567890')
    )

    expect(result.current.isMerchant).toBe(false)
  })
})

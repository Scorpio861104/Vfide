/* eslint-disable @typescript-eslint/no-explicit-any */
import { renderHook } from '@testing-library/react'
import { useVFIDEBalance } from '../useVFIDEBalance'
import { useReadContract } from 'wagmi'

jest.mock('wagmi')
jest.mock('@/lib/contracts')

const mockUseReadContract = useReadContract as jest.MockedFunction<typeof useReadContract>

describe('useVFIDEBalance', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns balance data', () => {
    mockUseReadContract.mockReturnValue({
      data: BigInt('1000000000000000000'),
      isError: false,
      isLoading: false,
    } as any)

    const { result } = renderHook(() => 
      useVFIDEBalance('0x1234567890123456789012345678901234567890')
    )

    expect(result.current.balance).toBe(BigInt('1000000000000000000'))
    expect(result.current.isError).toBe(false)
    expect(result.current.isLoading).toBe(false)
  })

  it('handles loading state', () => {
    mockUseReadContract.mockReturnValue({
      data: undefined,
      isError: false,
      isLoading: true,
    } as any)

    const { result } = renderHook(() => 
      useVFIDEBalance('0x1234567890123456789012345678901234567890')
    )

    expect(result.current.isLoading).toBe(true)
    expect(result.current.balance).toBeUndefined()
  })

  it('handles error state', () => {
    mockUseReadContract.mockReturnValue({
      data: undefined,
      isError: true,
      isLoading: false,
    } as any)

    const { result } = renderHook(() => 
      useVFIDEBalance('0x1234567890123456789012345678901234567890')
    )

    expect(result.current.isError).toBe(true)
  })

  it('handles undefined address', () => {
    mockUseReadContract.mockReturnValue({
      data: undefined,
      isError: false,
      isLoading: false,
    } as any)

    const { result } = renderHook(() => useVFIDEBalance(undefined))
    
    expect(result.current.balance).toBeUndefined()
  })

  it('returns zero balance', () => {
    mockUseReadContract.mockReturnValue({
      data: BigInt(0),
      isError: false,
      isLoading: false,
    } as any)

    const { result } = renderHook(() => 
      useVFIDEBalance('0x1234567890123456789012345678901234567890')
    )

    expect(result.current.balance).toBe(BigInt(0))
  })
})

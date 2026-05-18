import { describe, it, expect, vi, beforeEach } from '@jest/globals'

// Mock wagmi hooks
jest.mock('wagmi', () => ({
  useReadContract: jest.fn(() => ({ data: null, isError: false, isLoading: false })),
}))

// Mock contracts
jest.mock('@/lib/contracts', () => ({
  CONTRACT_ADDRESSES: {
    VFIDEToken: '0x1234567890123456789012345678901234567890',
  },
  VFIDETokenABI: [],
  ZERO_ADDRESS: '0x0000000000000000000000000000000000000000',
  isConfiguredContractAddress: (address?: string | null) =>
    typeof address === 'string' &&
    address !== '0x0000000000000000000000000000000000000000' &&
    address.startsWith('0x') &&
    address.length === 42,
}))

import { useReadContract } from 'wagmi'
import { useVFIDEBalance } from '@/hooks/useVFIDEBalance'

describe('useVFIDEBalance', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns null balance when no data', () => {
    const { balance, isLoading, isError } = useVFIDEBalance('0x1234567890123456789012345678901234567890' as `0x${string}`)
    expect(balance).toBeNull()
    expect(isLoading).toBe(false)
    expect(isError).toBe(false)
  })

  it('returns balance when available', () => {
    jest.mocked(useReadContract).mockReturnValue({
      data: 1000000000000000000n as unknown as undefined, // 1 token with 18 decimals
      isError: false,
      isLoading: false,
    } as ReturnType<typeof useReadContract>)

    const { balance } = useVFIDEBalance('0x1234567890123456789012345678901234567890' as `0x${string}`)
    expect(balance).toBe(1000000000000000000n)
  })

  it('returns large balances', () => {
    jest.mocked(useReadContract).mockReturnValue({
      data: 1000000000000000000000n as unknown as undefined, // 1000 tokens
      isError: false,
      isLoading: false,
    } as ReturnType<typeof useReadContract>)

    const { balance } = useVFIDEBalance('0x1234567890123456789012345678901234567890' as `0x${string}`)
    expect(balance).toBe(1000000000000000000000n)
  })

  it('returns zero balance', () => {
    jest.mocked(useReadContract).mockReturnValue({
      data: 0n as unknown as undefined,
      isError: false,
      isLoading: false,
    } as ReturnType<typeof useReadContract>)

    const { balance } = useVFIDEBalance('0x1234567890123456789012345678901234567890' as `0x${string}`)
    expect(balance).toBe(0n)
  })

  it('handles loading state', () => {
    jest.mocked(useReadContract).mockReturnValue({
      data: null,
      isError: false,
      isLoading: true,
    } as unknown as ReturnType<typeof useReadContract>)

    const { isLoading } = useVFIDEBalance('0x1234567890123456789012345678901234567890' as `0x${string}`)
    expect(isLoading).toBe(true)
  })

  it('handles error state', () => {
    jest.mocked(useReadContract).mockReturnValue({
      data: null,
      isError: true,
      isLoading: false,
    } as unknown as ReturnType<typeof useReadContract>)

    const { isError } = useVFIDEBalance('0x1234567890123456789012345678901234567890' as `0x${string}`)
    expect(isError).toBe(true)
  })

  it('handles undefined address', () => {
    const { balance } = useVFIDEBalance(undefined)
    expect(balance).toBeNull()
  })
})

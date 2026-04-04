/**
 * Headhunter hook safety tests
 * Ensures hooks fail closed when EcosystemVault contracts are not configured.
 */

import { describe, it, expect, beforeEach } from '@jest/globals'
import { renderHook, act } from '@testing-library/react'

const mockUseAccount = jest.fn()
const mockUseReadContract = jest.fn()
const mockUseWriteContract = jest.fn()

jest.mock('wagmi', () => ({
  useAccount: () => mockUseAccount(),
  useReadContract: (args: unknown) => mockUseReadContract(args),
  useWriteContract: () => mockUseWriteContract(),
}))

jest.mock('../../lib/contracts', () => ({
  CONTRACT_ADDRESSES: {
    EcosystemVault: '0x0000000000000000000000000000000000000000',
    EcosystemVaultView: '0x0000000000000000000000000000000000000000',
  },
  ZERO_ADDRESS: '0x0000000000000000000000000000000000000000',
  isConfiguredContractAddress: (address: string) => address !== '0x0000000000000000000000000000000000000000',
  getContractConfigurationError: (name: string) => new Error(`[VFIDE] ${name} contract not configured.`),
}))

jest.mock('../../lib/abis', () => ({
  EcosystemVaultABI: [],
  EcosystemVaultViewABI: [],
}))

jest.mock('viem', () => ({
  parseEther: (value: string) => BigInt(Math.floor(parseFloat(value) * 1e18)),
  formatEther: (value: bigint) => (Number(value) / 1e18).toString(),
}))

import {
  useHeadhunterStats,
  usePayReferralWorkReward,
} from '../../hooks/useHeadhunterHooks'

describe('useHeadhunterHooks safety guards', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseAccount.mockReturnValue({ address: '0x1234567890123456789012345678901234567890' })
    mockUseReadContract.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
    })
    mockUseWriteContract.mockReturnValue({
      writeContract: jest.fn(),
      isPending: false,
      isSuccess: false,
      error: null,
    })
  })

  it('disables headhunter reads when the view contract is not configured', () => {
    const { result } = renderHook(() => useHeadhunterStats())

    expect(mockUseReadContract).toHaveBeenCalledWith(expect.objectContaining({
      query: expect.objectContaining({ enabled: false }),
    }))
    expect(result.current.error?.message).toContain('EcosystemVault')
  })

  it('throws a clear error instead of writing to the zero address', async () => {
    const writeContract = jest.fn()
    mockUseWriteContract.mockReturnValue({
      writeContract,
      isPending: false,
      isSuccess: false,
      error: null,
    })

    const { result } = renderHook(() => usePayReferralWorkReward())

    await expect(
      act(async () => {
        await result.current.payReferralWorkReward(
          '0x1234567890123456789012345678901234567890',
          '1',
          'test reward'
        )
      })
    ).rejects.toThrow('EcosystemVault')

    expect(writeContract).not.toHaveBeenCalled()
  })
})

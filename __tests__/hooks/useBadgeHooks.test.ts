import { describe, it, expect, vi, beforeEach } from '@jest/globals'

// Mock wagmi hooks
jest.mock('wagmi', () => ({
  useAccount: jest.fn(() => ({ address: '0x1234567890123456789012345678901234567890' })),
  useReadContract: jest.fn(() => ({ data: null, isLoading: false, refetch: jest.fn() })),
  useWriteContract: jest.fn(() => ({ writeContract: jest.fn(), data: null, isPending: false })),
  useWaitForTransactionReceipt: jest.fn(() => ({ isLoading: false, isSuccess: false })),
}))

// Mock contracts
jest.mock('@/lib/contracts', () => ({
  CONTRACT_ADDRESSES: {
    Seer: '0x1234567890123456789012345678901234567890',
    BadgeNFT: '0x1234567890123456789012345678901234567891',
  },
  isConfiguredContractAddress: (address?: string | null) =>
    typeof address === 'string' &&
    address !== '0x0000000000000000000000000000000000000000' &&
    address.startsWith('0x') &&
    address.length === 42,
}))

// Mock ABIs
jest.mock('@/lib/abis', () => ({
  VFIDEBadgeNFTABI: [],
  SeerABI: [],
}))

import { useReadContract, useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { useUserBadges, useBadgeNFTs, useMintBadge, useCanMintBadge } from '@/hooks/useBadgeHooks'

describe('useBadgeHooks', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Reset all mocks to default values
    jest.mocked(useReadContract).mockReturnValue({
      data: null,
      isLoading: false,
      refetch: jest.fn(),
    } as unknown as ReturnType<typeof useReadContract>)
    jest.mocked(useWriteContract).mockReturnValue({
      writeContract: jest.fn(),
      data: null,
      isPending: false,
    } as unknown as ReturnType<typeof useWriteContract>)
    jest.mocked(useWaitForTransactionReceipt).mockReturnValue({
      isLoading: false,
      isSuccess: false,
    } as ReturnType<typeof useWaitForTransactionReceipt>)
  })

  describe('useUserBadges', () => {
    it('returns empty array (deprecated hook)', () => {
      const { badgeIds, isLoading, isAvailable } = useUserBadges()
      // This hook is deprecated and always returns empty array
      expect(badgeIds).toEqual([])
      expect(isLoading).toBe(false)
      expect(isAvailable).toBe(false)
    })

    it('always returns empty array regardless of address (deprecated)', () => {
      const { badgeIds, isAvailable } = useUserBadges('0xABCD1234567890123456789012345678901234AB' as `0x${string}`)
      // Deprecated hook - use useBadgeNFTs instead
      expect(badgeIds).toEqual([])
      expect(isAvailable).toBe(false)
    })

    it('indicates unavailability for migration purposes', () => {
      const result = useUserBadges()
      expect(result.isAvailable).toBe(false)
    })
  })

  describe('useBadgeNFTs', () => {
    it('returns empty array when no NFTs', () => {
      const { tokenIds, count } = useBadgeNFTs()
      expect(tokenIds).toEqual([])
      expect(count).toBe(0)
    })

    it('returns token IDs and count when user has NFTs', () => {
      jest.mocked(useReadContract).mockReturnValue({
        data: [1n, 2n, 3n] as unknown as undefined,
        isLoading: false,
        refetch: jest.fn(),
      } as ReturnType<typeof useReadContract>)

      const { tokenIds, count } = useBadgeNFTs()
      expect(tokenIds).toEqual([1n, 2n, 3n])
      expect(count).toBe(3)
    })

    it('reports availability when BadgeNFT is configured', () => {
      const { isAvailable } = useBadgeNFTs()
      expect(isAvailable).toBe(true)
    })
  })

  describe('useMintBadge', () => {
    it('provides mintBadge function', () => {
      const mockWriteContract = jest.fn()
      jest.mocked(useWriteContract).mockReturnValue({
        writeContract: mockWriteContract,
        data: null,
        isPending: false,
      } as unknown as ReturnType<typeof useWriteContract>)

      const { mintBadge } = useMintBadge()
      expect(typeof mintBadge).toBe('function')
    })

    it('calls writeContract when minting', () => {
      const mockWriteContract = jest.fn()
      jest.mocked(useWriteContract).mockReturnValue({
        writeContract: mockWriteContract,
        data: null,
        isPending: false,
      } as unknown as ReturnType<typeof useWriteContract>)

      const { mintBadge } = useMintBadge()
      mintBadge('0xbadge123456789012345678901234567890123456789012345678901234567890' as `0x${string}`)
      
      expect(mockWriteContract).toHaveBeenCalledWith(
        expect.objectContaining({
          functionName: 'mintBadge',
        })
      )
    })

    it('does not write when BadgeNFT is not configured', () => {
      const contracts = jest.requireMock('@/lib/contracts') as {
        CONTRACT_ADDRESSES: { BadgeNFT: string }
      }
      contracts.CONTRACT_ADDRESSES.BadgeNFT = '0x0000000000000000000000000000000000000000'

      const mockWriteContract = jest.fn()
      jest.mocked(useWriteContract).mockReturnValue({
        writeContract: mockWriteContract,
        data: null,
        isPending: false,
      } as unknown as ReturnType<typeof useWriteContract>)

      const { mintBadge, isAvailable } = useMintBadge()
      mintBadge('0xbadge123456789012345678901234567890123456789012345678901234567890' as `0x${string}`)

      expect(isAvailable).toBe(false)
      expect(mockWriteContract).not.toHaveBeenCalled()
    })

    it('tracks minting state', () => {
      jest.mocked(useWriteContract).mockReturnValue({
        writeContract: jest.fn(),
        data: null,
        isPending: true,
      } as unknown as ReturnType<typeof useWriteContract>)

      const { isMinting } = useMintBadge()
      expect(isMinting).toBe(true)
    })

    it('tracks confirmation state', () => {
      jest.mocked(useWaitForTransactionReceipt).mockReturnValue({
        isLoading: true,
        isSuccess: false,
      } as ReturnType<typeof useWaitForTransactionReceipt>)

      const { isMinting } = useMintBadge()
      expect(isMinting).toBe(true)
    })

    it('tracks success state', () => {
      jest.mocked(useWaitForTransactionReceipt).mockReturnValue({
        isLoading: false,
        isSuccess: true,
      } as ReturnType<typeof useWaitForTransactionReceipt>)

      const { isSuccess } = useMintBadge()
      expect(isSuccess).toBe(true)
    })
  })

  describe('useCanMintBadge', () => {
    it('returns canMint false when no data', () => {
      const { canMint, reason } = useCanMintBadge('0xbadge123456789012345678901234567890123456789012345678901234567890' as `0x${string}`)
      expect(canMint).toBe(false)
      expect(reason).toBe('')
    })

    it('returns canMint true when user can mint', () => {
      jest.mocked(useReadContract).mockReturnValue({
        data: [true, 'Ready to mint'] as unknown as undefined,
        isLoading: false,
      } as ReturnType<typeof useReadContract>)

      const { canMint, reason } = useCanMintBadge('0xbadge123456789012345678901234567890123456789012345678901234567890' as `0x${string}`)
      expect(canMint).toBe(true)
      expect(reason).toBe('Ready to mint')
    })

    it('returns reason when cannot mint', () => {
      jest.mocked(useReadContract).mockReturnValue({
        data: [false, 'Badge already owned'] as unknown as undefined,
        isLoading: false,
      } as ReturnType<typeof useReadContract>)

      const { canMint, reason } = useCanMintBadge('0xbadge123456789012345678901234567890123456789012345678901234567890' as `0x${string}`)
      expect(canMint).toBe(false)
      expect(reason).toBe('Badge already owned')
    })

    it('handles loading state', () => {
      jest.mocked(useReadContract).mockReturnValue({
        data: null,
        isLoading: true,
      } as unknown as ReturnType<typeof useReadContract>)

      const { isLoading } = useCanMintBadge('0xbadge123456789012345678901234567890123456789012345678901234567890' as `0x${string}`)
      expect(isLoading).toBe(true)
    })

    it('reports unavailable when BadgeNFT is not configured', () => {
      const contracts = jest.requireMock('@/lib/contracts') as {
        CONTRACT_ADDRESSES: { BadgeNFT: string }
      }
      contracts.CONTRACT_ADDRESSES.BadgeNFT = '0x0000000000000000000000000000000000000000'

      const { isAvailable } = useCanMintBadge('0xbadge123456789012345678901234567890123456789012345678901234567890' as `0x${string}`)
      expect(isAvailable).toBe(false)
    })
  })
})

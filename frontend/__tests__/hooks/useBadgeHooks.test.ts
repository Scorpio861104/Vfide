import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock wagmi hooks
vi.mock('wagmi', () => ({
  useAccount: vi.fn(() => ({ address: '0x1234567890123456789012345678901234567890' })),
  useReadContract: vi.fn(() => ({ data: null, isLoading: false, refetch: vi.fn() })),
  useWriteContract: vi.fn(() => ({ writeContract: vi.fn(), data: null, isPending: false })),
  useWaitForTransactionReceipt: vi.fn(() => ({ isLoading: false, isSuccess: false })),
}))

// Mock contracts
vi.mock('@/lib/contracts', () => ({
  CONTRACT_ADDRESSES: {
    Seer: '0x1234567890123456789012345678901234567890',
    BadgeNFT: '0x1234567890123456789012345678901234567891',
  },
}))

// Mock ABIs
vi.mock('@/lib/abis', () => ({
  VFIDEBadgeNFTABI: [],
  SeerABI: [],
}))

import { useReadContract, useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { useUserBadges, useBadgeNFTs, useMintBadge, useCanMintBadge } from '@/hooks/useBadgeHooks'

describe('useBadgeHooks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset all mocks to default values
    vi.mocked(useReadContract).mockReturnValue({
      data: null,
      isLoading: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useReadContract>)
    vi.mocked(useWriteContract).mockReturnValue({
      writeContract: vi.fn(),
      data: null,
      isPending: false,
    } as unknown as ReturnType<typeof useWriteContract>)
    vi.mocked(useWaitForTransactionReceipt).mockReturnValue({
      isLoading: false,
      isSuccess: false,
    } as ReturnType<typeof useWaitForTransactionReceipt>)
  })

  describe('useUserBadges', () => {
    it('returns empty array when no badges', () => {
      const { badgeIds, isLoading } = useUserBadges()
      expect(badgeIds).toEqual([])
      expect(isLoading).toBe(false)
    })

    it('returns badge IDs when user has badges', () => {
      vi.mocked(useReadContract).mockReturnValue({
        data: ['0xbadge1', '0xbadge2'] as unknown as undefined,
        isLoading: false,
        refetch: vi.fn(),
      } as ReturnType<typeof useReadContract>)

      const { badgeIds } = useUserBadges()
      expect(badgeIds).toEqual(['0xbadge1', '0xbadge2'])
    })

    it('uses connected address when no address provided', () => {
      useUserBadges()
      expect(useAccount).toHaveBeenCalled()
    })

    it('uses provided address when specified', () => {
      useUserBadges('0xABCD1234567890123456789012345678901234AB' as `0x${string}`)
      expect(useReadContract).toHaveBeenCalledWith(
        expect.objectContaining({
          args: expect.arrayContaining(['0xABCD1234567890123456789012345678901234AB']),
        })
      )
    })

    it('handles loading state', () => {
      vi.mocked(useReadContract).mockReturnValue({
        data: null,
        isLoading: true,
        refetch: vi.fn(),
      } as unknown as ReturnType<typeof useReadContract>)

      const { isLoading } = useUserBadges()
      expect(isLoading).toBe(true)
    })
  })

  describe('useBadgeNFTs', () => {
    it('returns empty array when no NFTs', () => {
      const { tokenIds, count } = useBadgeNFTs()
      expect(tokenIds).toEqual([])
      expect(count).toBe(0)
    })

    it('returns token IDs and count when user has NFTs', () => {
      vi.mocked(useReadContract).mockReturnValue({
        data: [1n, 2n, 3n] as unknown as undefined,
        isLoading: false,
        refetch: vi.fn(),
      } as ReturnType<typeof useReadContract>)

      const { tokenIds, count } = useBadgeNFTs()
      expect(tokenIds).toEqual([1n, 2n, 3n])
      expect(count).toBe(3)
    })
  })

  describe('useMintBadge', () => {
    it('provides mintBadge function', () => {
      const mockWriteContract = vi.fn()
      vi.mocked(useWriteContract).mockReturnValue({
        writeContract: mockWriteContract,
        data: null,
        isPending: false,
      } as unknown as ReturnType<typeof useWriteContract>)

      const { mintBadge } = useMintBadge()
      expect(typeof mintBadge).toBe('function')
    })

    it('calls writeContract when minting', () => {
      const mockWriteContract = vi.fn()
      vi.mocked(useWriteContract).mockReturnValue({
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

    it('tracks minting state', () => {
      vi.mocked(useWriteContract).mockReturnValue({
        writeContract: vi.fn(),
        data: null,
        isPending: true,
      } as unknown as ReturnType<typeof useWriteContract>)

      const { isMinting } = useMintBadge()
      expect(isMinting).toBe(true)
    })

    it('tracks confirmation state', () => {
      vi.mocked(useWaitForTransactionReceipt).mockReturnValue({
        isLoading: true,
        isSuccess: false,
      } as ReturnType<typeof useWaitForTransactionReceipt>)

      const { isMinting } = useMintBadge()
      expect(isMinting).toBe(true)
    })

    it('tracks success state', () => {
      vi.mocked(useWaitForTransactionReceipt).mockReturnValue({
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
      vi.mocked(useReadContract).mockReturnValue({
        data: [true, 'Ready to mint'] as unknown as undefined,
        isLoading: false,
      } as ReturnType<typeof useReadContract>)

      const { canMint, reason } = useCanMintBadge('0xbadge123456789012345678901234567890123456789012345678901234567890' as `0x${string}`)
      expect(canMint).toBe(true)
      expect(reason).toBe('Ready to mint')
    })

    it('returns reason when cannot mint', () => {
      vi.mocked(useReadContract).mockReturnValue({
        data: [false, 'Badge already owned'] as unknown as undefined,
        isLoading: false,
      } as ReturnType<typeof useReadContract>)

      const { canMint, reason } = useCanMintBadge('0xbadge123456789012345678901234567890123456789012345678901234567890' as `0x${string}`)
      expect(canMint).toBe(false)
      expect(reason).toBe('Badge already owned')
    })

    it('handles loading state', () => {
      vi.mocked(useReadContract).mockReturnValue({
        data: null,
        isLoading: true,
      } as unknown as ReturnType<typeof useReadContract>)

      const { isLoading } = useCanMintBadge('0xbadge123456789012345678901234567890123456789012345678901234567890' as `0x${string}`)
      expect(isLoading).toBe(true)
    })
  })
})

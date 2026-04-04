import { describe, it, expect, vi, beforeEach } from '@jest/globals'

// Mock wagmi hooks
jest.mock('wagmi', () => ({
  useAccount: jest.fn(() => ({ address: '0x1234567890123456789012345678901234567890' })),
  useReadContract: jest.fn(() => ({ data: null, isLoading: false, refetch: jest.fn() })),
  useWriteContract: jest.fn(() => ({ writeContract: jest.fn(), data: null, isPending: false })),
  useWaitForTransactionReceipt: jest.fn(() => ({ isLoading: false, isSuccess: false })),
}))

// Mock contracts
jest.mock('@/lib/contracts', () => {
  const contractAddresses = {
    Seer: '0x1234567890123456789012345678901234567890',
    BadgeNFT: '0x1234567890123456789012345678901234567891',
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
jest.mock('@/lib/abis', () => ({
  VFIDEBadgeNFTABI: [],
  SeerABI: [],
}))

import { useReadContract, useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { CONTRACT_ADDRESSES as mockContractAddresses } from '@/lib/contracts'
import { useUserBadges, useBadgeNFTs, useMintBadge, useCanMintBadge } from '@/hooks/useBadgeHooks'

describe('useBadgeHooks', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockContractAddresses.Seer = '0x1234567890123456789012345678901234567890'
    mockContractAddresses.BadgeNFT = '0x1234567890123456789012345678901234567891'
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

    it('reports unavailable when BadgeNFT is not configured', () => {
      mockContractAddresses.BadgeNFT = '0x0000000000000000000000000000000000000000'

      const { isAvailable, error } = useBadgeNFTs()

      expect(isAvailable).toBe(false)
      expect(error?.message).toContain('BadgeNFT')
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

    it('fails closed when BadgeNFT is not configured', () => {
      const mockWriteContract = jest.fn()
      mockContractAddresses.BadgeNFT = '0x0000000000000000000000000000000000000000'
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
  })
})

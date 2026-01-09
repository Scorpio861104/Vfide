import { describe, it, expect, vi, beforeEach } from '@jest/globals'

// Mock wagmi hooks
jest.mock('wagmi', () => ({
  useReadContract: jest.fn(() => ({ data: null })),
  useWriteContract: jest.fn(() => ({ writeContract: jest.fn(), data: null, isPending: false })),
  useWaitForTransactionReceipt: jest.fn(() => ({ isLoading: false, isSuccess: false })),
}))

// Mock contracts
jest.mock('@/lib/contracts', () => ({
  CONTRACT_ADDRESSES: {
    DAO: '0x1234567890123456789012345678901234567890',
  },
}))

// Mock ABIs
jest.mock('@/lib/abis', () => ({
  DAOABI: [],
}))

import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { useDAOProposals, useVote } from '@/hooks/useDAOHooks'

describe('useDAOHooks', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('useDAOProposals', () => {
    it('returns 0 when no proposals', () => {
      const { proposalCount } = useDAOProposals()
      expect(proposalCount).toBe(0)
    })

    it('returns proposal count', () => {
      jest.mocked(useReadContract).mockReturnValue({
        data: 42n as unknown as undefined,
      } as ReturnType<typeof useReadContract>)

      const { proposalCount } = useDAOProposals()
      expect(proposalCount).toBe(42)
    })

    it('handles large proposal counts', () => {
      jest.mocked(useReadContract).mockReturnValue({
        data: 1000n as unknown as undefined,
      } as ReturnType<typeof useReadContract>)

      const { proposalCount } = useDAOProposals()
      expect(proposalCount).toBe(1000)
    })
  })

  describe('useVote', () => {
    it('provides vote function', () => {
      const { vote } = useVote(1n, true)
      expect(typeof vote).toBe('function')
    })

    it('calls writeContract when voting', () => {
      const mockWriteContract = jest.fn()
      jest.mocked(useWriteContract).mockReturnValue({
        writeContract: mockWriteContract,
        data: null,
        isPending: false,
      } as unknown as ReturnType<typeof useWriteContract>)

      const { vote } = useVote(1n, true)
      vote()

      expect(mockWriteContract).toHaveBeenCalledWith(
        expect.objectContaining({
          functionName: 'vote',
          args: [1n, true],
        })
      )
    })

    it('supports voting against', () => {
      const mockWriteContract = jest.fn()
      jest.mocked(useWriteContract).mockReturnValue({
        writeContract: mockWriteContract,
        data: null,
        isPending: false,
      } as unknown as ReturnType<typeof useWriteContract>)

      const { vote } = useVote(5n, false)
      vote()

      expect(mockWriteContract).toHaveBeenCalledWith(
        expect.objectContaining({
          args: [5n, false],
        })
      )
    })

    it('tracks voting state', () => {
      jest.mocked(useWriteContract).mockReturnValue({
        writeContract: jest.fn(),
        data: null,
        isPending: true,
      } as unknown as ReturnType<typeof useWriteContract>)

      const { isVoting } = useVote(1n, true)
      expect(isVoting).toBe(true)
    })

    it('tracks confirmation state', () => {
      jest.mocked(useWaitForTransactionReceipt).mockReturnValue({
        isLoading: true,
        isSuccess: false,
      } as ReturnType<typeof useWaitForTransactionReceipt>)

      const { isVoting } = useVote(1n, true)
      expect(isVoting).toBe(true)
    })

    it('tracks success state', () => {
      jest.mocked(useWaitForTransactionReceipt).mockReturnValue({
        isLoading: false,
        isSuccess: true,
      } as ReturnType<typeof useWaitForTransactionReceipt>)

      const { isSuccess } = useVote(1n, true)
      expect(isSuccess).toBe(true)
    })
  })
})

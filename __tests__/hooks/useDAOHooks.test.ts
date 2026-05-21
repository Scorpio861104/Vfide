import { describe, it, expect, vi, beforeEach } from '@jest/globals'

// Mock wagmi hooks
jest.mock('wagmi', () => ({
  useReadContract: jest.fn(() => ({ data: null,
  useAccount: jest.fn(() => ({ address: undefined, isConnected: false, status: 'disconnected' })),
  useChainId: jest.fn(() => 1),
  useSwitchChain: jest.fn(() => ({ switchChain: jest.fn(), switchChainAsync: jest.fn(), chains: [], status: 'idle' })),
  useReadContracts: jest.fn(() => ({ data: undefined, isError: false, isLoading: false, isSuccess: false, error: null, refetch: jest.fn() })),
  useWriteContract: jest.fn(() => ({ writeContract: jest.fn(), writeContractAsync: jest.fn(), data: undefined, isPending: false, isSuccess: false, isError: false, error: null, reset: jest.fn() })),
  useWaitForTransactionReceipt: jest.fn(() => ({ data: undefined, isLoading: false, isSuccess: false, isError: false })),
  useWatchContractEvent: jest.fn(() => undefined),
  usePublicClient: jest.fn(() => ({ readContract: jest.fn(), getBlockNumber: jest.fn(), getTransactionReceipt: jest.fn() })),
  useWalletClient: jest.fn(() => ({ data: undefined, isLoading: false })),
  useSignTypedData: jest.fn(() => ({ signTypedData: jest.fn(), signTypedDataAsync: jest.fn(), data: undefined, isPending: false, isError: false, error: null, reset: jest.fn() })),
  useSignMessage: jest.fn(() => ({ signMessage: jest.fn(), signMessageAsync: jest.fn(), data: undefined, isPending: false, isError: false, error: null, reset: jest.fn() })),
  useConnect: jest.fn(() => ({ connect: jest.fn(), connectAsync: jest.fn(), connectors: [], status: 'idle' })),
  useDisconnect: jest.fn(() => ({ disconnect: jest.fn(), disconnectAsync: jest.fn() })),
  useConnections: jest.fn(() => []),
  useBalance: jest.fn(() => ({ data: undefined, isLoading: false, isError: false, refetch: jest.fn() })),
  useEnsName: jest.fn(() => ({ data: undefined, isLoading: false })),
  useEnsAvatar: jest.fn(() => ({ data: undefined, isLoading: false })),
  useBlockNumber: jest.fn(() => ({ data: undefined, isLoading: false, refetch: jest.fn() })),
  useEstimateGas: jest.fn(() => ({ data: undefined, isLoading: false })),
  useSendTransaction: jest.fn(() => ({ sendTransaction: jest.fn(), sendTransactionAsync: jest.fn(), data: undefined, isPending: false, isError: false, error: null })),
  useConfig: jest.fn(() => ({})),
  WagmiProvider: jest.fn(),
  createConfig: jest.fn(),
  http: jest.fn(),
})),
  useWriteContract: jest.fn(() => ({ writeContract: jest.fn(), data: null, isPending: false })),
  useWaitForTransactionReceipt: jest.fn(() => ({ isLoading: false, isSuccess: false })),
}))

// Mock contracts
jest.mock('@/lib/contracts', () => ({
  CONTRACT_ADDRESSES: {
    DAO: '0x1234567890123456789012345678901234567890',
  },
  isConfiguredContractAddress: (address?: string | null) =>
    typeof address === 'string' &&
    address !== '0x0000000000000000000000000000000000000000' &&
    address.startsWith('0x') &&
    address.length === 42,

  getContractAddresses: () => ({}),
  validateContractAddress: jest.fn((addr: any) => addr),
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

      const { proposalCount, isAvailable } = useDAOProposals()
      expect(proposalCount).toBe(42)
      expect(isAvailable).toBe(true)
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
      const { vote } = useVote()
      expect(typeof vote).toBe('function')
    })

    it('calls writeContract when voting', () => {
      const mockWriteContract = jest.fn()
      jest.mocked(useWriteContract).mockReturnValue({
        writeContract: mockWriteContract,
        data: null,
        isPending: false,
      } as unknown as ReturnType<typeof useWriteContract>)

      const { vote } = useVote()
      vote(1n, true)

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

      const { vote } = useVote()
      vote(5n, false)

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

      const { isVoting } = useVote()
      expect(isVoting).toBe(true)
    })

    it('tracks confirmation state', () => {
      jest.mocked(useWaitForTransactionReceipt).mockReturnValue({
        isLoading: true,
        isSuccess: false,
      } as ReturnType<typeof useWaitForTransactionReceipt>)

      const { isVoting } = useVote()
      expect(isVoting).toBe(true)
    })

    it('tracks success state', () => {
      jest.mocked(useWaitForTransactionReceipt).mockReturnValue({
        isLoading: false,
        isSuccess: true,
      } as ReturnType<typeof useWaitForTransactionReceipt>)

      const { isSuccess } = useVote()
      expect(isSuccess).toBe(true)
    })

    it('does not write when DAO is not configured', async () => {
      const contracts = jest.requireMock('@/lib/contracts') as {
        CONTRACT_ADDRESSES: { DAO: string }
      }
      contracts.CONTRACT_ADDRESSES.DAO = '0x0000000000000000000000000000000000000000'

      const mockWriteContract = jest.fn()
      jest.mocked(useWriteContract).mockReturnValue({
        writeContract: mockWriteContract,
        data: null,
        isPending: false,
      } as unknown as ReturnType<typeof useWriteContract>)

      const { vote, isAvailable } = useVote()
      vote(1n, true)

      expect(isAvailable).toBe(false)
      expect(mockWriteContract).not.toHaveBeenCalled()
    })
  })
})

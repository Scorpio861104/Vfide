/**
 * Real DAO Hooks Tests
 * Tests for useDAOHooks to increase coverage
 */

import { describe, it, expect, vi, beforeEach } from '@jest/globals'
import { renderHook } from '@testing-library/react'

// Mock wagmi
const mockUseReadContract = jest.fn()
const mockUseWriteContract = jest.fn()
const mockUseWaitForTransactionReceipt = jest.fn()

jest.mock('wagmi', () => ({
  useReadContract: (args: unknown) => mockUseReadContract(args),
  useWriteContract: () => mockUseWriteContract(),
  useWaitForTransactionReceipt: () => mockUseWaitForTransactionReceipt(),
  useAccount: jest.fn(() => ({ address: undefined, isConnected: false, status: 'disconnected' })),
  useChainId: jest.fn(() => 1),
  useSwitchChain: jest.fn(() => ({ switchChain: jest.fn(), switchChainAsync: jest.fn(), chains: [], status: 'idle' })),
  useReadContracts: jest.fn(() => ({ data: undefined, isError: false, isLoading: false, isSuccess: false, error: null, refetch: jest.fn() })),
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
}))

// Mock contracts
jest.mock('../../lib/contracts', () => ({
  CONTRACT_ADDRESSES: {
    DAO: '0x1234567890123456789012345678901234567890',
  },
  isConfiguredContractAddress: (address?: string | null) =>
    typeof address === 'string' &&
    address !== '0x0000000000000000000000000000000000000000' &&
    address.startsWith('0x') &&
    address.length === 42,
}))

// Mock ABIs
jest.mock('../../lib/abis', () => ({
  DAOABI: [],
}))

// Import hooks after mocks
import {
  useDAOProposals,
  useVote,
} from '../../hooks/useDAOHooks'

describe('useDAOProposals', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns proposal count', () => {
    mockUseReadContract.mockReturnValue({
      data: BigInt(10),
    })
    
    const { result } = renderHook(() => useDAOProposals())
    
    expect(result.current.proposalCount).toBe(10)
    expect(result.current.isAvailable).toBe(true)
  })

  it('returns 0 when no data', () => {
    mockUseReadContract.mockReturnValue({
      data: undefined,
    })
    
    const { result } = renderHook(() => useDAOProposals())
    
    expect(result.current.proposalCount).toBe(0)
  })

  it('converts bigint to number', () => {
    mockUseReadContract.mockReturnValue({
      data: BigInt(25),
    })
    
    const { result } = renderHook(() => useDAOProposals())
    
    expect(typeof result.current.proposalCount).toBe('number')
  })
})

describe('useVote', () => {
  const mockWriteContract = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseWriteContract.mockReturnValue({
      writeContract: mockWriteContract,
      data: undefined,
      isPending: false,
    })
    mockUseWaitForTransactionReceipt.mockReturnValue({
      isLoading: false,
      isSuccess: false,
    })
  })

  it('provides vote function', () => {
    const { result } = renderHook(() => useVote())
    
    expect(typeof result.current.vote).toBe('function')
  })

  it('returns isVoting false when not pending', () => {
    const { result } = renderHook(() => useVote())
    
    expect(result.current.isVoting).toBe(false)
  })

  it('returns isVoting true when pending', () => {
    mockUseWriteContract.mockReturnValue({
      writeContract: mockWriteContract,
      data: undefined,
      isPending: true,
    })
    
    const { result } = renderHook(() => useVote())
    
    expect(result.current.isVoting).toBe(true)
  })

  it('returns isVoting true when confirming', () => {
    mockUseWaitForTransactionReceipt.mockReturnValue({
      isLoading: true,
      isSuccess: false,
    })
    
    const { result } = renderHook(() => useVote())
    
    expect(result.current.isVoting).toBe(true)
  })

  it('returns isSuccess when confirmed', () => {
    mockUseWaitForTransactionReceipt.mockReturnValue({
      isLoading: false,
      isSuccess: true,
    })
    
    const { result } = renderHook(() => useVote())
    
    expect(result.current.isSuccess).toBe(true)
  })

  it('calls writeContract when vote is called', () => {
    const { result } = renderHook(() => useVote())
    
    result.current.vote(BigInt(5), true)
    
    expect(mockWriteContract).toHaveBeenCalledWith(expect.objectContaining({
      functionName: 'vote',
      args: [BigInt(5), true],
    }))
  })

  it('calls with support=false', () => {
    const { result } = renderHook(() => useVote())
    
    result.current.vote(BigInt(3), false)
    
    expect(mockWriteContract).toHaveBeenCalledWith(expect.objectContaining({
      functionName: 'vote',
      args: [BigInt(3), false],
    }))
  })

  it('fails closed when DAO is not configured', () => {
    const contracts = jest.requireMock('../../lib/contracts') as {
      CONTRACT_ADDRESSES: { DAO: string }
    }
    contracts.CONTRACT_ADDRESSES.DAO = '0x0000000000000000000000000000000000000000'

    const { result } = renderHook(() => useVote())

    result.current.vote(BigInt(1), true)

    expect(result.current.isAvailable).toBe(false)
    expect(mockWriteContract).not.toHaveBeenCalled()
  })
})

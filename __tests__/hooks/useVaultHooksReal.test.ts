/**
 * Real Vault Hooks Tests
 * Tests for actual vault hook implementations to increase coverage
 */

import { describe, it, expect, vi, beforeEach } from '@jest/globals'
import { renderHook } from '@testing-library/react'

// Mock wagmi
const mockUseAccount = jest.fn()
const mockUseReadContract = jest.fn()
const mockUseReadContracts = jest.fn().mockReturnValue({ data: [] })
const mockUseWriteContract = jest.fn()
const mockUseWaitForTransactionReceipt = jest.fn()
const mockUseChainId = jest.fn()
const mockUsePublicClient = jest.fn()

jest.mock('wagmi', () => ({
  useAccount: () => mockUseAccount(),
  useReadContract: (args: unknown) => mockUseReadContract(args),
  useReadContracts: (args: unknown) => mockUseReadContracts(args),
  useWriteContract: () => mockUseWriteContract(),
  useWaitForTransactionReceipt: () => mockUseWaitForTransactionReceipt(),
  useChainId: () => mockUseChainId(),
  usePublicClient: () => mockUsePublicClient(),
}))

// Mock viem
jest.mock('viem', () => ({
  parseEther: (value: string) => BigInt(parseFloat(value) * 1e18),
  formatEther: (value: bigint) => (Number(value) / 1e18).toString(),
  formatUnits: (val: bigint, decimals: number) => (Number(val) / Math.pow(10, decimals || 18)).toString(),
  parseUnits: (val: string, decimals: number) => BigInt(Math.floor(parseFloat(val) * Math.pow(10, decimals || 18))),
  isAddress: (addr: string) => addr && addr.startsWith('0x') && addr.length === 42,
  getAddress: (addr: string) => addr,
}))

// Mock contracts
jest.mock('../../lib/contracts', () => ({
  CONTRACT_ADDRESSES: {
    VaultHub: '0x1234567890123456789012345678901234567890',
    VFIDEToken: '0x0987654321098765432109876543210987654321',
  },
  isConfiguredContractAddress: (address?: string | null) =>
    typeof address === 'string' &&
    address !== '0x0000000000000000000000000000000000000000' &&
    address.startsWith('0x') &&
    address.length === 42,
}))

// Mock ABIs
jest.mock('../../lib/abis', () => ({
  VaultInfrastructureABI: [],
  VFIDETokenABI: [],
  VaultHubABI: [],
  UserVaultABI: [],
}))

// Import hooks after mocks are set up
import {
  useUserVault,
  useCreateVault,
  useVaultBalance,
} from '../../hooks/useVaultHooks'

describe('useUserVault', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseChainId.mockReturnValue(84532)
    mockUsePublicClient.mockReturnValue({ waitForTransactionReceipt: jest.fn().mockResolvedValue({}) })
    mockUseAccount.mockReturnValue({ address: '0x1234' })
    mockUseReadContract.mockReturnValue({
      data: '0x5678',
      isLoading: false,
    })
  })

  it('returns vault address when user has vault', () => {
    const { result } = renderHook(() => useUserVault())
    
    expect(result.current.vaultAddress).toBe('0x5678')
    expect(result.current.hasVault).toBe(true)
  })

  it('returns null when user has no vault', () => {
    mockUseReadContract.mockReturnValue({
      data: '0x0000000000000000000000000000000000000000',
      isLoading: false,
    })
    
    const { result } = renderHook(() => useUserVault())
    
    expect(result.current.vaultAddress).toBe(null)
    expect(result.current.hasVault).toBe(false)
  })

  it('returns isLoading state', () => {
    mockUseReadContract.mockReturnValue({
      data: null,
      isLoading: true,
    })
    
    const { result } = renderHook(() => useUserVault())
    
    expect(result.current.isLoading).toBe(true)
  })

  it('handles undefined address', () => {
    mockUseAccount.mockReturnValue({ address: undefined })
    mockUseReadContract.mockReturnValue({
      data: undefined,
      isLoading: false,
    })
    
    const { result } = renderHook(() => useUserVault())
    
    // hasVault is falsy (undefined or false) when no vault
    expect(result.current.hasVault).toBeFalsy()
  })
})

describe('useCreateVault', () => {
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

  it('provides createVault function', () => {
    const { result } = renderHook(() => useCreateVault())
    
    expect(typeof result.current.createVault).toBe('function')
  })

  it('returns isCreating as false when not pending', () => {
    const { result } = renderHook(() => useCreateVault())
    
    expect(result.current.isCreating).toBe(false)
  })

  it('returns isCreating as true when pending', () => {
    mockUseWriteContract.mockReturnValue({
      writeContract: mockWriteContract,
      data: undefined,
      isPending: true,
    })
    
    const { result } = renderHook(() => useCreateVault())
    
    expect(result.current.isCreating).toBe(true)
  })

  it('returns isCreating as true when confirming', () => {
    mockUseWaitForTransactionReceipt.mockReturnValue({
      isLoading: true,
      isSuccess: false,
    })
    
    const { result } = renderHook(() => useCreateVault())
    
    expect(result.current.isCreating).toBe(true)
  })

  it('returns isSuccess when transaction confirmed', () => {
    mockUseWaitForTransactionReceipt.mockReturnValue({
      isLoading: false,
      isSuccess: true,
    })
    
    const { result } = renderHook(() => useCreateVault())
    
    expect(result.current.isSuccess).toBe(true)
  })

  it('returns txHash when available', () => {
    const txHash = '0xabc123'
    mockUseWriteContract.mockReturnValue({
      writeContract: mockWriteContract,
      data: txHash,
      isPending: false,
    })
    
    const { result } = renderHook(() => useCreateVault())
    
    expect(result.current.txHash).toBe(txHash)
  })
})

describe('useVaultBalance', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseAccount.mockReturnValue({ address: '0x1234' })
  })

  it('returns formatted balance', () => {
    mockUseReadContract.mockImplementation((args: { functionName: string }) => {
      if (args.functionName === 'vaultOf') {
        return { data: '0x5678', isLoading: false }
      }
      if (args.functionName === 'balanceOf') {
        return { 
          data: BigInt('1000000000000000000000'), // 1000 tokens
          isLoading: false,
          refetch: jest.fn(),
        }
      }
      return { data: null, isLoading: false }
    })
    
    const { result } = renderHook(() => useVaultBalance())
    
    expect(result.current.balance).toBe('1000')
  })

  it('returns zero balance when no balance', () => {
    mockUseReadContract.mockImplementation((args: { functionName: string }) => {
      if (args.functionName === 'vaultOf') {
        return { data: '0x5678', isLoading: false }
      }
      return { 
        data: null,
        isLoading: false,
        refetch: jest.fn(),
      }
    })
    
    const { result } = renderHook(() => useVaultBalance())
    
    expect(result.current.balance).toBe('0')
  })

  it('returns raw balance as bigint', () => {
    const rawBalance = BigInt('5000000000000000000000')
    mockUseReadContract.mockImplementation((args: { functionName: string }) => {
      if (args.functionName === 'vaultOf') {
        return { data: '0x5678', isLoading: false }
      }
      if (args.functionName === 'balanceOf') {
        return { 
          data: rawBalance,
          isLoading: false,
          refetch: jest.fn(),
        }
      }
      return { data: null, isLoading: false }
    })
    
    const { result } = renderHook(() => useVaultBalance())
    
    expect(result.current.balanceRaw).toBe(rawBalance)
  })

  it('provides refetch function', () => {
    const mockRefetch = jest.fn()
    mockUseReadContract.mockImplementation((args: { functionName: string }) => {
      if (args.functionName === 'vaultOf') {
        return { data: '0x5678', isLoading: false }
      }
      return { 
        data: BigInt('1000000000000000000000'),
        isLoading: false,
        refetch: mockRefetch,
      }
    })
    
    const { result } = renderHook(() => useVaultBalance())
    
    expect(typeof result.current.refetch).toBe('function')
  })
})

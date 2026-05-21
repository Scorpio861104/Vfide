/**
 * Real VaultHub Hooks Tests
 * Tests for useVaultHub to increase coverage
 */

import { describe, it, expect, vi, beforeEach } from '@jest/globals'
import { renderHook } from '@testing-library/react'

// Mock wagmi
const mockUseAccount = jest.fn()
const mockUseReadContract = jest.fn()
const mockUseWriteContract = jest.fn()
const mockUseChainId = jest.fn()

jest.mock('wagmi', () => ({
  useAccount: () => mockUseAccount(),
  useReadContract: (args: unknown) => mockUseReadContract(args),
  useWriteContract: () => mockUseWriteContract(),
  useChainId: () => mockUseChainId(),
  useSwitchChain: jest.fn(() => ({ switchChain: jest.fn(), switchChainAsync: jest.fn(), chains: [], status: 'idle' })),
  useReadContracts: jest.fn(() => ({ data: undefined, isError: false, isLoading: false, isSuccess: false, error: null, refetch: jest.fn() })),
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
}))

// Mock viem
jest.mock('viem', () => ({
  isAddress: (addr: string) => addr && addr.startsWith('0x') && addr.length === 42,
  parseAbi: jest.fn(() => []),
  parseAbiItem: jest.fn((sig: any) => ({ name: typeof sig === 'string' ? sig.split(' ')[1]?.split('(')[0] : '', type: 'function' })),
  formatUnits: jest.fn((v: any) => String(v)),
  parseUnits: jest.fn((v: any) => BigInt(v || 0)),
  formatEther: jest.fn((v: any) => String(v)),
  parseEther: jest.fn((v: any) => BigInt(v || 0)),
  getAddress: jest.fn((a: string) => a),
  encodeFunctionData: jest.fn(() => '0x'),
  decodeFunctionResult: jest.fn(() => undefined),
  encodeAbiParameters: jest.fn(() => '0x'),
  decodeAbiParameters: jest.fn(() => []),
  keccak256: jest.fn(() => '0x' + '0'.repeat(64)),
  toBytes: jest.fn(() => new Uint8Array()),
  toHex: jest.fn((v: any) => '0x' + (v ?? '').toString(16)),
  hexToString: jest.fn((h: any) => String(h)),
  padHex: jest.fn((h: any) => h),
  zeroAddress: '0x0000000000000000000000000000000000000000',
  stringToHex: jest.fn((s: any) => '0x' + Buffer.from(String(s)).toString('hex')),
  createPublicClient: jest.fn(() => ({ readContract: jest.fn(), getBlockNumber: jest.fn() })),
  createWalletClient: jest.fn(() => ({ writeContract: jest.fn() })),
  http: jest.fn(() => ({})),
  custom: jest.fn(() => ({})),
  erc20Abi: [],
  erc721Abi: [],
}))

// Mock contracts
jest.mock('../../lib/contracts', () => ({
  CONTRACT_ADDRESSES: {
    VaultHub: '0x6666666666666666666666666666666666666666',
  },
  VAULT_HUB_ABI: [],
  ZERO_ADDRESS: '0x0000000000000000000000000000000000000000',
  isConfiguredContractAddress: (address?: string | null) =>
    typeof address === 'string' &&
    address !== '0x0000000000000000000000000000000000000000' &&
    address.startsWith('0x') &&
    address.length === 42,
  getContractAddresses: jest.fn(() => ({})),
  validateContractAddress: jest.fn((addr: any) => addr),
}))

// Mock utils
jest.mock('../../lib/utils', () => ({
  devLog: {
    error: jest.fn(),
    log: jest.fn(),
    warn: jest.fn(),
  },
}))

// Mock testnet
jest.mock('../../lib/testnet', () => ({
  IS_TESTNET: true,
  CURRENT_CHAIN_ID: 84532,
}))

// Import hooks after mocks
import { useVaultHub } from '../../hooks/useVaultHub'

describe('useVaultHub', () => {
  const mockWriteContractAsync = jest.fn()
  const mockRefetch = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseAccount.mockReturnValue({ address: '0xuser123456789012345678901234567890123456' })
    mockUseChainId.mockReturnValue(84532)
    mockUseWriteContract.mockReturnValue({
      writeContractAsync: mockWriteContractAsync,
      isPending: false,
    })
    mockUseReadContract.mockReturnValue({
      data: undefined,
      isLoading: false,
      refetch: mockRefetch,
    })
  })

  it('returns hasVault false when no vault', () => {
    mockUseReadContract.mockImplementation(({ functionName }) => {
      if (functionName === 'vaultOf') return { data: '0x0000000000000000000000000000000000000000', isLoading: false, refetch: mockRefetch }
      return { data: undefined }
    })
    
    const { result } = renderHook(() => useVaultHub())
    
    expect(result.current.hasVault).toBe(false)
  })

  it('returns hasVault true when vault exists', () => {
    mockUseReadContract.mockImplementation(({ functionName }) => {
      if (functionName === 'vaultOf') return { data: '0x1234567890123456789012345678901234567890', isLoading: false, refetch: mockRefetch }
      return { data: undefined }
    })
    
    const { result } = renderHook(() => useVaultHub())
    
    expect(result.current.hasVault).toBe(true)
  })

  it('returns vaultAddress when vault exists', () => {
    mockUseReadContract.mockImplementation(({ functionName }) => {
      if (functionName === 'vaultOf') return { data: '0x1234567890123456789012345678901234567890', isLoading: false, refetch: mockRefetch }
      return { data: undefined }
    })
    
    const { result } = renderHook(() => useVaultHub())
    
    expect(result.current.vaultAddress).toBe('0x1234567890123456789012345678901234567890')
  })

  it('returns undefined vaultAddress when no vault', () => {
    mockUseReadContract.mockImplementation(({ functionName }) => {
      if (functionName === 'vaultOf') return { data: undefined, isLoading: false, refetch: mockRefetch }
      return { data: undefined }
    })
    
    const { result } = renderHook(() => useVaultHub())
    
    expect(result.current.vaultAddress).toBeUndefined()
  })

  it('returns isLoadingVault state', () => {
    mockUseReadContract.mockImplementation(({ functionName }) => {
      if (functionName === 'vaultOf') return { data: undefined, isLoading: true, refetch: mockRefetch }
      return { data: undefined }
    })
    
    const { result } = renderHook(() => useVaultHub())
    
    expect(result.current.isLoadingVault).toBe(true)
  })

  it('returns isCreatingVault state', () => {
    mockUseWriteContract.mockReturnValue({
      writeContractAsync: mockWriteContractAsync,
      isPending: true,
    })
    
    const { result } = renderHook(() => useVaultHub())
    
    expect(result.current.isCreatingVault).toBe(true)
  })

  it('provides createVault function', () => {
    const { result } = renderHook(() => useVaultHub())
    
    expect(typeof result.current.createVault).toBe('function')
  })

  it('provides refetchVault function', () => {
    mockUseReadContract.mockImplementation(({ functionName }) => {
      if (functionName === 'vaultOf') return { data: undefined, isLoading: false, refetch: mockRefetch }
      return { data: undefined }
    })
    
    const { result } = renderHook(() => useVaultHub())
    
    expect(typeof result.current.refetchVault).toBe('function')
  })

  it('returns isOnCorrectChain true when on expected chain', () => {
    mockUseChainId.mockReturnValue(84532)
    
    const { result } = renderHook(() => useVaultHub())
    
    expect(result.current.isOnCorrectChain).toBe(true)
  })

  it('returns isOnCorrectChain false when on wrong chain', () => {
    mockUseChainId.mockReturnValue(1) // Mainnet
    
    const { result } = renderHook(() => useVaultHub())
    
    expect(result.current.isOnCorrectChain).toBe(false)
  })

  it('returns expectedChainId', () => {
    const { result } = renderHook(() => useVaultHub())
    
    expect(result.current.expectedChainId).toBe(84532)
  })

  it('returns expectedChainName', () => {
    const { result } = renderHook(() => useVaultHub())
    
    expect(result.current.expectedChainName).toBe('Base Sepolia')
  })

  it('returns isContractConfigured true when VaultHub address is configured', () => {
    mockUseReadContract.mockImplementation(({ functionName }) => {
      if (functionName === 'vaultOf') return { data: undefined, isLoading: false, refetch: mockRefetch }
      return { data: undefined }
    })
    
    const { result } = renderHook(() => useVaultHub())
    
    expect(result.current.isContractConfigured).toBe(true)
  })
})

/**
 * Real VaultRegistry Hooks Tests
 * Tests for useVaultRegistry to increase coverage
 */

import { describe, it, expect, vi, beforeEach } from '@jest/globals'
import { renderHook, act } from '@testing-library/react'

// Mock wagmi
const mockUseReadContract = jest.fn()
const mockUseWriteContract = jest.fn()
const mockUseWaitForTransactionReceipt = jest.fn()

jest.mock('wagmi', () => ({ /* CANONICAL_WAGMI_MOCK */
  useAccount: jest.fn(() => ({ address: undefined, isConnected: false, status: 'disconnected' })),
  useChainId: jest.fn(() => 1),
  useSwitchChain: jest.fn(() => ({ switchChain: jest.fn(), switchChainAsync: jest.fn(), chains: [], status: 'idle' })),
  useReadContract: (args: unknown) => mockUseReadContract(args),
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
  WagmiProvider: ({ children }) => children,
  createConfig: jest.fn(() => ({})),
  http: jest.fn(() => ({})),
}))

// Mock viem
jest.mock('viem', () => ({
  keccak256: (input: unknown) => '0xhash',
  toBytes: (input: string) => new Uint8Array(),
  isAddress: (value: string) => /^0x[a-fA-F0-9]{40}$/.test(value),
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

jest.mock('../../lib/contracts', () => ({
  CONTRACT_ADDRESSES: {},
  CONTRACTS: {},
  getContractAddresses: jest.fn(() => ({})),
  isConfiguredContractAddress: jest.fn(() => true),
  validateContractAddress: jest.fn((addr) => addr),
}))

// Import hooks after mocks
import {
  useSearchByRecoveryId,
  useSearchByEmail,
  useSearchByUsername,
  useSearchByGuardian,
  useVaultInfo,
  useSearchByWalletAddress,
  useSearchByVaultAddress,
  useTotalVaults,
  useSetRecoveryId,
  useSetEmailRecovery,
  useSetUsername,
  useIsRecoveryIdAvailable,
  useIsUsernameAvailable,
  useGetClaim,
  useActiveClaimForVault,
  ClaimStatus,
  ClaimStatusLabels,
} from '../../hooks/useVaultRegistry'

describe('ClaimStatus constants', () => {
  it('has correct status values', () => {
    expect(ClaimStatus.None).toBe(0)
    expect(ClaimStatus.Pending).toBe(1)
    expect(ClaimStatus.GuardianApproved).toBe(2)
    expect(ClaimStatus.Challenged).toBe(3)
    expect(ClaimStatus.Approved).toBe(4)
    expect(ClaimStatus.Executed).toBe(5)
    expect(ClaimStatus.Rejected).toBe(6)
    expect(ClaimStatus.Expired).toBe(7)
  })

  it('has correct status labels', () => {
    expect(ClaimStatusLabels[0]).toBe('None')
    expect(ClaimStatusLabels[1]).toBe('Pending')
    expect(ClaimStatusLabels[2]).toBe('Guardian Approved')
    expect(ClaimStatusLabels[3]).toBe('Challenged')
    expect(ClaimStatusLabels[4]).toBe('Approved')
    expect(ClaimStatusLabels[5]).toBe('Executed')
    expect(ClaimStatusLabels[6]).toBe('Rejected')
    expect(ClaimStatusLabels[7]).toBe('Expired')
  })
})

describe('useSearchByRecoveryId', () => {
  const mockRefetch = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseReadContract.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    })
  })

  it('returns vault when found', () => {
    mockUseReadContract.mockReturnValue({
      data: '0xvault',
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    })
    
    const { result } = renderHook(() => useSearchByRecoveryId('my-recovery-id'))
    
    expect(result.current.vault).toBe('0xvault')
  })

  it('returns isLoading state', () => {
    mockUseReadContract.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: mockRefetch,
    })
    
    const { result } = renderHook(() => useSearchByRecoveryId('my-recovery-id'))
    
    expect(result.current.isLoading).toBe(true)
  })

  it('returns undefined when no vault found', () => {
    mockUseReadContract.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    })
    
    const { result } = renderHook(() => useSearchByRecoveryId('my-recovery-id'))
    
    expect(result.current.vault).toBeUndefined()
  })
})

describe('useSearchByEmail', () => {
  const mockRefetch = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseReadContract.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    })
  })

  it('returns vault', () => {
    mockUseReadContract.mockReturnValue({
      data: '0xvault',
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    })
    
    const { result } = renderHook(() => useSearchByEmail('test@example.com'))
    
    expect(result.current.vault).toBe('0xvault')
  })

  it('returns isLoading state', () => {
    mockUseReadContract.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: mockRefetch,
    })
    
    const { result } = renderHook(() => useSearchByEmail('test@example.com'))
    
    expect(result.current.isLoading).toBe(true)
  })
})

describe('useSearchByUsername', () => {
  const mockRefetch = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseReadContract.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    })
  })

  it('returns vault', () => {
    mockUseReadContract.mockReturnValue({
      data: '0xvault',
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    })
    
    const { result } = renderHook(() => useSearchByUsername('myusername'))
    
    expect(result.current.vault).toBe('0xvault')
  })
})

describe('useSearchByGuardian', () => {
  const mockRefetch = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseReadContract.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    })
  })

  it('returns vaults array when found', () => {
    mockUseReadContract.mockReturnValue({
      data: ['0xvault1', '0xvault2'],
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    })
    
    const { result } = renderHook(() => useSearchByGuardian('0xguardian'))
    
    expect(result.current.vaults).toEqual(['0xvault1', '0xvault2'])
  })
})

describe('useVaultInfo', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseReadContract.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
    })
  })

  it('returns isLoading state', () => {
    mockUseReadContract.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    })
    
    const { result } = renderHook(() => useVaultInfo('0xvault'))
    
    expect(result.current.isLoading).toBe(true)
  })
})

describe('useSearchByWalletAddress', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseReadContract.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
    })
  })

  it('returns isLoading state', () => {
    mockUseReadContract.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    })
    
    const { result } = renderHook(() => useSearchByWalletAddress('0xoldwallet'))
    
    expect(result.current.isLoading).toBe(true)
  })
})

describe('useSearchByVaultAddress', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseReadContract.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
    })
  })

  it('returns isLoading state', () => {
    mockUseReadContract.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    })
    
    const { result } = renderHook(() => useSearchByVaultAddress('0xvault'))
    
    expect(result.current.isLoading).toBe(true)
  })
})

describe('useTotalVaults', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseReadContract.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
    })
  })

  it('returns isLoading state', () => {
    mockUseReadContract.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    })
    
    const { result } = renderHook(() => useTotalVaults())
    
    expect(result.current.isLoading).toBe(true)
  })
})

describe('useSetRecoveryId', () => {
  const mockWriteContractAsync = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseWriteContract.mockReturnValue({
      writeContractAsync: mockWriteContractAsync,
      isPending: false,
    })
    mockUseWaitForTransactionReceipt.mockReturnValue({
      isLoading: false,
      isSuccess: false,
    })
  })

  it('provides setRecoveryId function', () => {
    const { result } = renderHook(() => useSetRecoveryId())
    
    expect(typeof result.current.setRecoveryId).toBe('function')
  })

  it('returns isPending state', () => {
    mockUseWriteContract.mockReturnValue({
      writeContractAsync: mockWriteContractAsync,
      isPending: true,
    })
    
    const { result } = renderHook(() => useSetRecoveryId())
    
    expect(result.current.isPending).toBe(true)
  })
})

describe('useSetEmailRecovery', () => {
  const mockWriteContractAsync = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseWriteContract.mockReturnValue({
      writeContractAsync: mockWriteContractAsync,
      isPending: false,
    })
    mockUseWaitForTransactionReceipt.mockReturnValue({
      isLoading: false,
      isSuccess: false,
    })
  })

  it('provides setEmailRecovery function', () => {
    const { result } = renderHook(() => useSetEmailRecovery())
    
    expect(typeof result.current.setEmailRecovery).toBe('function')
  })
})

describe('useSetUsername', () => {
  const mockWriteContractAsync = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseWriteContract.mockReturnValue({
      writeContractAsync: mockWriteContractAsync,
      isPending: false,
    })
    mockUseWaitForTransactionReceipt.mockReturnValue({
      isLoading: false,
      isSuccess: false,
    })
  })

  it('provides setUsername function', () => {
    const { result } = renderHook(() => useSetUsername())
    
    expect(typeof result.current.setUsername).toBe('function')
  })
})

describe('useIsRecoveryIdAvailable', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseReadContract.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
    })
  })

  it('returns isAvailable true', () => {
    mockUseReadContract.mockReturnValue({
      data: true,
      isLoading: false,
      error: null,
    })
    
    const { result } = renderHook(() => useIsRecoveryIdAvailable('new-id'))
    
    expect(result.current.isAvailable).toBe(true)
  })

  it('returns isAvailable false when taken', () => {
    mockUseReadContract.mockReturnValue({
      data: false,
      isLoading: false,
      error: null,
    })
    
    const { result } = renderHook(() => useIsRecoveryIdAvailable('taken-id'))
    
    expect(result.current.isAvailable).toBe(false)
  })
})

describe('useIsUsernameAvailable', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseReadContract.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
    })
  })

  it('returns isAvailable true', () => {
    mockUseReadContract.mockReturnValue({
      data: true,
      isLoading: false,
      error: null,
    })
    
    const { result } = renderHook(() => useIsUsernameAvailable('newuser'))
    
    expect(result.current.isAvailable).toBe(true)
  })
})

describe('useGetClaim', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseReadContract.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
    })
  })

  it('returns isLoading state', () => {
    mockUseReadContract.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    })
    
    const { result } = renderHook(() => useGetClaim(BigInt(1)))
    
    expect(result.current.isLoading).toBe(true)
  })
})

describe('useActiveClaimForVault', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseReadContract.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
    })
  })

  it('returns isLoading state', () => {
    mockUseReadContract.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    })
    
    const { result } = renderHook(() => useActiveClaimForVault('0xvault'))
    
    expect(result.current.isLoading).toBe(true)
  })
})

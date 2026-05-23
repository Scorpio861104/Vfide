/**
 * useVaultHooks unit tests — covers useVaultBalance, useGuardianCancelInheritance,
 * useInheritanceStatus, and useUserVault to satisfy the coverage gate.
 *
 * @jest-environment jsdom
 */

import { renderHook, act } from '@testing-library/react'

/* ─── Wagmi mock ─────────────────────────────────────────────────────────── */
const mockUseAccount = jest.fn()
const mockUseReadContract = jest.fn()
const mockUseWriteContract = jest.fn()
const mockUseWaitForTransactionReceipt = jest.fn()
const mockUseChainId = jest.fn()

jest.mock('wagmi', () => ({ /* CANONICAL_WAGMI_MOCK_V2 */
  useAccount: () => mockUseAccount(),
  useChainId: () => mockUseChainId(),
  useSwitchChain: jest.fn(() => ({ switchChain: jest.fn(), switchChainAsync: jest.fn(), chains: [], status: 'idle' })),
  useReadContract: (args: unknown) => mockUseReadContract(args),
  useReadContracts: jest.fn(() => ({ data: undefined, isLoading: false })),
  useWriteContract: (...args: unknown[]) => mockUseWriteContract(...args),
  useWaitForTransactionReceipt: (args: unknown) => mockUseWaitForTransactionReceipt(args),
  useWatchContractEvent: jest.fn(() => undefined),
  usePublicClient: jest.fn(() => null),
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
  WagmiProvider: ({ children }: { children: unknown }) => children,
  createConfig: jest.fn(() => ({})),
  createStorage: jest.fn(() => ({ getItem: jest.fn(() => null), setItem: jest.fn(), removeItem: jest.fn() })),
  cookieStorage: { getItem: jest.fn(() => null), setItem: jest.fn(), removeItem: jest.fn() },
  http: jest.fn(() => ({})),
  fallback: jest.fn(() => ({})),
  useGasPrice: jest.fn(() => ({ data: undefined, isLoading: false, isError: false, refetch: jest.fn() })),
  useEstimateFeesPerGas: jest.fn(() => ({ data: undefined, isLoading: false, isError: false, refetch: jest.fn() })),
  useReconnect: jest.fn(() => ({ reconnect: jest.fn(), reconnectAsync: jest.fn(), connectors: [], status: 'idle', isPending: false, isSuccess: false, isError: false })),
  useTransaction: jest.fn(() => ({ data: undefined, isLoading: false, isSuccess: false, isError: false })),
  useTransactionReceipt: jest.fn(() => ({ data: undefined, isLoading: false, isSuccess: false, isError: false })),
  serialize: jest.fn((v: unknown) => JSON.stringify(v)),
  deserialize: jest.fn((v: unknown) => { try { return JSON.parse(v as string) } catch { return v } }),
  cookieToInitialState: jest.fn(() => undefined),
}))

/* ─── viem mock ──────────────────────────────────────────────────────────── */
jest.mock('viem', () => ({
  formatEther: jest.fn((v: bigint) => (Number(v) / 1e18).toString()),
}))

/* ─── Contracts mock ─────────────────────────────────────────────────────── */
jest.mock('@/lib/contracts', () => ({
  CONTRACT_ADDRESSES: {
    VFIDEToken: '0x1111111111111111111111111111111111111101',
    VaultHub: '0x1111111111111111111111111111111111111105',
  },
  CONTRACTS: {},
  getContractAddresses: jest.fn(() => ({
    VFIDEToken: '0x1111111111111111111111111111111111111101',
    VaultHub: '0x1111111111111111111111111111111111111105',
  })),
  isConfiguredContractAddress: jest.fn(() => true),
  validateContractAddress: jest.fn((addr: unknown) => addr),
  ZERO_ADDRESS: '0x0000000000000000000000000000000000000000',
  CURRENT_CHAIN_ID: 84532,
  ACTIVE_VAULT_IMPLEMENTATION: 'cardbound',
  isCardBoundVaultMode: jest.fn(() => true),
}))

/* ─── ABIs mock ──────────────────────────────────────────────────────────── */
jest.mock('@/lib/abis', () => ({
  VaultHubABI: [],
  VFIDETokenABI: [],
  CardBoundVaultABI: [],
}))

/* ─── constants mock ─────────────────────────────────────────────────────── */
jest.mock('@/lib/constants', () => ({
  ZERO_ADDRESS: '0x0000000000000000000000000000000000000000',
}))

/* ─── appStore mock ──────────────────────────────────────────────────────── */
const mockSetVault = jest.fn()
jest.mock('@/lib/store/appStore', () => ({
  useAppStore: jest.fn((selector: (s: { setVault: jest.Mock }) => unknown) =>
    selector({ setVault: mockSetVault })
  ),
}))

/* ─── useContractAddresses mock ──────────────────────────────────────────── */
jest.mock('@/hooks/useContractAddresses', () => ({
  useContractAddresses: jest.fn(() => ({
    VFIDEToken: '0x1111111111111111111111111111111111111101',
    VaultHub: '0x1111111111111111111111111111111111111105',
  })),
}))

import {
  useUserVault,
  useVaultBalance,
  useGuardianCancelInheritance,
  useInheritanceStatus,
} from '@/hooks/useVaultHooks'

const VAULT_ADDR = '0xVault0000000000000000000000000000000001' as `0x${string}`
const ZERO_ADDR = '0x0000000000000000000000000000000000000000' as `0x${string}`

/* ═══════════════════════════════════════════════════════════════════════════
   useUserVault
═══════════════════════════════════════════════════════════════════════════ */
describe('useUserVault', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseChainId.mockReturnValue(84532)
  })

  it('returns null vaultAddress when no wallet connected', () => {
    mockUseAccount.mockReturnValue({ address: undefined })
    mockUseReadContract.mockReturnValue({ data: undefined, isLoading: false })

    const { result } = renderHook(() => useUserVault())

    expect(result.current.vaultAddress).toBeNull()
    expect(result.current.hasVault).toBeFalsy()
    expect(result.current.isLoading).toBe(false)
  })

  it('returns null vaultAddress when vault is ZERO_ADDRESS', () => {
    mockUseAccount.mockReturnValue({ address: '0xUser1111' })
    mockUseReadContract.mockReturnValue({ data: ZERO_ADDR, isLoading: false })

    const { result } = renderHook(() => useUserVault())

    expect(result.current.vaultAddress).toBeNull()
    expect(result.current.hasVault).toBeFalsy()
  })

  it('returns vault address when vault exists', () => {
    mockUseAccount.mockReturnValue({ address: '0xUser1111' })
    mockUseReadContract.mockReturnValue({ data: VAULT_ADDR, isLoading: false })

    const { result } = renderHook(() => useUserVault())

    expect(result.current.vaultAddress).toBe(VAULT_ADDR)
    expect(result.current.hasVault).toBeTruthy()
  })

  it('returns isLoading true when loading', () => {
    mockUseAccount.mockReturnValue({ address: '0xUser1111' })
    mockUseReadContract.mockReturnValue({ data: undefined, isLoading: true })

    const { result } = renderHook(() => useUserVault())

    expect(result.current.isLoading).toBe(true)
  })

  it('exposes implementation and isCardBound', () => {
    mockUseAccount.mockReturnValue({ address: undefined })
    mockUseReadContract.mockReturnValue({ data: undefined, isLoading: false })

    const { result } = renderHook(() => useUserVault())

    expect(result.current.implementation).toBe('cardbound')
    expect(result.current.isCardBound).toBe(true)
  })
})

/* ═══════════════════════════════════════════════════════════════════════════
   useVaultBalance
═══════════════════════════════════════════════════════════════════════════ */
describe('useVaultBalance', () => {
  const mockRefetch = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseChainId.mockReturnValue(84532)
    mockUseAccount.mockReturnValue({ address: '0xUser1111' })
  })

  it('returns "0" balance when no vault address', () => {
    mockUseReadContract.mockImplementation((args: { functionName: string }) => {
      if (args.functionName === 'vaultOf') return { data: undefined, isLoading: false }
      return { data: undefined, isLoading: false, refetch: mockRefetch }
    })

    const { result } = renderHook(() => useVaultBalance())

    expect(result.current.balance).toBe('0')
    expect(result.current.balanceRaw).toBe(0n)
    expect(result.current.lockedBalance).toBe('0')
    expect(result.current.lockedBalanceRaw).toBe(0n)
  })

  it('returns formatted balance when vault and balance exist', () => {
    mockUseReadContract.mockImplementation((args: { functionName: string }) => {
      if (args.functionName === 'vaultOf') return { data: VAULT_ADDR, isLoading: false }
      if (args.functionName === 'balanceOf') return {
        data: 1000000000000000000n, // 1 token
        isLoading: false,
        refetch: mockRefetch,
      }
      return { data: undefined, isLoading: false, refetch: mockRefetch }
    })

    const { result } = renderHook(() => useVaultBalance())

    expect(result.current.balance).toBe('1')
    expect(result.current.balanceRaw).toBe(1000000000000000000n)
  })

  it('returns "0" when balance is null/undefined', () => {
    mockUseReadContract.mockImplementation((args: { functionName: string }) => {
      if (args.functionName === 'vaultOf') return { data: VAULT_ADDR, isLoading: false }
      return { data: null, isLoading: false, refetch: mockRefetch }
    })

    const { result } = renderHook(() => useVaultBalance())

    expect(result.current.balance).toBe('0')
    expect(result.current.balanceRaw).toBe(0n)
  })

  it('provides a refetch function', () => {
    mockUseReadContract.mockImplementation((args: { functionName: string }) => {
      if (args.functionName === 'vaultOf') return { data: VAULT_ADDR, isLoading: false }
      return { data: 0n, isLoading: false, refetch: mockRefetch }
    })

    const { result } = renderHook(() => useVaultBalance())

    expect(typeof result.current.refetch).toBe('function')
  })

  it('reflects isLoading from balanceOf call', () => {
    mockUseReadContract.mockImplementation((args: { functionName: string }) => {
      if (args.functionName === 'vaultOf') return { data: VAULT_ADDR, isLoading: false }
      return { data: undefined, isLoading: true, refetch: mockRefetch }
    })

    const { result } = renderHook(() => useVaultBalance())

    expect(result.current.isLoading).toBe(true)
  })

  it('calls setVault when vault address and balance are available', () => {
    mockUseReadContract.mockImplementation((args: { functionName: string }) => {
      if (args.functionName === 'vaultOf') return { data: VAULT_ADDR, isLoading: false }
      if (args.functionName === 'balanceOf') return {
        data: 2000000000000000000n, // 2 tokens
        isLoading: false,
        refetch: mockRefetch,
      }
      return { data: undefined, isLoading: false, refetch: mockRefetch }
    })

    renderHook(() => useVaultBalance())

    expect(mockSetVault).toHaveBeenCalledWith(
      expect.objectContaining({
        address: VAULT_ADDR,
        lockedBalance: '0',
      })
    )
  })

  it('does NOT call setVault when vaultAddress is null', () => {
    mockUseReadContract.mockImplementation(() => ({
      data: undefined,
      isLoading: false,
      refetch: mockRefetch,
    }))

    renderHook(() => useVaultBalance())

    expect(mockSetVault).not.toHaveBeenCalled()
  })
})

/* ═══════════════════════════════════════════════════════════════════════════
   useGuardianCancelInheritance
═══════════════════════════════════════════════════════════════════════════ */
describe('useGuardianCancelInheritance', () => {
  const mockWriteContractAsync = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseWriteContract.mockReturnValue({
      writeContractAsync: mockWriteContractAsync,
    })
    mockUseWaitForTransactionReceipt.mockReturnValue({
      isSuccess: false,
      isLoading: false,
    })
  })

  it('returns cancelInheritance function, isLoading, isSuccess', () => {
    const { result } = renderHook(() => useGuardianCancelInheritance(VAULT_ADDR))

    expect(typeof result.current.cancelInheritance).toBe('function')
    expect(result.current.isLoading).toBe(false)
    expect(result.current.isSuccess).toBe(false)
  })

  it('cancelInheritance returns success with txHash on success', async () => {
    const txHash = '0xabcdef1234567890' as `0x${string}`
    mockWriteContractAsync.mockResolvedValue(txHash)

    const { result } = renderHook(() => useGuardianCancelInheritance(VAULT_ADDR))

    let response!: { success: boolean; txHash?: `0x${string}`; error?: string }
    await act(async () => {
      response = await result.current.cancelInheritance()
    })

    expect(response.success).toBe(true)
    expect(response.txHash).toBe(txHash)
  })

  it('cancelInheritance returns error on transaction failure', async () => {
    mockWriteContractAsync.mockRejectedValue(new Error('user rejected transaction'))

    const { result } = renderHook(() => useGuardianCancelInheritance(VAULT_ADDR))

    let response!: { success: boolean; txHash?: `0x${string}`; error?: string }
    await act(async () => {
      response = await result.current.cancelInheritance()
    })

    expect(response.success).toBe(false)
    expect(response.error).toBe('user rejected transaction')
  })

  it('cancelInheritance returns generic error for non-Error throws', async () => {
    mockWriteContractAsync.mockRejectedValue('some string error')

    const { result } = renderHook(() => useGuardianCancelInheritance(VAULT_ADDR))

    let response!: { success: boolean; txHash?: `0x${string}`; error?: string }
    await act(async () => {
      response = await result.current.cancelInheritance()
    })

    expect(response.success).toBe(false)
    expect(response.error).toBe('Transaction failed')
  })

  it('works without vaultAddress argument', async () => {
    mockWriteContractAsync.mockRejectedValue(new Error('no vault'))

    const { result } = renderHook(() => useGuardianCancelInheritance())

    let response!: { success: boolean; txHash?: `0x${string}`; error?: string }
    await act(async () => {
      response = await result.current.cancelInheritance()
    })

    expect(response.success).toBe(false)
  })

  it('reflects isSuccess from useWaitForTransactionReceipt', () => {
    mockUseWaitForTransactionReceipt.mockReturnValue({
      isSuccess: true,
      isLoading: false,
    })

    const { result } = renderHook(() => useGuardianCancelInheritance(VAULT_ADDR))

    expect(result.current.isSuccess).toBe(true)
  })

  it('reflects isLoading from useWaitForTransactionReceipt', () => {
    mockUseWaitForTransactionReceipt.mockReturnValue({
      isSuccess: false,
      isLoading: true,
    })

    const { result } = renderHook(() => useGuardianCancelInheritance(VAULT_ADDR))

    expect(result.current.isLoading).toBe(true)
  })
})

/* ═══════════════════════════════════════════════════════════════════════════
   useInheritanceStatus
═══════════════════════════════════════════════════════════════════════════ */
describe('useInheritanceStatus', () => {
  it('always returns ZERO_ADDRESS as nextOfKin', () => {
    const { result } = renderHook(() => useInheritanceStatus(VAULT_ADDR))

    expect(result.current.nextOfKin).toBe(ZERO_ADDR)
    expect(result.current.hasNextOfKin).toBe(false)
  })

  it('works without vaultAddress argument', () => {
    const { result } = renderHook(() => useInheritanceStatus())

    expect(result.current.nextOfKin).toBe(ZERO_ADDR)
    expect(result.current.hasNextOfKin).toBe(false)
  })
})

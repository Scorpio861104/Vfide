import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { renderHook, act } from '@testing-library/react'

jest.mock('wagmi', () => ({
  useAccount: jest.fn(() => ({ address: undefined, isConnected: false, status: 'disconnected' })),
  useChainId: jest.fn(() => 1),
  usePublicClient: jest.fn(() => ({ readContract: jest.fn(), getBlockNumber: jest.fn(), getTransactionReceipt: jest.fn() })),
  useSignTypedData: jest.fn(() => ({ signTypedData: jest.fn(), signTypedDataAsync: jest.fn(), data: undefined, isPending: false, isError: false, error: null, reset: jest.fn() })),
  useWriteContract: jest.fn(() => ({ writeContract: jest.fn(), writeContractAsync: jest.fn(), data: undefined, isPending: false, isSuccess: false, isError: false, error: null, reset: jest.fn() })),
  useWaitForTransactionReceipt: jest.fn(() => ({ data: undefined, isLoading: false, isSuccess: false, isError: false })),
  useReadContract: jest.fn(() => ({ data: undefined, isError: false, isLoading: false, isSuccess: false, error: null, refetch: jest.fn() })),
  useSwitchChain: jest.fn(() => ({ switchChain: jest.fn(), switchChainAsync: jest.fn(), chains: [], status: 'idle' })),
  useReadContracts: jest.fn(() => ({ data: undefined, isError: false, isLoading: false, isSuccess: false, error: null, refetch: jest.fn() })),
  useWatchContractEvent: jest.fn(() => undefined),
  useWalletClient: jest.fn(() => ({ data: undefined, isLoading: false })),
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

jest.mock('../useContractAddresses', () => ({
  useContractAddresses: () => ({
    MerchantPortal: '0x1111111111111111111111111111111111111111',
    VaultHub: '0x2222222222222222222222222222222222222222',
  }),
}))

jest.mock('../../lib/contracts', () => ({
  // CANONICAL_CONTRACTS_MOCK_V4
  CONTRACT_ADDRESSES: { VFIDEToken: '0x1111111111111111111111111111111111111101', StablecoinRegistry: '0x1111111111111111111111111111111111111102', MerchantPortal: '0x1111111111111111111111111111111111111103', MerchantRegistry: '0x1111111111111111111111111111111111111104', VaultHub: '0x1111111111111111111111111111111111111105', Seer: '0x1111111111111111111111111111111111111106', SeerView: '0x1111111111111111111111111111111111111107', DAO: '0x1111111111111111111111111111111111111108', DAOTimelock: '0x1111111111111111111111111111111111111109', TrustGateway: '0x111111111111111111111111111111111111110a', GuardianRegistry: '0x111111111111111111111111111111111111110b', GuardianLock: '0x111111111111111111111111111111111111110c', PanicGuard: '0x111111111111111111111111111111111111110d', EmergencyBreaker: '0x111111111111111111111111111111111111110e' },
  CONTRACTS: {},
  getContractAddresses: jest.fn(() => ({ VFIDEToken: '0x1111111111111111111111111111111111111101', StablecoinRegistry: '0x1111111111111111111111111111111111111102', MerchantPortal: '0x1111111111111111111111111111111111111103', MerchantRegistry: '0x1111111111111111111111111111111111111104', VaultHub: '0x1111111111111111111111111111111111111105', Seer: '0x1111111111111111111111111111111111111106', SeerView: '0x1111111111111111111111111111111111111107', DAO: '0x1111111111111111111111111111111111111108', DAOTimelock: '0x1111111111111111111111111111111111111109', TrustGateway: '0x111111111111111111111111111111111111110a', GuardianRegistry: '0x111111111111111111111111111111111111110b', GuardianLock: '0x111111111111111111111111111111111111110c', PanicGuard: '0x111111111111111111111111111111111111110d', EmergencyBreaker: '0x111111111111111111111111111111111111110e' })),
  isConfiguredContractAddress: (address?: string | null) =>,
  validateContractAddress: jest.fn((addr: any) => addr),
  ZERO_ADDRESS: '0x0000000000000000000000000000000000000000',
  CURRENT_CHAIN_ID: 84532,
}))

jest.mock('../../lib/abis', () => ({
  MerchantPortalABI: [],
  VaultHubABI: [],
  CardBoundVaultABI: [],
}))

jest.mock('@/lib/errorHandling', () => ({
  parseContractError: (err: unknown) => ({ userMessage: err instanceof Error ? err.message : 'Transaction failed' }),
  logError: jest.fn(),
}))

jest.mock('@/lib/testnet', () => ({
  CURRENT_CHAIN_ID: 84532,
}))

const {
  useAccount,
  useChainId,
  usePublicClient,
  useSignTypedData,
  useWriteContract,
  useWaitForTransactionReceipt,
} = require('wagmi')
const { useVaultPayMerchant } = require('../useMerchantHooks')

const CURRENT_CHAIN_ID = 84532
const CUSTOMER = '0x1234567890123456789012345678901234567890' as `0x${string}`
const MERCHANT = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd' as `0x${string}`
const TOKEN = '0x9999999999999999999999999999999999999999' as `0x${string}`
const CUSTOMER_VAULT = '0x3333333333333333333333333333333333333333' as `0x${string}`
const MERCHANT_VAULT = '0x4444444444444444444444444444444444444444' as `0x${string}`
const TX_HASH = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as `0x${string}`

describe('useVaultPayMerchant', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    ;(useAccount as jest.Mock).mockReturnValue({
      address: CUSTOMER,
      isConnected: true,
    })
    ;(useChainId as jest.Mock).mockReturnValue(CURRENT_CHAIN_ID)

    const readContract = jest
      .fn()
      .mockResolvedValueOnce(CUSTOMER_VAULT)
      .mockResolvedValueOnce([true, false, 'Shop', 'Retail', 0n, 0n, 0n, '0x0000000000000000000000000000000000000000'])
      .mockResolvedValueOnce(MERCHANT_VAULT)
      .mockResolvedValueOnce(9n)
      .mockResolvedValueOnce(2n)

    ;(usePublicClient as jest.Mock).mockReturnValue({
      readContract,
      waitForTransactionReceipt: jest.fn().mockResolvedValue({ status: 'success' }),
    })

    ;(useSignTypedData as jest.Mock).mockReturnValue({
      signTypedDataAsync: jest.fn().mockResolvedValue('0xsigned'),
    })

    ;(useWriteContract as jest.Mock).mockReturnValue({
      writeContractAsync: jest.fn().mockResolvedValue(TX_HASH),
      data: undefined,
      isPending: false,
    })

    ;(useWaitForTransactionReceipt as jest.Mock).mockReturnValue({
      isLoading: false,
      isSuccess: false,
    })
  })

  it('submits executePayMerchant on the vault', async () => {
    const { result } = renderHook(() => useVaultPayMerchant())

    let response: Awaited<ReturnType<typeof result.current.vaultPayMerchant>> | undefined
    await act(async () => {
      response = await result.current.vaultPayMerchant(MERCHANT, TOKEN, '1')
    })

    expect(response?.success).toBe(true)
    expect(result.current.error).toBeNull()

    const writeArgs = ((useWriteContract as jest.Mock).mock.results[0].value.writeContractAsync as jest.Mock).mock.calls[0][0]
    expect(writeArgs.address).toBe(CUSTOMER_VAULT)
    expect(writeArgs.functionName).toBe('executePayMerchant')
    expect(writeArgs.chainId).toBe(CURRENT_CHAIN_ID)
  })

  it('returns a friendly error when wallet is disconnected', async () => {
    ;(useAccount as jest.Mock).mockReturnValue({ address: undefined, isConnected: false })

    const { result } = renderHook(() => useVaultPayMerchant())

    let response: Awaited<ReturnType<typeof result.current.vaultPayMerchant>> | undefined
    await act(async () => {
      response = await result.current.vaultPayMerchant(MERCHANT, TOKEN, '1')
    })

    expect(response?.success).toBe(false)
    expect(response?.error).toContain('Wallet not connected')
  })
})

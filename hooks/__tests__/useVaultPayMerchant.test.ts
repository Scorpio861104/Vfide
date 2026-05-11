import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { renderHook, act } from '@testing-library/react'

jest.mock('wagmi', () => ({
  useAccount: jest.fn(),
  useChainId: jest.fn(),
  usePublicClient: jest.fn(),
  useSignTypedData: jest.fn(),
  useWriteContract: jest.fn(),
  useWaitForTransactionReceipt: jest.fn(),
  useReadContract: jest.fn(),
}))

jest.mock('../useContractAddresses', () => ({
  useContractAddresses: () => ({
    MerchantPortal: '0x1111111111111111111111111111111111111111',
    VaultHub: '0x2222222222222222222222222222222222222222',
  }),
}))

jest.mock('../../lib/contracts', () => ({
  ZERO_ADDRESS: '0x0000000000000000000000000000000000000000',
  isConfiguredContractAddress: (address?: string | null) =>
    typeof address === 'string' &&
    address.startsWith('0x') &&
    address.length === 42 &&
    address !== '0x0000000000000000000000000000000000000000',
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

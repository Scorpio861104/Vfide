/**
 * Headhunter hook safety tests
 * Ensures hooks fail closed when EcosystemVault contracts are not configured.
 */

import { describe, it, expect, beforeEach } from '@jest/globals'
import { renderHook, act } from '@testing-library/react'

const mockUseAccount = jest.fn()
const mockUseReadContract = jest.fn()
const mockUseWriteContract = jest.fn()

jest.mock('wagmi', () => ({ /* CANONICAL_WAGMI_MOCK */
  useAccount: () => mockUseAccount(),
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

jest.mock('../../lib/contracts', () => ({
  CONTRACT_ADDRESSES: {
    EcosystemVault: '0x0000000000000000000000000000000000000000',
    EcosystemVaultView: '0x0000000000000000000000000000000000000000',
  },
  ZERO_ADDRESS: '0x0000000000000000000000000000000000000000',
  isConfiguredContractAddress: (address: string) => address !== '0x0000000000000000000000000000000000000000',
  getContractConfigurationError: (name: string) => new Error(`[VFIDE] ${name} contract not configured.`),
  getContractAddresses: jest.fn(() => ({})),
  validateContractAddress: jest.fn((addr: any) => addr),
}))

jest.mock('../../lib/abis', () => ({
  EcosystemVaultABI: [],
  EcosystemVaultViewABI: [],
}))

jest.mock('viem', () => ({
  parseEther: (value: string) => BigInt(Math.floor(parseFloat(value) * 1e18)),
  formatEther: (value: bigint) => (Number(value) / 1e18).toString(),
  parseAbi: jest.fn(() => []),
  parseAbiItem: jest.fn((sig: any) => ({ name: typeof sig === 'string' ? sig.split(' ')[1]?.split('(')[0] : '', type: 'function' })),
  formatUnits: jest.fn((v: any) => String(v)),
  parseUnits: jest.fn((v: any) => BigInt(v || 0)),
  getAddress: jest.fn((a: string) => a),
  isAddress: jest.fn((a: any) => typeof a === 'string' && /^0x[0-9a-fA-F]{40}$/.test(a)),
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

import {
  useHeadhunterStats,
  usePayReferralWorkReward,
} from '../../hooks/useHeadhunterHooks'

describe('useHeadhunterHooks safety guards', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseAccount.mockReturnValue({ address: '0x1234567890123456789012345678901234567890' })
    mockUseReadContract.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
    })
    mockUseWriteContract.mockReturnValue({
      writeContract: jest.fn(),
      isPending: false,
      isSuccess: false,
      error: null,
    })
  })

  it('disables headhunter reads when the view contract is not configured', () => {
    const { result } = renderHook(() => useHeadhunterStats())

    expect(mockUseReadContract).toHaveBeenCalledWith(expect.objectContaining({
      query: expect.objectContaining({ enabled: false }),
    }))
    expect(result.current.error?.message).toContain('EcosystemVault')
  })

  it('throws a clear error instead of writing to the zero address', async () => {
    const writeContract = jest.fn()
    mockUseWriteContract.mockReturnValue({
      writeContract,
      isPending: false,
      isSuccess: false,
      error: null,
    })

    const { result } = renderHook(() => usePayReferralWorkReward())

    await expect(
      act(async () => {
        await result.current.payReferralWorkReward(
          '0x1234567890123456789012345678901234567890',
          '1',
          'test reward'
        )
      })
    ).rejects.toThrow('EcosystemVault')

    expect(writeContract).not.toHaveBeenCalled()
  })
})

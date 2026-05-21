import { describe, expect, it, beforeEach, jest } from '@jest/globals'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import React from 'react'

const mockWriteContractAsync = jest.fn()
const mockRefetchVfide = jest.fn(async () => ({ data: 0n }))
const mockRefetchStablecoin = jest.fn(async () => ({ data: 0n }))
const mockShowToast = jest.fn()

jest.mock('wagmi', () => ({ /* CANONICAL_WAGMI_MOCK_V2 */
  useAccount: jest.fn(() => ({ address: undefined, isConnected: false, status: 'disconnected' })),
  useChainId: jest.fn(() => 1),
  useSwitchChain: jest.fn(() => ({ switchChain: jest.fn(), switchChainAsync: jest.fn(), chains: [], status: 'idle' })),
  useReadContract: jest.fn(() => ({ data: undefined, isError: false, isLoading: false, isSuccess: false, error: null, refetch: jest.fn() })),
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
  createStorage: jest.fn(() => ({ getItem: jest.fn(() => null), setItem: jest.fn(), removeItem: jest.fn() })),
  cookieStorage: { getItem: jest.fn(() => null), setItem: jest.fn(), removeItem: jest.fn() },
  http: jest.fn(() => ({})),
  fallback: jest.fn(() => ({})),
  useGasPrice: jest.fn(() => ({ data: undefined, isLoading: false, isError: false, refetch: jest.fn() })),
  useEstimateFeesPerGas: jest.fn(() => ({ data: undefined, isLoading: false, isError: false, refetch: jest.fn() })),
  useReconnect: jest.fn(() => ({ reconnect: jest.fn(), reconnectAsync: jest.fn(), connectors: [], status: 'idle', isPending: false, isSuccess: false, isError: false })),
  useTransaction: jest.fn(() => ({ data: undefined, isLoading: false, isSuccess: false, isError: false })),
  useTransactionReceipt: jest.fn(() => ({ data: undefined, isLoading: false, isSuccess: false, isError: false })),
  serialize: jest.fn((v) => JSON.stringify(v)),
  deserialize: jest.fn((v) => { try { return JSON.parse(v); } catch { return v; } }),
  cookieToInitialState: jest.fn(() => undefined),
}))

jest.mock('@/components/ui/toast', () => ({
  useToast: () => ({
    showToast: mockShowToast,
  }),
}))

jest.mock('@/components/ui/GlassCard', () => ({
  GlassCard: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

jest.mock('@/lib/contracts', () => ({
  // CANONICAL_CONTRACTS_MOCK_V4
  CONTRACT_ADDRESSES: { VFIDEToken: '0x1111111111111111111111111111111111111101', StablecoinRegistry: '0x1111111111111111111111111111111111111102', MerchantPortal: '0x1111111111111111111111111111111111111103', MerchantRegistry: '0x1111111111111111111111111111111111111104', VaultHub: '0x1111111111111111111111111111111111111105', Seer: '0x1111111111111111111111111111111111111106', SeerView: '0x1111111111111111111111111111111111111107', DAO: '0x1111111111111111111111111111111111111108', DAOTimelock: '0x1111111111111111111111111111111111111109', TrustGateway: '0x111111111111111111111111111111111111110a', GuardianRegistry: '0x111111111111111111111111111111111111110b', GuardianLock: '0x111111111111111111111111111111111111110c', PanicGuard: '0x111111111111111111111111111111111111110d', EmergencyBreaker: '0x111111111111111111111111111111111111110e' },
  CONTRACTS: {},
  getContractAddresses: jest.fn(() => ({ VFIDEToken: '0x1111111111111111111111111111111111111101', StablecoinRegistry: '0x1111111111111111111111111111111111111102', MerchantPortal: '0x1111111111111111111111111111111111111103', MerchantRegistry: '0x1111111111111111111111111111111111111104', VaultHub: '0x1111111111111111111111111111111111111105', Seer: '0x1111111111111111111111111111111111111106', SeerView: '0x1111111111111111111111111111111111111107', DAO: '0x1111111111111111111111111111111111111108', DAOTimelock: '0x1111111111111111111111111111111111111109', TrustGateway: '0x111111111111111111111111111111111111110a', GuardianRegistry: '0x111111111111111111111111111111111111110b', GuardianLock: '0x111111111111111111111111111111111111110c', PanicGuard: '0x111111111111111111111111111111111111110d', EmergencyBreaker: '0x111111111111111111111111111111111111110e' })),
  isConfiguredContractAddress: jest.fn(() => true),
  validateContractAddress: jest.fn((addr) => addr),
  ZERO_ADDRESS: '0x0000000000000000000000000000000000000000',
  CURRENT_CHAIN_ID: 84532,
}))

const loadMerchantApprovalPanel = () =>
  require('@/app/vault/components/MerchantApprovalPanel').MerchantApprovalPanel as React.ComponentType<{
    cardBoundMode: boolean;
    vaultAddress: `0x${string}` | null | undefined;
  }>

describe('MerchantApprovalPanel', () => {
  beforeEach(() => {
    mockWriteContractAsync.mockReset()
    mockRefetchVfide.mockClear()
    mockRefetchStablecoin.mockClear()
    mockShowToast.mockClear()
    mockWriteContractAsync.mockResolvedValue('0xabc123')
  })

  it('uses dailyTransferLimit amount for VFIDE approval', async () => {
    const MerchantApprovalPanel = loadMerchantApprovalPanel()
    render(
      <MerchantApprovalPanel
        cardBoundMode
        vaultAddress={'0x3000000000000000000000000000000000000003'}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /Approve VFIDE/i }))

    await waitFor(() => {
      expect(mockWriteContractAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          functionName: 'approveVFIDE',
          args: ['0x2000000000000000000000000000000000000002', 123n],
        })
      )
    })
  })

  it('uses dailyTransferLimit amount for stablecoin approval', async () => {
    const MerchantApprovalPanel = loadMerchantApprovalPanel()
    render(
      <MerchantApprovalPanel
        cardBoundMode
        vaultAddress={'0x3000000000000000000000000000000000000003'}
      />
    )

    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: '0x4000000000000000000000000000000000000004' },
    })

    fireEvent.click(screen.getByRole('button', { name: /Approve Stablecoin/i }))

    await waitFor(() => {
      expect(mockWriteContractAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          functionName: 'approveERC20',
          args: [
            '0x4000000000000000000000000000000000000004',
            '0x2000000000000000000000000000000000000002',
            123n,
          ],
        })
      )
    })
  })

  it('blocks approvals when dailyTransferLimit is zero', async () => {
    const { useReadContract } = await import('wagmi')
    const mockUseReadContract = useReadContract as unknown as jest.Mock

    mockUseReadContract.mockImplementation((params?: { functionName?: string; address?: string }) => {
      if (params?.functionName === 'dailyTransferLimit') {
        return { data: 0n }
      }
      if (params?.functionName === 'allowance' && params?.address === '0x1000000000000000000000000000000000000001') {
        return { data: 0n, refetch: mockRefetchVfide }
      }
      if (params?.functionName === 'allowance') {
        return { data: 0n, refetch: mockRefetchStablecoin }
      }
      return { data: undefined }
    })

    const MerchantApprovalPanel = loadMerchantApprovalPanel()
    render(
      <MerchantApprovalPanel
        cardBoundMode
        vaultAddress={'0x3000000000000000000000000000000000000003'}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /Approve VFIDE/i }))

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith(
        'Vault daily transfer limit not loaded. Please wait and retry.',
        'error'
      )
    })

    expect(mockWriteContractAsync).not.toHaveBeenCalled()
  })
})

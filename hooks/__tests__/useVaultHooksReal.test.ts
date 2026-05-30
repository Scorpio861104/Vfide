import { renderHook, waitFor } from '@testing-library/react'
import { ZERO_ADDRESS } from '@/lib/constants'
import {
  useUserVault,
  useVaultBalance,
  useGuardianCancelInheritance,
  useInheritanceStatus,
} from '../useVaultHooks'

const mockUseAccount = jest.fn()
const mockUseReadContract = jest.fn()
const mockWriteContractAsync = jest.fn()
const mockUseWaitForReceipt = jest.fn()
const mockSetVault = jest.fn()
const mockIsCardBoundVaultMode = jest.fn()

jest.mock('wagmi', () => ({
  useAccount: () => mockUseAccount(),
  useReadContract: (args: unknown) => mockUseReadContract(args),
  useWriteContract: () => ({ writeContractAsync: mockWriteContractAsync }),
  useWaitForTransactionReceipt: () => mockUseWaitForReceipt(),
  useChainId: () => 84532,
}))

jest.mock('@/hooks/useContractAddresses', () => ({
  useContractAddresses: () => ({
    VaultHub: '0x1000000000000000000000000000000000000001',
    VFIDEToken: '0x1000000000000000000000000000000000000002',
  }),
}))

jest.mock('@/lib/contracts', () => ({
  ACTIVE_VAULT_IMPLEMENTATION: 'cardbound',
  isConfiguredContractAddress: () => true,
  isCardBoundVaultMode: () => mockIsCardBoundVaultMode(),
}))

jest.mock('@/lib/abis', () => ({
  VaultHubABI: [],
  VFIDETokenABI: [],
  CardBoundVaultABI: [],
}))

jest.mock('@/lib/store/appStore', () => ({
  useAppStore: (selector: (state: { setVault: typeof mockSetVault }) => unknown) =>
    selector({ setVault: mockSetVault }),
}))

jest.mock('viem', () => ({
  formatEther: (value: bigint) => String(Number(value) / 1e18),
}))

describe('useVaultHooksReal compatibility', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseAccount.mockReturnValue({
      address: '0x1234567890123456789012345678901234567890',
    })
    mockUseWaitForReceipt.mockReturnValue({ isSuccess: false, isLoading: false })
    mockIsCardBoundVaultMode.mockReturnValue(true)
  })

  it('useUserVault exposes implementation metadata', () => {
    mockUseReadContract.mockImplementation(({ functionName }: { functionName: string }) => {
      if (functionName === 'vaultOf') {
        return { data: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd', isLoading: false }
      }
      return { data: undefined, isLoading: false }
    })

    const { result } = renderHook(() => useUserVault())

    expect(result.current.hasVault).toBe(true)
    expect(result.current.implementation).toBe('cardbound')
    expect(result.current.isCardBound).toBe(true)
  })

  it('useVaultBalance returns loading and refetch handles', () => {
    const refetch = jest.fn()
    mockUseReadContract.mockImplementation(({ functionName }: { functionName: string }) => {
      if (functionName === 'vaultOf') {
        return { data: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd', isLoading: false }
      }
      if (functionName === 'balanceOf') {
        return { data: 1000000000000000000n, isLoading: true, refetch }
      }
      return { data: undefined, isLoading: false }
    })

    const { result } = renderHook(() => useVaultBalance())

    expect(result.current.isLoading).toBe(true)
    expect(result.current.balance).toBe('1')
    expect(result.current.refetch).toBe(refetch)
  })

  it('useVaultBalance writes to app store when vault exists', async () => {
    mockUseReadContract.mockImplementation(({ functionName }: { functionName: string }) => {
      if (functionName === 'vaultOf') {
        return { data: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd', isLoading: false }
      }
      if (functionName === 'balanceOf') {
        return { data: 500000000000000000n, isLoading: false, refetch: jest.fn() }
      }
      return { data: undefined, isLoading: false }
    })

    renderHook(() => useVaultBalance())

    await waitFor(() => {
      expect(mockSetVault).toHaveBeenCalledWith(
        expect.objectContaining({
          address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
          balance: '0.5',
        })
      )
    })
  })

  it('useGuardianCancelInheritance reflects receipt flags', () => {
    mockUseWaitForReceipt.mockReturnValue({ isSuccess: true, isLoading: true })

    const { result } = renderHook(() =>
      useGuardianCancelInheritance('0xabcdefabcdefabcdefabcdefabcdefabcdefabcd')
    )

    expect(result.current.isSuccess).toBe(true)
    expect(result.current.isLoading).toBe(true)
  })

  it('useGuardianCancelInheritance handles non-Error throws', async () => {
    mockWriteContractAsync.mockRejectedValue('oops')

    const { result } = renderHook(() =>
      useGuardianCancelInheritance('0xabcdefabcdefabcdefabcdefabcdefabcdefabcd')
    )

    const response = await result.current.cancelInheritance()

    expect(response.success).toBe(false)
    expect(response.error).toBe('Transaction failed')
  })

  it('useInheritanceStatus falls back to ZERO_ADDRESS in cardbound mode', () => {
    mockIsCardBoundVaultMode.mockReturnValue(true)
    mockUseReadContract.mockReturnValue({ data: '0x1111111111111111111111111111111111111111' })

    const { result } = renderHook(() =>
      useInheritanceStatus('0xabcdefabcdefabcdefabcdefabcdefabcdefabcd')
    )

    expect(result.current.nextOfKin).toBe(ZERO_ADDRESS)
    expect(result.current.hasNextOfKin).toBe(false)
  })

  it('useInheritanceStatus reports hasNextOfKin in legacy mode', () => {
    mockIsCardBoundVaultMode.mockReturnValue(false)
    mockUseReadContract.mockReturnValue({ data: '0x1111111111111111111111111111111111111111' })

    const { result } = renderHook(() =>
      useInheritanceStatus('0xabcdefabcdefabcdefabcdefabcdefabcdefabcd')
    )

    expect(result.current.nextOfKin).toBe('0x1111111111111111111111111111111111111111')
    expect(result.current.hasNextOfKin).toBe(true)
  })
})

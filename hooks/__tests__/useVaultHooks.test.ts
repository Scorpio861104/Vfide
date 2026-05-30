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

describe('useVaultHooks (current surface)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseAccount.mockReturnValue({
      address: '0x1234567890123456789012345678901234567890',
    })
    mockUseWaitForReceipt.mockReturnValue({ isSuccess: false, isLoading: false })
    mockIsCardBoundVaultMode.mockReturnValue(true)
  })

  describe('useUserVault', () => {
    it('returns vault when present', () => {
      mockUseReadContract.mockImplementation(({ functionName }: { functionName: string }) => {
        if (functionName === 'vaultOf') {
          return {
            data: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
            isLoading: false,
          }
        }
        return { data: undefined, isLoading: false }
      })

      const { result } = renderHook(() => useUserVault())

      expect(result.current.hasVault).toBe(true)
      expect(result.current.vaultAddress).toBe('0xabcdefabcdefabcdefabcdefabcdefabcdefabcd')
      expect(result.current.isCardBound).toBe(true)
    })

    it('returns null vault for zero address', () => {
      mockUseReadContract.mockImplementation(({ functionName }: { functionName: string }) => {
        if (functionName === 'vaultOf') {
          return { data: ZERO_ADDRESS, isLoading: false }
        }
        return { data: undefined, isLoading: false }
      })

      const { result } = renderHook(() => useUserVault())

      expect(result.current.hasVault).toBe(false)
      expect(result.current.vaultAddress).toBeNull()
    })
  })

  describe('useVaultBalance', () => {
    it('formats token balance and syncs store', async () => {
      mockUseReadContract.mockImplementation(({ functionName }: { functionName: string }) => {
        if (functionName === 'vaultOf') {
          return { data: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd', isLoading: false }
        }
        if (functionName === 'balanceOf') {
          return {
            data: 2000000000000000000n,
            isLoading: false,
            refetch: jest.fn(),
          }
        }
        return { data: undefined, isLoading: false }
      })

      const { result } = renderHook(() => useVaultBalance())

      expect(result.current.balance).toBe('2')
      expect(result.current.balanceRaw).toBe(2000000000000000000n)

      await waitFor(() => {
        expect(mockSetVault).toHaveBeenCalled()
      })
    })
  })

  describe('useGuardianCancelInheritance', () => {
    it('submits cancel transaction', async () => {
      mockWriteContractAsync.mockResolvedValue('0x' + 'a'.repeat(64))

      const { result } = renderHook(() =>
        useGuardianCancelInheritance('0xabcdefabcdefabcdefabcdefabcdefabcdefabcd')
      )

      const response = await result.current.cancelInheritance()

      expect(response.success).toBe(true)
      expect(mockWriteContractAsync).toHaveBeenCalledWith(
        expect.objectContaining({ functionName: 'vetoInheritanceClaim' })
      )
    })

    it('returns error object when write fails', async () => {
      mockWriteContractAsync.mockRejectedValue(new Error('boom'))

      const { result } = renderHook(() =>
        useGuardianCancelInheritance('0xabcdefabcdefabcdefabcdefabcdefabcdefabcd')
      )

      const response = await result.current.cancelInheritance()

      expect(response.success).toBe(false)
      expect(response.error).toContain('boom')
    })
  })

  describe('useInheritanceStatus', () => {
    it('returns zeroed status in cardbound mode', () => {
      mockIsCardBoundVaultMode.mockReturnValue(true)
      mockUseReadContract.mockReturnValue({ data: undefined })

      const { result } = renderHook(() =>
        useInheritanceStatus('0xabcdefabcdefabcdefabcdefabcdefabcdefabcd')
      )

      expect(result.current.nextOfKin).toBe(ZERO_ADDRESS)
      expect(result.current.hasNextOfKin).toBe(false)
    })

    it('returns admin address as nextOfKin outside cardbound mode', () => {
      mockIsCardBoundVaultMode.mockReturnValue(false)
      mockUseReadContract.mockReturnValue({
        data: '0x1111111111111111111111111111111111111111',
      })

      const { result } = renderHook(() =>
        useInheritanceStatus('0xabcdefabcdefabcdefabcdefabcdefabcdefabcd')
      )

      expect(result.current.nextOfKin).toBe('0x1111111111111111111111111111111111111111')
      expect(result.current.hasNextOfKin).toBe(true)
    })
  })
})

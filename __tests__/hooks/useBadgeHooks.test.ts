import { describe, it, expect, vi, beforeEach } from '@jest/globals'

// Mock wagmi hooks
jest.mock('wagmi', () => ({ /* CANONICAL_WAGMI_MOCK_V2 */
  useAccount: jest.fn(() => ({ address: undefined, isConnected: false, status: 'disconnected', chainId: undefined })),
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

// Mock contracts
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

jest.mock('@/lib/contracts/future-contracts', () => ({
  // CANONICAL_FUTURE_CONTRACTS_MOCK_V4
  getFutureContractAddress: jest.fn(() => '0x2222222222222222222222222222222222222201'),
  getFutureContractAddresses: jest.fn(() => ({ CardBoundVault: '0x2222222222222222222222222222222222222202', BadgeNFT: '0x2222222222222222222222222222222222222203', BadgeManager: '0x2222222222222222222222222222222222222204' })),
  isConfiguredFutureContract: jest.fn(() => true),
  isFutureFeaturesEnabled: jest.fn(() => true),
  isFutureContractDeployed: jest.fn(() => true),
  FUTURE_CONTRACT_ADDRESSES: { CardBoundVault: '0x2222222222222222222222222222222222222202', BadgeNFT: '0x2222222222222222222222222222222222222203', BadgeManager: '0x2222222222222222222222222222222222222204' },
}))

// Mock ABIs
jest.mock('@/lib/abis/future', () => ({
  VFIDEBadgeNFTABI: [],
}))

import { useReadContract, useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { useUserBadges, useBadgeNFTs, useMintBadge, useCanMintBadge } from '@/hooks/useBadgeHooks'

describe('useBadgeHooks', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    const futureContracts = jest.requireMock('@/lib/contracts/future-contracts') as {
      getFutureContractAddresses: jest.Mock
      isFutureFeaturesEnabled: jest.Mock
    }

    futureContracts.getFutureContractAddresses.mockReturnValue({
      BadgeNFT: '0x1234567890123456789012345678901234567891',
    })
    futureContracts.isFutureFeaturesEnabled.mockReturnValue(true)
    // Reset all mocks to default values
    jest.mocked(useReadContract).mockReturnValue({
      data: null,
      isLoading: false,
      refetch: jest.fn(),
    } as unknown as ReturnType<typeof useReadContract>)
    jest.mocked(useWriteContract).mockReturnValue({
      writeContract: jest.fn(),
      data: null,
      isPending: false,
    } as unknown as ReturnType<typeof useWriteContract>)
    jest.mocked(useWaitForTransactionReceipt).mockReturnValue({
      isLoading: false,
      isSuccess: false,
    } as ReturnType<typeof useWaitForTransactionReceipt>)
  })

  describe('useUserBadges', () => {
    it('returns empty array (deprecated hook)', () => {
      const { badgeIds, isLoading, isAvailable } = useUserBadges()
      // This hook is deprecated and always returns empty array
      expect(badgeIds).toEqual([])
      expect(isLoading).toBe(false)
      expect(isAvailable).toBe(false)
    })

    it('always returns empty array regardless of address (deprecated)', () => {
      const { badgeIds, isAvailable } = useUserBadges('0xABCD1234567890123456789012345678901234AB' as `0x${string}`)
      // Deprecated hook - use useBadgeNFTs instead
      expect(badgeIds).toEqual([])
      expect(isAvailable).toBe(false)
    })

    it('indicates unavailability for migration purposes', () => {
      const result = useUserBadges()
      expect(result.isAvailable).toBe(false)
    })
  })

  describe('useBadgeNFTs', () => {
    it('returns empty array when no NFTs', () => {
      const { tokenIds, count } = useBadgeNFTs()
      expect(tokenIds).toEqual([])
      expect(count).toBe(0)
    })

    it('returns token IDs and count when user has NFTs', () => {
      jest.mocked(useReadContract).mockReturnValue({
        data: [1n, 2n, 3n] as unknown as undefined,
        isLoading: false,
        refetch: jest.fn(),
      } as ReturnType<typeof useReadContract>)

      const { tokenIds, count } = useBadgeNFTs()
      expect(tokenIds).toEqual([1n, 2n, 3n])
      expect(count).toBe(3)
    })

    it('reports availability when BadgeNFT is configured', () => {
      const { isAvailable } = useBadgeNFTs()
      expect(isAvailable).toBe(true)
    })
  })

  describe('useMintBadge', () => {
    it('provides mintBadge function', () => {
      const mockWriteContract = jest.fn()
      jest.mocked(useWriteContract).mockReturnValue({
        writeContract: mockWriteContract,
        data: null,
        isPending: false,
      } as unknown as ReturnType<typeof useWriteContract>)

      const { mintBadge } = useMintBadge()
      expect(typeof mintBadge).toBe('function')
    })

    it('calls writeContract when minting', () => {
      const mockWriteContract = jest.fn()
      jest.mocked(useWriteContract).mockReturnValue({
        writeContract: mockWriteContract,
        data: null,
        isPending: false,
      } as unknown as ReturnType<typeof useWriteContract>)

      const { mintBadge } = useMintBadge()
      mintBadge('0xbadge123456789012345678901234567890123456789012345678901234567890' as `0x${string}`)
      
      expect(mockWriteContract).toHaveBeenCalledWith(
        expect.objectContaining({
          functionName: 'mintBadge',
        })
      )
    })

    it('does not write when BadgeNFT is not configured', () => {
      const futureContracts = jest.requireMock('@/lib/contracts/future-contracts') as {
        getFutureContractAddresses: jest.Mock
      }
      futureContracts.getFutureContractAddresses.mockReturnValue({
        BadgeNFT: '0x0000000000000000000000000000000000000000',
      })

      const mockWriteContract = jest.fn()
      jest.mocked(useWriteContract).mockReturnValue({
        writeContract: mockWriteContract,
        data: null,
        isPending: false,
      } as unknown as ReturnType<typeof useWriteContract>)

      const { mintBadge, isAvailable } = useMintBadge()
      mintBadge('0xbadge123456789012345678901234567890123456789012345678901234567890' as `0x${string}`)

      expect(isAvailable).toBe(false)
      expect(mockWriteContract).not.toHaveBeenCalled()
    })

    it('tracks minting state', () => {
      jest.mocked(useWriteContract).mockReturnValue({
        writeContract: jest.fn(),
        data: null,
        isPending: true,
      } as unknown as ReturnType<typeof useWriteContract>)

      const { isMinting } = useMintBadge()
      expect(isMinting).toBe(true)
    })

    it('tracks confirmation state', () => {
      jest.mocked(useWaitForTransactionReceipt).mockReturnValue({
        isLoading: true,
        isSuccess: false,
      } as ReturnType<typeof useWaitForTransactionReceipt>)

      const { isMinting } = useMintBadge()
      expect(isMinting).toBe(true)
    })

    it('tracks success state', () => {
      jest.mocked(useWaitForTransactionReceipt).mockReturnValue({
        isLoading: false,
        isSuccess: true,
      } as ReturnType<typeof useWaitForTransactionReceipt>)

      const { isSuccess } = useMintBadge()
      expect(isSuccess).toBe(true)
    })
  })

  describe('useCanMintBadge', () => {
    it('returns canMint false when no data', () => {
      const { canMint, reason } = useCanMintBadge('0xbadge123456789012345678901234567890123456789012345678901234567890' as `0x${string}`)
      expect(canMint).toBe(false)
      expect(reason).toBe('')
    })

    it('returns canMint true when user can mint', () => {
      jest.mocked(useReadContract).mockReturnValue({
        data: [true, 'Ready to mint'] as unknown as undefined,
        isLoading: false,
      } as ReturnType<typeof useReadContract>)

      const { canMint, reason } = useCanMintBadge('0xbadge123456789012345678901234567890123456789012345678901234567890' as `0x${string}`)
      expect(canMint).toBe(true)
      expect(reason).toBe('Ready to mint')
    })

    it('returns reason when cannot mint', () => {
      jest.mocked(useReadContract).mockReturnValue({
        data: [false, 'Badge already owned'] as unknown as undefined,
        isLoading: false,
      } as ReturnType<typeof useReadContract>)

      const { canMint, reason } = useCanMintBadge('0xbadge123456789012345678901234567890123456789012345678901234567890' as `0x${string}`)
      expect(canMint).toBe(false)
      expect(reason).toBe('Badge already owned')
    })

    it('handles loading state', () => {
      jest.mocked(useReadContract).mockReturnValue({
        data: null,
        isLoading: true,
      } as unknown as ReturnType<typeof useReadContract>)

      const { isLoading } = useCanMintBadge('0xbadge123456789012345678901234567890123456789012345678901234567890' as `0x${string}`)
      expect(isLoading).toBe(true)
    })

    it('reports unavailable when BadgeNFT is not configured', () => {
      const futureContracts = jest.requireMock('@/lib/contracts/future-contracts') as {
        getFutureContractAddresses: jest.Mock
      }
      futureContracts.getFutureContractAddresses.mockReturnValue({
        BadgeNFT: '0x0000000000000000000000000000000000000000',
      })

      const { isAvailable } = useCanMintBadge('0xbadge123456789012345678901234567890123456789012345678901234567890' as `0x${string}`)
      expect(isAvailable).toBe(false)
    })
  })
})

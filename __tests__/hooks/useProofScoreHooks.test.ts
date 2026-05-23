import { describe, it, expect,  beforeEach } from '@jest/globals'

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

// Mock React hooks
jest.mock('react', async () => {
  const actual = await jest.requireActual('react')
  return {
    ...(actual as object),
    useState: jest.fn((init) => [init, jest.fn()]),
  }
})

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

// Mock ABIs
jest.mock('@/lib/abis', () => ({
  SeerABI: [],
  SeerSocialABI: [],
}))

jest.mock('@/lib/errorHandling', () => ({
  parseContractError: jest.fn(() => ({ userMessage: 'mocked error' })),
  logError: jest.fn(),
}))

import { useReadContract } from 'wagmi'
import { useProofScore, useScoreBreakdown } from '@/hooks/useProofScoreHooks'

describe('useProofScoreHooks', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Reset useReadContract to default
    jest.mocked(useReadContract).mockReturnValue({
      data: null,
      isLoading: false,
      refetch: jest.fn(),
    } as unknown as ReturnType<typeof useReadContract>)
  })

  describe('useProofScore', () => {
    it('returns default neutral score when no data', () => {
      const { score, tier } = useProofScore()
      expect(score).toBe(5000)
      expect(tier).toBe('Neutral')
    })

    it('returns Elite tier for score >= 8000', () => {
      jest.mocked(useReadContract).mockReturnValue({
        data: 8500n as unknown as undefined,
        isLoading: false,
        refetch: jest.fn(),
      } as ReturnType<typeof useReadContract>)

      const { score, tier, isElite, canEndorse } = useProofScore()
      expect(score).toBe(8500)
      expect(tier).toBe('Elite')
      expect(isElite).toBe(true)
      expect(canEndorse).toBe(true)
    })

    it('returns Council tier for score 7000-7999', () => {
      jest.mocked(useReadContract).mockReturnValue({
        data: 7500n as unknown as undefined,
        isLoading: false,
        refetch: jest.fn(),
      } as ReturnType<typeof useReadContract>)

      const { tier, canCouncil, canEndorse } = useProofScore()
      expect(tier).toBe('Council')
      expect(canCouncil).toBe(true)
      expect(canEndorse).toBe(true)
    })

    it('returns Low Trust tier for score 3500-4999', () => {
      jest.mocked(useReadContract).mockReturnValue({
        data: 4000n as unknown as undefined,
        isLoading: false,
        refetch: jest.fn(),
      } as ReturnType<typeof useReadContract>)

      const { tier, canVote, canMerchant } = useProofScore()
      expect(tier).toBe('Low Trust')
      expect(canVote).toBe(false)
      expect(canMerchant).toBe(false)
    })

    it('returns Risky tier for score < 3500', () => {
      jest.mocked(useReadContract).mockReturnValue({
        data: 2000n as unknown as undefined,
        isLoading: false,
        refetch: jest.fn(),
      } as ReturnType<typeof useReadContract>)

      const { tier } = useProofScore()
      expect(tier).toBe('Risky')
    })

    it('calculates correct burn fees for Elite', () => {
      jest.mocked(useReadContract).mockReturnValue({
        data: 8000n as unknown as undefined,
        isLoading: false,
        refetch: jest.fn(),
      } as ReturnType<typeof useReadContract>)

      const { burnFee } = useProofScore()
      expect(burnFee).toBe(0.25)
    })

    it('calculates correct burn fees for Risky', () => {
      jest.mocked(useReadContract).mockReturnValue({
        data: 3000n as unknown as undefined,
        isLoading: false,
        refetch: jest.fn(),
      } as ReturnType<typeof useReadContract>)

      const { burnFee } = useProofScore()
      expect(burnFee).toBe(5.0)
    })

    it('returns correct colors for each tier', () => {
      jest.mocked(useReadContract).mockReturnValue({
        data: 8000n as unknown as undefined,
        isLoading: false,
        refetch: jest.fn(),
      } as ReturnType<typeof useReadContract>)
      expect(useProofScore().color).toBe('#00FF88') // Elite green

      jest.mocked(useReadContract).mockReturnValue({
        data: 7000n as unknown as undefined,
        isLoading: false,
        refetch: jest.fn(),
      } as ReturnType<typeof useReadContract>)
      expect(useProofScore().color).toBe('#A78BFA') // Council purple

      jest.mocked(useReadContract).mockReturnValue({
        data: 5000n as unknown as undefined,
        isLoading: false,
        refetch: jest.fn(),
      } as ReturnType<typeof useReadContract>)
      expect(useProofScore().color).toBe('#FFD700') // Neutral gold
    })

    it('determines canVote correctly', () => {
      jest.mocked(useReadContract).mockReturnValue({
        data: 5400n as unknown as undefined,
        isLoading: false,
        refetch: jest.fn(),
      } as ReturnType<typeof useReadContract>)
      expect(useProofScore().canVote).toBe(true)

      jest.mocked(useReadContract).mockReturnValue({
        data: 5399n as unknown as undefined,
        isLoading: false,
        refetch: jest.fn(),
      } as ReturnType<typeof useReadContract>)
      expect(useProofScore().canVote).toBe(false)
    })

    it('determines canMerchant correctly', () => {
      jest.mocked(useReadContract).mockReturnValue({
        data: 5600n as unknown as undefined,
        isLoading: false,
        refetch: jest.fn(),
      } as ReturnType<typeof useReadContract>)
      expect(useProofScore().canMerchant).toBe(true)

      jest.mocked(useReadContract).mockReturnValue({
        data: 5599n as unknown as undefined,
        isLoading: false,
        refetch: jest.fn(),
      } as ReturnType<typeof useReadContract>)
      expect(useProofScore().canMerchant).toBe(false)
    })
  })

  describe('useScoreBreakdown', () => {
    it('calculates breakdown components based on score', () => {
      jest.mocked(useReadContract).mockReturnValue({
        data: 10000n as unknown as undefined,
        isLoading: false,
        refetch: jest.fn(),
      } as ReturnType<typeof useReadContract>)

      const { breakdown } = useScoreBreakdown()
      expect(breakdown.totalScore).toBe(10000)
      // Component-level breakdown is not yet available from on-chain reads
      expect(breakdown.baseScore).toBe(0)
      expect(breakdown.activityBonus).toBe(0)
      expect(breakdown.ageBonus).toBe(0)
      expect(breakdown.activityPoints).toBe(0)
      expect(breakdown.endorsementPoints).toBe(0)
      expect(breakdown.vaultBonus).toBe(0)
      expect(breakdown.badgePoints).toBe(0)
      expect(breakdown.hasDiversityBonus).toBe(false)
    })

    it('hasDiversityBonus is false below 7000', () => {
      jest.mocked(useReadContract).mockReturnValue({
        data: 6000n as unknown as undefined,
        isLoading: false,
        refetch: jest.fn(),
      } as ReturnType<typeof useReadContract>)

      const { breakdown } = useScoreBreakdown()
      expect(breakdown.hasDiversityBonus).toBe(false)
    })

    it('handles loading state', () => {
      jest.mocked(useReadContract).mockReturnValue({
        data: null,
        isLoading: true,
        refetch: jest.fn(),
      } as unknown as ReturnType<typeof useReadContract>)

      const { isLoading } = useScoreBreakdown()
      expect(isLoading).toBe(true)
    })
  })
})

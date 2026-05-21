/* eslint-disable @typescript-eslint/no-explicit-any */
import { renderHook } from '@testing-library/react'
import { useMerchantStatus } from '../useMerchantStatus'
import { useReadContract } from 'wagmi'

jest.mock('wagmi')
jest.mock('@/lib/contracts', () => ({
  // CANONICAL_CONTRACTS_MOCK_V4
  CONTRACT_ADDRESSES: { VFIDEToken: '0x1111111111111111111111111111111111111101', StablecoinRegistry: '0x1111111111111111111111111111111111111102', MerchantPortal: '0x1111111111111111111111111111111111111103', MerchantRegistry: '0x1111111111111111111111111111111111111104', VaultHub: '0x1111111111111111111111111111111111111105', Seer: '0x1111111111111111111111111111111111111106', SeerView: '0x1111111111111111111111111111111111111107', DAO: '0x1111111111111111111111111111111111111108', DAOTimelock: '0x1111111111111111111111111111111111111109', TrustGateway: '0x111111111111111111111111111111111111110a', GuardianRegistry: '0x111111111111111111111111111111111111110b', GuardianLock: '0x111111111111111111111111111111111111110c', PanicGuard: '0x111111111111111111111111111111111111110d', EmergencyBreaker: '0x111111111111111111111111111111111111110e' },
  CONTRACTS: {},
  getContractAddresses: jest.fn(() => ({ VFIDEToken: '0x1111111111111111111111111111111111111101', StablecoinRegistry: '0x1111111111111111111111111111111111111102', MerchantPortal: '0x1111111111111111111111111111111111111103', MerchantRegistry: '0x1111111111111111111111111111111111111104', VaultHub: '0x1111111111111111111111111111111111111105', Seer: '0x1111111111111111111111111111111111111106', SeerView: '0x1111111111111111111111111111111111111107', DAO: '0x1111111111111111111111111111111111111108', DAOTimelock: '0x1111111111111111111111111111111111111109', TrustGateway: '0x111111111111111111111111111111111111110a', GuardianRegistry: '0x111111111111111111111111111111111111110b', GuardianLock: '0x111111111111111111111111111111111111110c', PanicGuard: '0x111111111111111111111111111111111111110d', EmergencyBreaker: '0x111111111111111111111111111111111111110e' })),
  isConfiguredContractAddress: (address?: string | null) =>,
  validateContractAddress: jest.fn((addr: any) => addr),
  ZERO_ADDRESS: '0x0000000000000000000000000000000000000000',
  CURRENT_CHAIN_ID: 84532,
  MerchantPortalABI: [],
}))

const mockUseReadContract = useReadContract as jest.MockedFunction<typeof useReadContract>

describe('useMerchantStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns merchant status true', () => {
    mockUseReadContract.mockReturnValueOnce({
      data: [true, false, 'Test Business', 'retail', 1000000n, 5000000n, 100n],
      isError: false,
      isLoading: false,
    } as any)

    const { result } = renderHook(() => 
      useMerchantStatus('0x1234567890123456789012345678901234567890')
    )

    expect(result.current.isMerchant).toBe(true)
    expect(result.current.isError).toBe(false)
    expect(result.current.isLoading).toBe(false)
  })

  it('returns merchant status false', () => {
    mockUseReadContract.mockReturnValue({
      data: false,
      isError: false,
      isLoading: false,
    } as any)

    const { result } = renderHook(() => 
      useMerchantStatus('0x1234567890123456789012345678901234567890')
    )

    expect(result.current.isMerchant).toBe(false)
  })

  it('handles loading state', () => {
    mockUseReadContract.mockReturnValue({
      data: undefined,
      isError: false,
      isLoading: true,
    } as any)

    const { result } = renderHook(() => 
      useMerchantStatus('0x1234567890123456789012345678901234567890')
    )

    expect(result.current.isLoading).toBe(true)
    expect(result.current.isMerchant).toBe(false)
  })

  it('handles error state', () => {
    mockUseReadContract.mockReturnValue({
      data: undefined,
      isError: true,
      isLoading: false,
    } as any)

    const { result } = renderHook(() => 
      useMerchantStatus('0x1234567890123456789012345678901234567890')
    )

    expect(result.current.isError).toBe(true)
    expect(result.current.isMerchant).toBe(false)
  })

  it('handles undefined address', () => {
    mockUseReadContract.mockReturnValue({
      data: undefined,
      isError: false,
      isLoading: false,
    } as any)

    const { result } = renderHook(() => useMerchantStatus(undefined))
    
    expect(result.current.isMerchant).toBe(false)
  })

  it('defaults to false when no data', () => {
    mockUseReadContract.mockReturnValue({
      data: undefined,
      isError: false,
      isLoading: false,
    } as any)

    const { result } = renderHook(() => 
      useMerchantStatus('0x1234567890123456789012345678901234567890')
    )

    expect(result.current.isMerchant).toBe(false)
  })
})

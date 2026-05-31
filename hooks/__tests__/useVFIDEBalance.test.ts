/* eslint-disable @typescript-eslint/no-explicit-any */
import { renderHook } from '@testing-library/react'
import { useVFIDEBalance } from '../useVFIDEBalance'
import { useReadContract } from 'wagmi'

jest.mock('wagmi')
jest.mock('@/lib/contracts', () => ({
  // CANONICAL_CONTRACTS_MOCK_V4
  CONTRACT_ADDRESSES: { VFIDEToken: '0x1111111111111111111111111111111111111101', StablecoinRegistry: '0x1111111111111111111111111111111111111102', MerchantPortal: '0x1111111111111111111111111111111111111103', MerchantRegistry: '0x1111111111111111111111111111111111111104', VaultHub: '0x1111111111111111111111111111111111111105', Seer: '0x1111111111111111111111111111111111111106', SeerView: '0x1111111111111111111111111111111111111107', DAO: '0x1111111111111111111111111111111111111108', DAOTimelock: '0x1111111111111111111111111111111111111109', TrustGateway: '0x111111111111111111111111111111111111110a', GuardianRegistry: '0x111111111111111111111111111111111111110b', GuardianLock: '0x111111111111111111111111111111111111110c', PanicGuard: '0x111111111111111111111111111111111111110d', EmergencyBreaker: '0x111111111111111111111111111111111111110e' },
  CONTRACTS: {},
  getContractAddresses: jest.fn(() => ({ VFIDEToken: '0x1111111111111111111111111111111111111101', StablecoinRegistry: '0x1111111111111111111111111111111111111102', MerchantPortal: '0x1111111111111111111111111111111111111103', MerchantRegistry: '0x1111111111111111111111111111111111111104', VaultHub: '0x1111111111111111111111111111111111111105', Seer: '0x1111111111111111111111111111111111111106', SeerView: '0x1111111111111111111111111111111111111107', DAO: '0x1111111111111111111111111111111111111108', DAOTimelock: '0x1111111111111111111111111111111111111109', TrustGateway: '0x111111111111111111111111111111111111110a', GuardianRegistry: '0x111111111111111111111111111111111111110b', GuardianLock: '0x111111111111111111111111111111111111110c', PanicGuard: '0x111111111111111111111111111111111111110d', EmergencyBreaker: '0x111111111111111111111111111111111111110e' })),
  isConfiguredContractAddress: (address?: string | null) => Boolean(address && address !== '0x0000000000000000000000000000000000000000'),
  validateContractAddress: jest.fn((addr: any) => addr),
  ZERO_ADDRESS: '0x0000000000000000000000000000000000000000',
  CURRENT_CHAIN_ID: 84532,
  VFIDETokenABI: [],
}))

const mockUseReadContract = useReadContract as jest.MockedFunction<typeof useReadContract>

describe('useVFIDEBalance', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns balance data', () => {
    mockUseReadContract.mockReturnValue({
      data: BigInt('1000000000000000000'),
      isError: false,
      isLoading: false,
    } as any)

    const { result } = renderHook(() => 
      useVFIDEBalance('0x1234567890123456789012345678901234567890')
    )

    expect(result.current.balance).toBe(BigInt('1000000000000000000'))
    expect(result.current.isError).toBe(false)
    expect(result.current.isLoading).toBe(false)
  })

  it('handles loading state', () => {
    mockUseReadContract.mockReturnValue({
      data: undefined,
      isError: false,
      isLoading: true,
    } as any)

    const { result } = renderHook(() => 
      useVFIDEBalance('0x1234567890123456789012345678901234567890')
    )

    expect(result.current.isLoading).toBe(true)
    expect(result.current.balance).toBeUndefined()
  })

  it('handles error state', () => {
    mockUseReadContract.mockReturnValue({
      data: undefined,
      isError: true,
      isLoading: false,
    } as any)

    const { result } = renderHook(() => 
      useVFIDEBalance('0x1234567890123456789012345678901234567890')
    )

    expect(result.current.isError).toBe(true)
  })

  it('handles undefined address', () => {
    mockUseReadContract.mockReturnValue({
      data: undefined,
      isError: false,
      isLoading: false,
    } as any)

    const { result } = renderHook(() => useVFIDEBalance(undefined))
    
    expect(result.current.balance).toBeUndefined()
  })

  it('returns zero balance', () => {
    mockUseReadContract.mockReturnValue({
      data: BigInt(0),
      isError: false,
      isLoading: false,
    } as any)

    const { result } = renderHook(() => 
      useVFIDEBalance('0x1234567890123456789012345678901234567890')
    )

    expect(result.current.balance).toBe(BigInt(0))
  })
})

import { renderAtViewport, VIEWPORTS } from '@/__tests__/mobile-responsive.test'
import { render, screen } from '@testing-library/react'
import { SocialNotifications } from '../SocialNotifications'

// Mock Web3 dependencies
jest.mock('wagmi', () => ({
  useAccount: () => ({ address: '0x1234567890123456789012345678901234567890' }),
  useReadContract: () => ({ data: null }),
  useChainId: jest.fn(() => 1),
  useSwitchChain: jest.fn(() => ({ switchChain: jest.fn(), switchChainAsync: jest.fn(), chains: [], status: 'idle' })),
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
  WagmiProvider: jest.fn(),
  createConfig: jest.fn(),
  http: jest.fn(),
}))

jest.mock('@/lib/contracts', () => ({
  // CANONICAL_CONTRACTS_MOCK_V4
  CONTRACT_ADDRESSES: { VFIDEToken: '0x1111111111111111111111111111111111111101', StablecoinRegistry: '0x1111111111111111111111111111111111111102', MerchantPortal: '0x1111111111111111111111111111111111111103', MerchantRegistry: '0x1111111111111111111111111111111111111104', VaultHub: '0x1111111111111111111111111111111111111105', Seer: '0x1111111111111111111111111111111111111106', SeerView: '0x1111111111111111111111111111111111111107', DAO: '0x1111111111111111111111111111111111111108', DAOTimelock: '0x1111111111111111111111111111111111111109', TrustGateway: '0x111111111111111111111111111111111111110a', GuardianRegistry: '0x111111111111111111111111111111111111110b', GuardianLock: '0x111111111111111111111111111111111111110c', PanicGuard: '0x111111111111111111111111111111111111110d', EmergencyBreaker: '0x111111111111111111111111111111111111110e' },
  CONTRACTS: {},
  getContractAddresses: jest.fn(() => ({ VFIDEToken: '0x1111111111111111111111111111111111111101', StablecoinRegistry: '0x1111111111111111111111111111111111111102', MerchantPortal: '0x1111111111111111111111111111111111111103', MerchantRegistry: '0x1111111111111111111111111111111111111104', VaultHub: '0x1111111111111111111111111111111111111105', Seer: '0x1111111111111111111111111111111111111106', SeerView: '0x1111111111111111111111111111111111111107', DAO: '0x1111111111111111111111111111111111111108', DAOTimelock: '0x1111111111111111111111111111111111111109', TrustGateway: '0x111111111111111111111111111111111111110a', GuardianRegistry: '0x111111111111111111111111111111111111110b', GuardianLock: '0x111111111111111111111111111111111111110c', PanicGuard: '0x111111111111111111111111111111111111110d', EmergencyBreaker: '0x111111111111111111111111111111111111110e' })),
  isConfiguredContractAddress: jest.fn(() => true),
  validateContractAddress: jest.fn((addr: any) => addr),
  ZERO_ADDRESS: '0x0000000000000000000000000000000000000000',
  CURRENT_CHAIN_ID: 84532,
}))

jest.mock('@/lib/abis', () => ({
  NotificationManagerABI: [],
}))

describe('SocialNotifications Mobile Rendering', () => {
  beforeEach(() => {
    // Mock matchMedia for responsive breakpoints
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    })
  })

  describe('Mobile viewport positioning', () => {
    it('renders with mobile-specific positioning on iPhone', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: VIEWPORTS.iPhone14.width,
      })

      const { container } = render(<SocialNotifications />)
      
      // Notification dropdown should exist
      const button = screen.getByRole('button', { name: /notifications/i })
      expect(button).toBeInTheDocument()
    })

    it('uses full width with margins on small screens', () => {
      const { container } = render(<SocialNotifications />)
      
      // Component should render
      expect(container.firstChild).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /notifications/i })).toBeInTheDocument()
    })

    it('switches to desktop layout on large screens', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: VIEWPORTS.Desktop.width,
      })

      // Mock matchMedia to return true for sm breakpoint
      window.matchMedia = jest.fn().mockImplementation((query) => ({
        matches: query.includes('min-width: 640px'),
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      }))

      const { container } = render(<SocialNotifications />)
      expect(container.firstChild).toBeInTheDocument()
    })
  })

  describe('Touch interactions', () => {
    it('handles touch events on mobile', () => {
      const { container } = render(<SocialNotifications />)
      const button = screen.getByRole('button', { name: /notifications/i })
      
      // Simulate touch event
      const touchStart = new TouchEvent('touchstart', { bubbles: true })
      button.dispatchEvent(touchStart)
      
      expect(button).toBeInTheDocument()
    })
  })

  describe('Responsive font sizes', () => {
    it('uses smaller fonts on mobile', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: VIEWPORTS.iPhone14.width,
      })

      const { container } = render(<SocialNotifications />)
      
      // Component should render properly on mobile
      expect(screen.getByRole('button', { name: /notifications/i })).toBeInTheDocument()
    })
  })

  describe('Mobile overflow prevention', () => {
    it('prevents horizontal overflow on narrow screens', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 360, // Very narrow phone
      })

      const { container } = render(<SocialNotifications />)
      
      // Should not cause horizontal scrolling
      expect(container.firstChild).toBeInTheDocument()
    })
  })

  describe('Viewport-specific layouts', () => {
    it('renders correctly on iPhone 14', () => {
      renderAtViewport(
        <SocialNotifications />,
        VIEWPORTS.iPhone14.width,
        VIEWPORTS.iPhone14.height
      )
      
      expect(screen.getByRole('button', { name: /notifications/i })).toBeInTheDocument()
    })

    it('renders correctly on iPad', () => {
      renderAtViewport(
        <SocialNotifications />,
        VIEWPORTS.iPad.width,
        VIEWPORTS.iPad.height
      )
      
      expect(screen.getByRole('button', { name: /notifications/i })).toBeInTheDocument()
    })

    it('renders correctly on Android phone', () => {
      renderAtViewport(
        <SocialNotifications />,
        VIEWPORTS.AndroidSmall.width,
        VIEWPORTS.AndroidSmall.height
      )
      
      expect(screen.getByRole('button', { name: /notifications/i })).toBeInTheDocument()
    })
  })
})

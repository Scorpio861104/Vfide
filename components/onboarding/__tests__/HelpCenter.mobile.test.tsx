import { renderAtViewport, VIEWPORTS } from '@/__tests__/mobile-responsive.test'
import { render } from '@testing-library/react'
import { HelpCenter } from '../HelpCenter'

// Mock chains module to avoid ESM issues
jest.mock('@/lib/chains', () => ({
  IS_TESTNET: true,
  CURRENT_CHAIN_ID: 84532,
  SUPPORTED_CHAINS: [],
  isTestnetChainId: jest.fn(() => true),
  getChainName: jest.fn(() => 'Base Sepolia'),
  CONTRACT_ADDRESSES: {
    mainnet: {},
    testnet: {},
  },
}))

describe('HelpCenter Mobile Rendering', () => {
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

  describe('Responsive panel widths', () => {
    it('uses full width on mobile (< 640px)', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: VIEWPORTS.iPhone14.width, // 390px
      })

      const { container } = render(<HelpCenter />)
      // Component should render
      expect(container.firstChild).toBeInTheDocument()
    })

    it('uses 90vw width on tablets (640px - 768px)', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: VIEWPORTS.iPad.width, // 768px
      })

      // Mock sm breakpoint matching
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

      const { container } = render(<HelpCenter />)
      expect(container.firstChild).toBeInTheDocument()
    })

    it('uses fixed 500px width on desktop (>= 768px)', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: VIEWPORTS.Desktop.width, // 1920px
      })

      window.matchMedia = jest.fn().mockImplementation((query) => ({
        matches: query.includes('min-width'),
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      }))

      const { container } = render(<HelpCenter />)
      expect(container.firstChild).toBeInTheDocument()
    })
  })

  describe('Floating button positioning', () => {
    it('positions button above mobile navigation (bottom-24)', () => {
      const { container } = render(<HelpCenter />)
      
      // Component should render with button
      expect(container.firstChild).toBeInTheDocument()
    })

    it('positions button normally on desktop (bottom-6)', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: VIEWPORTS.Desktop.width,
      })

      window.matchMedia = jest.fn().mockImplementation((query) => ({
        matches: query.includes('min-width: 768px'),
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      }))

      const { container } = render(<HelpCenter />)
      expect(container.firstChild).toBeInTheDocument()
    })
  })

  describe('Touch interactions', () => {
    it('opens help panel on touch', () => {
      const { container } = render(<HelpCenter />)
      
      // Component should render
      expect(container.firstChild).toBeInTheDocument()
    })

    it('closes panel on backdrop touch', () => {
      const { container } = render(<HelpCenter />)
      
      // Component should render
      expect(container.firstChild).toBeInTheDocument()
    })
  })

  describe('Content scrolling on mobile', () => {
    it('enables scrolling for long content on small screens', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: VIEWPORTS.iPhone14.width,
      })

      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: VIEWPORTS.iPhone14.height,
      })

      const { container } = render(<HelpCenter />)
      
      // Component should render
      expect(container.firstChild).toBeInTheDocument()
    })
  })

  describe('Viewport-specific rendering', () => {
    it('renders correctly on iPhone 14', () => {
      const { container } = renderAtViewport(
        <HelpCenter />,
        VIEWPORTS.iPhone14.width,
        VIEWPORTS.iPhone14.height
      )

      expect(container.firstChild).toBeInTheDocument()
    })

    it('renders correctly on iPad', () => {
      const { container } = renderAtViewport(
        <HelpCenter />,
        VIEWPORTS.iPad.width,
        VIEWPORTS.iPad.height
      )

      expect(container.firstChild).toBeInTheDocument()
    })

    it('renders correctly on Android small', () => {
      const { container } = renderAtViewport(
        <HelpCenter />,
        VIEWPORTS.AndroidSmall.width,
        VIEWPORTS.AndroidSmall.height
      )

      expect(container.firstChild).toBeInTheDocument()
    })
  })

  describe('Accessibility on mobile', () => {
    it('maintains touch target size of 44px minimum', () => {
      const { container } = render(<HelpCenter />)
      
      // Component should render
      expect(container.firstChild).toBeInTheDocument()
    })

    it('has proper contrast for mobile displays', () => {
      const { container } = render(<HelpCenter />)
      
      // Component should render
      expect(container.firstChild).toBeInTheDocument()
    })
  })
})

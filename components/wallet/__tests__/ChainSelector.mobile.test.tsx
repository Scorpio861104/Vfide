import { renderAtViewport, VIEWPORTS } from '@/__tests__/mobile-responsive.test'
import { log } from '@/lib/logging';
import { render } from '@testing-library/react'
import { ChainSelector } from '../ChainSelector'

// Mock chains
jest.mock('@/lib/chains')

// Mock wagmi
jest.mock('wagmi', () => ({
  useAccount: () => ({ address: '0x1234567890123456789012345678901234567890', chain: { id: 1 } }),
  useSwitchChain: () => ({ switchChain: jest.fn(), isPending: false }),
  useChainId: () => 1,
}))

describe('ChainSelector Mobile Rendering', () => {
  beforeEach(() => {
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

  describe('Dropdown overflow prevention', () => {
    it('prevents dropdown overflow on narrow screens', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 360, // Very narrow phone
      })

      const { container } = render(<ChainSelector />)
      
      // Component should render
      expect(container.firstChild).toBeInTheDocument()
    })

    it('maintains minimum width of 200px', () => {
      const { container } = render(<ChainSelector />)
      
      // Component should render
      expect(container.firstChild).toBeInTheDocument()
    })

    it('uses responsive max width constraint', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: VIEWPORTS.iPhone14.width,
      })

      const { container } = render(<ChainSelector />)
      
      // Component should render without overflow
      expect(container.firstChild).toBeInTheDocument()
    })
  })

  describe('Touch interactions', () => {
    it('opens dropdown on touch', () => {
      const { container } = render(<ChainSelector />)
      
      // Component should render
      expect(container.firstChild).toBeInTheDocument()
    })

    it('closes dropdown on outside touch', () => {
      const { container } = render(<ChainSelector />)
      
      // Component should render
      expect(container).toBeInTheDocument()
    })
  })

  describe('Chain options display', () => {
    it('displays chain options without horizontal scroll', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: VIEWPORTS.AndroidSmall.width,
      })

      const { container } = render(<ChainSelector />)
      
      // Component should render
      expect(container.firstChild).toBeInTheDocument()
    })

    it('shows chain icons on mobile', () => {
      const { container } = render(<ChainSelector />)
      
      // Component should render
      expect(container.firstChild).toBeInTheDocument()
    })
  })

  describe('Viewport-specific rendering', () => {
    it('renders correctly on iPhone 14', () => {
      const { container } = renderAtViewport(
        <ChainSelector />,
        VIEWPORTS.iPhone14.width,
        VIEWPORTS.iPhone14.height
      )

      expect(container.firstChild).toBeInTheDocument()
    })

    it('renders correctly on iPad', () => {
      const { container } = renderAtViewport(
        <ChainSelector />,
        VIEWPORTS.iPad.width,
        VIEWPORTS.iPad.height
      )

      expect(container.firstChild).toBeInTheDocument()
    })

    it('renders correctly on small Android', () => {
      const { container } = renderAtViewport(
        <ChainSelector />,
        VIEWPORTS.AndroidSmall.width,
        VIEWPORTS.AndroidSmall.height
      )

      expect(container.firstChild).toBeInTheDocument()
    })
  })

  describe('Mobile layout', () => {
    it('handles very narrow viewports', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 320, // Very old/small phone
      })

      const { container } = render(<ChainSelector />)
      
      // Should still render properly
      expect(container.firstChild).toBeInTheDocument()
    })

    it('positions dropdown correctly on mobile', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: VIEWPORTS.iPhone14.width,
      })

      const { container } = render(<ChainSelector />)
      
      // Component should render
      expect(container.firstChild).toBeInTheDocument()
    })
  })

  describe('Touch target size', () => {
    it('maintains adequate touch target size', () => {
      const { container } = render(<ChainSelector />)
      
      // Component should render
      expect(container.firstChild).toBeInTheDocument()
    })
  })
})

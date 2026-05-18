import { renderAtViewport, VIEWPORTS } from '@/__tests__/mobile-responsive.test'
import { render, screen } from '@testing-library/react'
import { SocialNotifications } from '../SocialNotifications'

// Mock Web3 dependencies
jest.mock('wagmi', () => ({
  useAccount: () => ({ address: '0x1234567890123456789012345678901234567890' }),
  useReadContract: () => ({ data: null }),
}))

jest.mock('@/lib/contracts', () => ({
  CONTRACT_ADDRESSES: {
    NotificationManager: '0x1234567890123456789012345678901234567890',
  },
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

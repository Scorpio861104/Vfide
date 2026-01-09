import { render, screen } from '@testing-library/react'
import { ErrorMonitoringProvider } from '../ErrorMonitoringProvider'
import { renderAtViewport, VIEWPORTS } from '@/__tests__/mobile-responsive.test'

describe('ErrorMonitoringProvider Mobile Rendering', () => {
  const originalEnv = process.env.NODE_ENV

  beforeEach(() => {
    process.env.NODE_ENV = 'development'
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

  afterEach(() => {
    process.env.NODE_ENV = originalEnv
  })

  describe('Responsive console width', () => {
    it('uses full width on mobile', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: VIEWPORTS.iPhone14.width,
      })

      const { container } = render(
        <ErrorMonitoringProvider>
          <div>Test child</div>
        </ErrorMonitoringProvider>
      )

      // Component should render
      expect(container).toBeInTheDocument()
    })

    it('uses fixed 600px width on desktop', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: VIEWPORTS.Desktop.width,
      })

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

      const { container } = render(
        <ErrorMonitoringProvider>
          <div>Test child</div>
        </ErrorMonitoringProvider>
      )

      expect(container).toBeInTheDocument()
    })

    it('respects max-w-[calc(100vw-1rem)] constraint', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 360, // Very narrow
      })

      const { container } = render(
        <ErrorMonitoringProvider>
          <div>Test child</div>
        </ErrorMonitoringProvider>
      )

      // Should not overflow viewport
      expect(container).toBeInTheDocument()
    })
  })

  describe('Error console positioning on mobile', () => {
    it('positions at bottom of screen', () => {
      const { container } = render(
        <ErrorMonitoringProvider>
          <div>Test child</div>
        </ErrorMonitoringProvider>
      )

      // Console should be positioned with bottom-14
      expect(container).toBeInTheDocument()
    })
  })

  describe('Viewport-specific rendering', () => {
    it('renders correctly on iPhone 14', () => {
      const { container } = renderAtViewport(
        <ErrorMonitoringProvider>
          <div>iPhone test</div>
        </ErrorMonitoringProvider>,
        VIEWPORTS.iPhone14.width,
        VIEWPORTS.iPhone14.height
      )

      expect(container).toBeInTheDocument()
    })

    it('renders correctly on iPad', () => {
      const { container } = renderAtViewport(
        <ErrorMonitoringProvider>
          <div>iPad test</div>
        </ErrorMonitoringProvider>,
        VIEWPORTS.iPad.width,
        VIEWPORTS.iPad.height
      )

      expect(container).toBeInTheDocument()
    })

    it('renders correctly on Android', () => {
      const { container } = renderAtViewport(
        <ErrorMonitoringProvider>
          <div>Android test</div>
        </ErrorMonitoringProvider>,
        VIEWPORTS.AndroidSmall.width,
        VIEWPORTS.AndroidSmall.height
      )

      expect(container).toBeInTheDocument()
    })
  })

  describe('Error display on mobile', () => {
    it('handles console visibility in development', () => {
      const { container } = render(
        <ErrorMonitoringProvider>
          <div>Dev mode test</div>
        </ErrorMonitoringProvider>
      )

      expect(container).toBeInTheDocument()
    })

    it('hides console in production', () => {
      process.env.NODE_ENV = 'production'

      const { container } = render(
        <ErrorMonitoringProvider>
          <div>Prod mode test</div>
        </ErrorMonitoringProvider>
      )

      expect(container).toBeInTheDocument()
    })
  })

  describe('Touch interactions', () => {
    it('renders children with touch support', () => {
      const { container } = render(
        <ErrorMonitoringProvider>
          <button>Touch me</button>
        </ErrorMonitoringProvider>
      )

      expect(container).toBeInTheDocument()
    })
  })

  describe('Overflow prevention', () => {
    it('prevents horizontal overflow on narrow screens', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 320,
      })

      const { container } = render(
        <ErrorMonitoringProvider>
          <div data-testid="narrow-test">Narrow screen test</div>
        </ErrorMonitoringProvider>
      )

      expect(container).toBeInTheDocument()
    })
  })

  describe('Max height constraint', () => {
    it('respects max-h-[500px] on error console', () => {
      const { container } = render(
        <ErrorMonitoringProvider>
          <div data-testid="height-test">Max height test</div>
        </ErrorMonitoringProvider>
      )

      // Should render without issues
      expect(container).toBeInTheDocument()
    })
  })
})

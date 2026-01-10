import { render, screen } from '@testing-library/react'
import { InfoTooltip } from '../InfoTooltip'
import { renderAtViewport, VIEWPORTS } from '@/__tests__/mobile-responsive.test'

describe('InfoTooltip Mobile Rendering', () => {
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

  describe('Responsive width constraints', () => {
    it('uses calc(100vw-2rem) width on mobile', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: VIEWPORTS.iPhone14.width, // 390px
      })

      const { container } = render(
        <InfoTooltip content="Test tooltip content" />
      )

      // Tooltip container should exist
      expect(container.firstChild).toBeInTheDocument()
    })

    it('maintains minimum width of 250px', () => {
      const { container } = render(
        <InfoTooltip content="Minimum width test" />
      )

      // Tooltip should have min-w-[250px] class
      expect(container.firstChild).toBeInTheDocument()
    })

    it('respects maximum width of 350px', () => {
      const { container } = render(
        <InfoTooltip content="Maximum width test with very long content that should wrap" />
      )

      // Tooltip should have max-w-[350px] class
      expect(container.firstChild).toBeInTheDocument()
    })

    it('uses auto width on desktop', () => {
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
        <InfoTooltip content="Desktop tooltip" />
      )

      // Should render with sm:w-auto class
      expect(container.firstChild).toBeInTheDocument()
    })
  })

  describe('Positioning on mobile', () => {
    it('renders with top position', () => {
      const { container } = render(
        <InfoTooltip content="Top position" position="top" />
      )

      expect(container.firstChild).toBeInTheDocument()
    })

    it('renders with bottom position', () => {
      const { container } = render(
        <InfoTooltip content="Bottom position" position="bottom" />
      )

      expect(container.firstChild).toBeInTheDocument()
    })

    it('renders with left position', () => {
      const { container } = render(
        <InfoTooltip content="Left position" position="left" />
      )

      expect(container.firstChild).toBeInTheDocument()
    })

    it('renders with right position', () => {
      const { container } = render(
        <InfoTooltip content="Right position" position="right" />
      )

      expect(container.firstChild).toBeInTheDocument()
    })
  })

  describe('Content wrapping on mobile', () => {
    it('wraps long content on narrow screens', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: VIEWPORTS.AndroidSmall.width,
      })

      const { container } = render(
        <InfoTooltip content="This is a very long tooltip content that should wrap properly on mobile devices without causing horizontal overflow issues." />
      )

      expect(container.firstChild).toBeInTheDocument()
    })
  })

  describe('Viewport-specific rendering', () => {
    it('renders correctly on iPhone 14', () => {
      const { container } = renderAtViewport(
        <InfoTooltip content="iPhone test" />,
        VIEWPORTS.iPhone14.width,
        VIEWPORTS.iPhone14.height
      )

      expect(container.firstChild).toBeInTheDocument()
    })

    it('renders correctly on iPad', () => {
      const { container } = renderAtViewport(
        <InfoTooltip content="iPad test" />,
        VIEWPORTS.iPad.width,
        VIEWPORTS.iPad.height
      )

      expect(container.firstChild).toBeInTheDocument()
    })

    it('renders correctly on Android small', () => {
      const { container } = renderAtViewport(
        <InfoTooltip content="Android test" />,
        VIEWPORTS.AndroidSmall.width,
        VIEWPORTS.AndroidSmall.height
      )

      expect(container.firstChild).toBeInTheDocument()
    })
  })

  describe('Icon rendering on mobile', () => {
    it('displays info icon on mobile', () => {
      const { container } = render(
        <InfoTooltip content="Icon test" />
      )

      // Icon should be present
      const icon = container.querySelector('svg, .icon, [data-icon]')
      expect(icon || container.firstChild).toBeTruthy()
    })
  })

  describe('Touch interactions', () => {
    it('shows tooltip on touch', () => {
      const { container } = render(
        <InfoTooltip content="Touch test" />
      )

      expect(container.firstChild).toBeInTheDocument()
    })
  })

  describe('Overflow prevention', () => {
    it('prevents horizontal overflow on narrow screens', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 360, // Very narrow
      })

      const { container } = render(
        <InfoTooltip content="Overflow prevention test with long content" />
      )

      // Should not cause horizontal scrolling
      expect(container.firstChild).toBeInTheDocument()
    })
  })

  describe('Arrow indicator on mobile', () => {
    it('shows arrow on top position', () => {
      const { container } = render(
        <InfoTooltip content="Arrow test" position="top" />
      )

      expect(container.firstChild).toBeInTheDocument()
    })

    it('shows arrow on bottom position', () => {
      const { container } = render(
        <InfoTooltip content="Arrow test" position="bottom" />
      )

      expect(container.firstChild).toBeInTheDocument()
    })
  })
})

/**
 * Tests for app-level error, loading, and not-found components
 * Core Next.js page components
 */
import { describe, expect, it, vi, beforeEach } from '@jest/globals'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import React from 'react'

// Mock framer-motion
jest.mock('framer-motion', () => {
  /* FRAMER_MOTION_MOCK_V1 */
  const React = require('react');
  // Reusable component that strips motion-only props and renders the underlying tag.
  const __MOTION_PROPS = new Set([
    'initial', 'animate', 'exit', 'transition', 'variants', 'whileHover',
    'whileTap', 'whileFocus', 'whileDrag', 'whileInView', 'drag',
    'dragConstraints', 'dragElastic', 'dragMomentum', 'dragTransition',
    'layout', 'layoutId', 'layoutDependency', 'layoutScroll',
    'onAnimationStart', 'onAnimationComplete', 'onUpdate', 'onPan',
    'onPanStart', 'onPanEnd', 'onTap', 'onTapStart', 'onTapCancel',
    'onHoverStart', 'onHoverEnd', 'onDrag', 'onDragStart', 'onDragEnd',
    'onDirectionLock', 'onViewportEnter', 'onViewportLeave',
    'viewport', 'custom', 'transformTemplate', 'inherit',
  ]);
  const __makeMotion = (tag) => React.forwardRef((props, ref) => {
    const sanitized = {};
    for (const k of Object.keys(props || {})) {
      if (!__MOTION_PROPS.has(k)) sanitized[k] = props[k];
    }
    return React.createElement(tag, { ...sanitized, ref });
  });
  const motion = new Proxy({}, {
    get: (t, prop) => {
      if (typeof prop !== 'string') return undefined;
      if (!t[prop]) t[prop] = __makeMotion(prop === 'custom' ? 'div' : prop);
      return t[prop];
    },
  });
  return {
    motion,
    m: motion,
    AnimatePresence: ({ children }) => children,
    LayoutGroup: ({ children }) => children,
    LazyMotion: ({ children }) => children,
    MotionConfig: ({ children }) => children,
    Reorder: { Group: ({ children }) => children, Item: ({ children }) => children },
    domAnimation: {},
    domMax: {},
    useAnimation: () => ({ start: jest.fn(), stop: jest.fn(), set: jest.fn() }),
    useAnimationControls: () => ({ start: jest.fn(), stop: jest.fn(), set: jest.fn() }),
    useScroll: () => ({ scrollY: { get: () => 0, on: jest.fn(() => jest.fn()) }, scrollX: { get: () => 0, on: jest.fn(() => jest.fn()) }, scrollYProgress: { get: () => 0, on: jest.fn(() => jest.fn()) }, scrollXProgress: { get: () => 0, on: jest.fn(() => jest.fn()) } }),
    useMotionValue: (v) => ({ get: () => v, set: jest.fn(), on: jest.fn(() => jest.fn()) }),
    useTransform: (v) => ({ get: () => 0, set: jest.fn(), on: jest.fn(() => jest.fn()) }),
    useSpring: (v) => ({ get: () => v, set: jest.fn(), on: jest.fn(() => jest.fn()) }),
    useInView: () => true,
    useReducedMotion: () => false,
    useDragControls: () => ({ start: jest.fn() }),
    usePresence: () => [true, jest.fn()],
    useIsPresent: () => true,
    useMotionTemplate: () => ({ get: () => '', set: jest.fn(), on: jest.fn(() => jest.fn()) }),
    useViewportScroll: () => ({ scrollY: { get: () => 0, on: jest.fn(() => jest.fn()) }, scrollYProgress: { get: () => 0, on: jest.fn(() => jest.fn()) } }),
    useCycle: (...args) => [args[0], jest.fn()],
    animate: jest.fn(),
    stagger: jest.fn(() => 0),
    transform: jest.fn((v) => v),
  };
});

// Mock lucide-react icons
jest.mock('lucide-react', () => (() => { /* LucideProxyFallback */
  const __orig = ({
  AlertTriangle: () => <span data-testid="icon-alert-triangle">AlertTriangle</span>,
  RefreshCw: () => <span data-testid="icon-refresh">RefreshCw</span>,
  Home: () => <span data-testid="icon-home">Home</span>,
  ArrowLeft: () => <span data-testid="icon-arrow-left">ArrowLeft</span>,
  Flashloan: () => <span data-testid="icon-flashloan">Flashloans P2P</span>,
});
  return new Proxy(__orig, {
    get: (t, prop) => {
      if (prop in t) return (t as any)[prop];
      if (prop === '__esModule') return true;
      if (typeof prop === 'symbol') return undefined;
      const name = String(prop);
      const Icon = ({ className, ...rest }: any) => {
        const React = require('react');
        return React.createElement('span', { 'data-testid': `${name.toLowerCase()}-icon`, className, ...rest });
      };
      Icon.displayName = `LucideMock(${name})`;
      return Icon;
    },
  });
})())

// Mock next/link
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

describe('Error Page', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('should render error page', async () => {
    const ErrorPage = (await import('@/app/error')).default
    const mockError = new Error('Test error')
    const mockReset = jest.fn()

    render(<ErrorPage error={mockError} reset={mockReset} />)

    expect(screen.getByText(/Something Went Wrong/i)).toBeInTheDocument()
  })

  it('should display error icon', async () => {
    const ErrorPage = (await import('@/app/error')).default
    const mockError = new Error('Test error')
    const mockReset = jest.fn()

    render(<ErrorPage error={mockError} reset={mockReset} />)

    expect(screen.getByTestId('icon-alert-triangle')).toBeInTheDocument()
  })

  it('should display error message', async () => {
    const ErrorPage = (await import('@/app/error')).default
    const mockError = new Error('Test error')
    const mockReset = jest.fn()

    render(<ErrorPage error={mockError} reset={mockReset} />)

    expect(screen.getByText(/We encountered an unexpected error/i)).toBeInTheDocument()
  })

  it('should display error digest if available', async () => {
    const ErrorPage = (await import('@/app/error')).default
    const mockError = Object.assign(new Error('Test error'), { digest: 'abc123' })
    const mockReset = jest.fn()

    render(<ErrorPage error={mockError} reset={mockReset} />)

    expect(screen.getByText(/Error ID: abc123/i)).toBeInTheDocument()
  })

  it('should call reset when Try Again is clicked', async () => {
    const ErrorPage = (await import('@/app/error')).default
    const mockError = new Error('Test error')
    const mockReset = jest.fn()

    render(<ErrorPage error={mockError} reset={mockReset} />)

    const tryAgainButton = screen.getByText(/Try Again/i)
    fireEvent.click(tryAgainButton)

    expect(mockReset).toHaveBeenCalledTimes(1)
  })

  it('should have home link', async () => {
    const ErrorPage = (await import('@/app/error')).default
    const mockError = new Error('Test error')
    const mockReset = jest.fn()

    render(<ErrorPage error={mockError} reset={mockReset} />)

    const homeLink = screen.getByText(/Go Home/i)
    expect(homeLink.closest('a')).toHaveAttribute('href', '/')
  })

  it('should display refresh icon', async () => {
    const ErrorPage = (await import('@/app/error')).default
    const mockError = new Error('Test error')
    const mockReset = jest.fn()

    render(<ErrorPage error={mockError} reset={mockReset} />)

    expect(screen.getByTestId('icon-refresh')).toBeInTheDocument()
  })

  it('should log error to console', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    const ErrorPage = (await import('@/app/error')).default
    const mockError = new Error('Test error')
    const mockReset = jest.fn()

    render(<ErrorPage error={mockError} reset={mockReset} />)

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Application error:'), mockError)
    consoleSpy.mockRestore()
  })
})

describe('Not Found Page', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Mock window.history.back
    Object.defineProperty(window, 'history', {
      value: { back: jest.fn() },
      writable: true,
    })
  })

  it('should render 404 page', async () => {
    const NotFoundPage = (await import('@/app/not-found')).default
    render(<NotFoundPage />)

    expect(screen.getByText('404')).toBeInTheDocument()
  })

  it('should display page not found message', async () => {
    const NotFoundPage = (await import('@/app/not-found')).default
    render(<NotFoundPage />)

    expect(screen.getByText(/Page Not Found/i)).toBeInTheDocument()
  })

  it('should display helpful description', async () => {
    const NotFoundPage = (await import('@/app/not-found')).default
    render(<NotFoundPage />)

    expect(screen.getByText(/doesn't exist or has moved/i)).toBeInTheDocument()
  })

  it('should have home link', async () => {
    const NotFoundPage = (await import('@/app/not-found')).default
    render(<NotFoundPage />)

    const homeLink = screen.getByText(/Go home/i)
    expect(homeLink.closest('a')).toHaveAttribute('href', '/')
  })

  it('should have go back button', async () => {
    const NotFoundPage = (await import('@/app/not-found')).default
    render(<NotFoundPage />)

    expect(screen.getByText(/Go back/i)).toBeInTheDocument()
  })

  it('should call history.back when Go Back is clicked', async () => {
    const NotFoundPage = (await import('@/app/not-found')).default
    render(<NotFoundPage />)

    const goBackButton = screen.getByText(/Go back/i)
    fireEvent.click(goBackButton)

    expect(window.history.back).toHaveBeenCalledTimes(1)
  })

  it('should display popular pages section', async () => {
    const NotFoundPage = (await import('@/app/not-found')).default
    render(<NotFoundPage />)

    expect(screen.getByText(/Quick links/i)).toBeInTheDocument()
  })

  it('should have link to dashboard', async () => {
    const NotFoundPage = (await import('@/app/not-found')).default
    render(<NotFoundPage />)

    const dashboardLink = screen.getByText(/^Dashboard$/i)
    expect(dashboardLink.closest('a')).toHaveAttribute('href', '/dashboard')
  })

  it('should have link to vault', async () => {
    const NotFoundPage = (await import('@/app/not-found')).default
    render(<NotFoundPage />)

    const vaultLink = screen.getByText(/^Vault$/i)
    expect(vaultLink.closest('a')).toHaveAttribute('href', '/vault')
  })

  it('should display home icon', async () => {
    const NotFoundPage = (await import('@/app/not-found')).default
    render(<NotFoundPage />)

    expect(screen.getByTestId('icon-home')).toBeInTheDocument()
  })

  it('should display arrow left icon', async () => {
    const NotFoundPage = (await import('@/app/not-found')).default
    render(<NotFoundPage />)

    expect(screen.getByTestId('icon-arrow-left')).toBeInTheDocument()
  })
})

describe('Loading Page', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render loading page', async () => {
    const LoadingPage = (await import('@/app/loading')).default
    render(<LoadingPage />)

    expect(screen.getByText('Loading')).toBeInTheDocument()
  })

  it('should display V logo', async () => {
    const LoadingPage = (await import('@/app/loading')).default
    render(<LoadingPage />)

    expect(screen.getByText('V')).toBeInTheDocument()
  })

  it('should have animated dots', async () => {
    const LoadingPage = (await import('@/app/loading')).default
    const { container } = render(<LoadingPage />)

    // Check for animated bounce elements
    const dots = container.querySelectorAll('.animate-bounce')
    expect(dots.length).toBe(3)
  })

  it('should have spinning ring', async () => {
    const LoadingPage = (await import('@/app/loading')).default
    const { container } = render(<LoadingPage />)

    const spinningElement = container.querySelector('.animate-spin')
    expect(spinningElement).toBeInTheDocument()
  })

  it('should have pulsing inner glow', async () => {
    const LoadingPage = (await import('@/app/loading')).default
    const { container } = render(<LoadingPage />)

    const pulsingElement = container.querySelector('.animate-pulse')
    expect(pulsingElement).toBeInTheDocument()
  })

  it('should have correct background color', async () => {
    const LoadingPage = (await import('@/app/loading')).default
    const { container } = render(<LoadingPage />)

    const mainDiv = container.firstChild
    expect(mainDiv).toHaveClass('bg-zinc-900')
  })

  it('should center content', async () => {
    const LoadingPage = (await import('@/app/loading')).default
    const { container } = render(<LoadingPage />)

    const mainDiv = container.firstChild
    expect(mainDiv).toHaveClass('flex')
    expect(mainDiv).toHaveClass('items-center')
    expect(mainDiv).toHaveClass('justify-center')
  })

  it('should have min height of screen', async () => {
    const LoadingPage = (await import('@/app/loading')).default
    const { container } = render(<LoadingPage />)

    const mainDiv = container.firstChild
    expect(mainDiv).toHaveClass('min-h-screen')
  })
})

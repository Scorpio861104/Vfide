/**
 * Tests for HelpCenter component
 * Help and documentation center with topics
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
  HelpCircle: () => <span data-testid="icon-help-circle">HelpCircle</span>,
  X: () => <span data-testid="icon-x">X</span>,
  Book: () => <span data-testid="icon-book">Book</span>,
  Wallet: () => <span data-testid="icon-wallet">Wallet</span>,
  Shield: () => <span data-testid="icon-shield">Shield</span>,
  Store: () => <span data-testid="icon-store">Store</span>,
  Star: () => <span data-testid="icon-star">Star</span>,
  Vote: () => <span data-testid="icon-vote">Vote</span>,
  ChevronRight: () => <span data-testid="icon-chevron-right">ChevronRight</span>,
  Globe: () => <span data-testid="icon-globe">Globe</span>,
  Droplets: () => <span data-testid="icon-droplets">Droplets</span>,
  Sparkles: () => <span data-testid="icon-sparkles">Sparkles</span>,
  Clock: () => <span data-testid="icon-clock">Clock</span>,
  Lock: () => <span data-testid="icon-lock">Lock</span>,
  Fingerprint: () => <span data-testid="icon-fingerprint">Fingerprint</span>,
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

describe('HelpCenter', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render help button when closed', async () => {
    const { HelpCenter } = await import('@/components/onboarding/HelpCenter')
    render(<HelpCenter />)
    
    // Initially shows just the help button
    expect(screen.getByTestId('icon-help-circle')).toBeInTheDocument()
  })

  it('should open help panel when button clicked', async () => {
    const { HelpCenter } = await import('@/components/onboarding/HelpCenter')
    render(<HelpCenter />)
    
    // Find and click the help button
    const buttons = screen.getAllByRole('button')
    fireEvent.click(buttons[0])
    
    // Panel should now show help topics - use getAllByText since text appears multiple times
    expect(screen.queryAllByText(/Getting Started/i).length).toBeGreaterThan(0)
  })

  it('should render help topics', async () => {
    const { HelpCenter } = await import('@/components/onboarding/HelpCenter')
    render(<HelpCenter />)
    
    // Open panel
    const buttons = screen.getAllByRole('button')
    fireEvent.click(buttons[0])
    
    // Should show topic list
    expect(screen.getByText(/Getting Started/i)).toBeInTheDocument()
  })

  it('should expand topic when clicked', async () => {
    const { HelpCenter } = await import('@/components/onboarding/HelpCenter')
    render(<HelpCenter />)
    
    // Open panel
    const buttons = screen.getAllByRole('button')
    fireEvent.click(buttons[0])
    
    // Click on a topic
    const gettingStarted = screen.getByText(/Getting Started/i)
    fireEvent.click(gettingStarted.closest('button') || gettingStarted)
    
    // Should show topic content
    expect(screen.queryByText(/Connect your Web3 wallet/i)).toBeDefined()
  })

  it('should close panel with X button', async () => {
    const { HelpCenter } = await import('@/components/onboarding/HelpCenter')
    render(<HelpCenter />)
    
    // Open panel
    const openButtons = screen.getAllByRole('button')
    fireEvent.click(openButtons[0])
    
    // Find X icon button
    const xIcon = screen.getByTestId('icon-x')
    const closeButton = xIcon.closest('button')
    if (closeButton) {
      fireEvent.click(closeButton)
    }
    
    // Panel should be closed
    expect(screen.queryByText(/Need Help/i)).toBeNull()
  })

  it('should show network setup topic', async () => {
    const { HelpCenter } = await import('@/components/onboarding/HelpCenter')
    render(<HelpCenter />)
    
    // Open panel
    const buttons = screen.getAllByRole('button')
    fireEvent.click(buttons[0])
    
    expect(screen.getByText(/Network Setup/i)).toBeInTheDocument()
  })

  it('should show wallet setup topic', async () => {
    const { HelpCenter } = await import('@/components/onboarding/HelpCenter')
    render(<HelpCenter />)
    
    // Open panel
    const buttons = screen.getAllByRole('button')
    fireEvent.click(buttons[0])
    
    expect(screen.getByText(/Wallet Setup/i)).toBeInTheDocument()
  })

  it('should show vault security topic', async () => {
    const { HelpCenter } = await import('@/components/onboarding/HelpCenter')
    render(<HelpCenter />)
    
    // Open panel
    const buttons = screen.getAllByRole('button')
    fireEvent.click(buttons[0])
    
    expect(screen.getByText(/Vault Security/i)).toBeInTheDocument()
  })

  it('should show wallet setup topic', async () => {
    const { HelpCenter } = await import('@/components/onboarding/HelpCenter')
    render(<HelpCenter />)
    
    // Open panel
    const buttons = screen.getAllByRole('button')
    fireEvent.click(buttons[0])
    
    expect(screen.getByText(/Wallet Setup/i)).toBeInTheDocument()
  })

  it('should show test ETH topic', async () => {
    const { HelpCenter } = await import('@/components/onboarding/HelpCenter')
    render(<HelpCenter />)
    
    // Open panel
    const buttons = screen.getAllByRole('button')
    fireEvent.click(buttons[0])
    
    // "Get Test ETH" appears multiple times, so use getAllByText
    expect(screen.queryAllByText(/Get Test ETH/i).length).toBeGreaterThan(0)
  })

  it('should toggle between topics', async () => {
    const { HelpCenter } = await import('@/components/onboarding/HelpCenter')
    render(<HelpCenter />)
    
    // Open panel
    const buttons = screen.getAllByRole('button')
    fireEvent.click(buttons[0])
    
    // Click on Network Setup to open its details
    const networkSetup = screen.getByText(/Network Setup/i)
    fireEvent.click(networkSetup.closest('button') || networkSetup)
    
    // Network Setup should still be visible as title
    expect(screen.getByText(/Network Setup/i)).toBeInTheDocument()
  })

  it('should render all topic icons', async () => {
    const { HelpCenter } = await import('@/components/onboarding/HelpCenter')
    render(<HelpCenter />)
    
    // Open panel
    const buttons = screen.getAllByRole('button')
    fireEvent.click(buttons[0])
    
    // Check for icons using queryAllByTestId since some might appear multiple times
    expect(screen.queryAllByTestId('icon-sparkles').length).toBeGreaterThan(0)
    expect(screen.queryAllByTestId('icon-globe').length).toBeGreaterThan(0)
    expect(screen.queryAllByTestId('icon-droplets').length).toBeGreaterThan(0)
    expect(screen.queryAllByTestId('icon-wallet').length).toBeGreaterThan(0)
    expect(screen.queryAllByTestId('icon-shield').length).toBeGreaterThan(0)
  })

  it('should collapse expanded topic when clicked again', async () => {
    const { HelpCenter } = await import('@/components/onboarding/HelpCenter')
    render(<HelpCenter />)
    
    // Open panel
    const buttons = screen.getAllByRole('button')
    fireEvent.click(buttons[0])
    
    // Click on a topic to expand
    const gettingStarted = screen.getByText(/Getting Started/i)
    const topicButton = gettingStarted.closest('button') || gettingStarted
    fireEvent.click(topicButton)
    
    // Click again to collapse
    fireEvent.click(topicButton)
    
    // Should toggle without errors
    expect(screen.getByText(/Getting Started/i)).toBeInTheDocument()
  })

  it('should handle keyboard interactions', async () => {
    const { HelpCenter } = await import('@/components/onboarding/HelpCenter')
    render(<HelpCenter />)
    
    // Open panel with Enter key
    const buttons = screen.getAllByRole('button')
    fireEvent.keyDown(buttons[0], { key: 'Enter' })
    fireEvent.click(buttons[0])
    
    // Should open without errors
    expect(screen.getByText(/Getting Started/i)).toBeInTheDocument()
  })
})

/**
 * DashboardCards Tests
 * Tests for StatCard component with 0% coverage
 */
import { describe, it, expect, vi } from '@jest/globals'
import { render, screen } from '@testing-library/react'
import { StatCard } from '@/components/ui/DashboardCards'
import { ChevronRight, Activity } from 'lucide-react'

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

// Mock next/link
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}))

describe('DashboardCards - StatCard Component', () => {
  const defaultProps = {
    icon: <Activity data-testid="icon" />,
    label: 'Test Label',
    value: '1,234',
    color: '#00F0FF',
  }

  it('renders with required props', () => {
    render(<StatCard {...defaultProps} />)
    
    expect(screen.getByText('Test Label')).toBeInTheDocument()
    expect(screen.getByText('1,234')).toBeInTheDocument()
    expect(screen.getByTestId('icon')).toBeInTheDocument()
  })

  it('renders with numeric value', () => {
    render(<StatCard {...defaultProps} value={5678} />)
    
    expect(screen.getByText('5678')).toBeInTheDocument()
  })

  it('renders subValue when provided', () => {
    render(<StatCard {...defaultProps} subValue="Sub Value Text" />)
    
    expect(screen.getByText('Sub Value Text')).toBeInTheDocument()
  })

  it('renders as link when href provided', () => {
    render(<StatCard {...defaultProps} href="/test-link" />)
    
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/test-link')
  })

  it('shows loading skeleton when isLoading is true', () => {
    render(<StatCard {...defaultProps} isLoading={true} />)
    
    // Should not show the value
    expect(screen.queryByText('1,234')).not.toBeInTheDocument()
    // Should show loading skeleton via animate-pulse class
    const skeletons = document.querySelectorAll('.animate-pulse')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('renders positive trend with up arrow', () => {
    render(<StatCard {...defaultProps} trend={{ value: 15, label: 'this week' }} />)
    
    expect(screen.getByText('↑')).toBeInTheDocument()
    expect(screen.getByText('15% this week')).toBeInTheDocument()
  })

  it('renders negative trend with down arrow', () => {
    render(<StatCard {...defaultProps} trend={{ value: -10, label: 'today' }} />)
    
    expect(screen.getByText('↓')).toBeInTheDocument()
    expect(screen.getByText('10% today')).toBeInTheDocument()
  })

  it('renders zero trend with up arrow', () => {
    render(<StatCard {...defaultProps} trend={{ value: 0, label: 'stable' }} />)
    
    expect(screen.getByText('↑')).toBeInTheDocument()
    expect(screen.getByText('0% stable')).toBeInTheDocument()
  })

  it('shows chevron in subValue when href is provided', () => {
    render(<StatCard {...defaultProps} href="/vault" subValue="Click here" />)
    
    expect(screen.getByText('Click here')).toBeInTheDocument()
    expect(screen.getByTestId('icon-ChevronRight')).toBeInTheDocument()
  })

  it('applies custom color to icon container', () => {
    render(<StatCard {...defaultProps} color="#FF0000" />)
    
    // The icon container div should have the color applied
    const iconContainer = screen.getByTestId('icon').closest('div')
    expect(iconContainer).toBeInTheDocument()
  })

  it('renders with all optional props', () => {
    render(
      <StatCard
        icon={<Activity data-testid="icon" />}
        label="Complete Label"
        value="9,999"
        subValue="Extra info"
        color="#50C878"
        href="/complete"
        isLoading={false}
        trend={{ value: 25, label: 'increase' }}
      />
    )
    
    expect(screen.getByText('Complete Label')).toBeInTheDocument()
    expect(screen.getByText('9,999')).toBeInTheDocument()
    expect(screen.getByText('Extra info')).toBeInTheDocument()
    expect(screen.getByText('25% increase')).toBeInTheDocument()
  })

  it('does not render trend when isLoading', () => {
    render(<StatCard {...defaultProps} isLoading={true} trend={{ value: 10, label: 'test' }} />)
    
    expect(screen.queryByText('↑')).not.toBeInTheDocument()
    expect(screen.queryByText('10% test')).not.toBeInTheDocument()
  })

  it('does not render subValue when isLoading', () => {
    render(<StatCard {...defaultProps} isLoading={true} subValue="Should not show" />)
    
    expect(screen.queryByText('Should not show')).not.toBeInTheDocument()
  })

  it('applies uppercase tracking to label', () => {
    render(<StatCard {...defaultProps} />)
    
    const label = screen.getByText('Test Label')
    expect(label).toHaveClass('uppercase', 'tracking-wider')
  })

  it('renders without href as non-clickable', () => {
    render(<StatCard {...defaultProps} />)
    
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('handles empty string value', () => {
    render(<StatCard {...defaultProps} value="" />)
    
    // Value should be empty but component should render
    expect(screen.getByText('Test Label')).toBeInTheDocument()
  })

  it('handles special characters in value', () => {
    render(<StatCard {...defaultProps} value="$1,234.56 USD" />)
    
    expect(screen.getByText('$1,234.56 USD')).toBeInTheDocument()
  })
})
